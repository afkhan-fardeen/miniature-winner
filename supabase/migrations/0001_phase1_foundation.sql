-- Klyroo Phase 1: organisations, brands, subscriptions, brand licences.
-- Every customer-owned table is tenant-isolated with row level security.
-- Writes to billing tables happen only with the service role (webhooks).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- types
create type member_role as enum ('owner', 'admin', 'member');
create type verification_status as enum ('pending', 'verified', 'failed');
create type subscription_status as enum ('pending', 'active', 'past_due', 'canceled', 'expired');
create type licence_status as enum ('active', 'revoked', 'expired');

-- ---------------------------------------------------------------- tables
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on organization_members (user_id);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  billing_provider text not null default 'polar',
  provider_subscription_id text unique,
  provider_customer_id text,
  duration_months smallint not null check (duration_months in (1, 3, 6, 12)),
  quantity integer not null check (quantity between 1 and 1000),
  -- Price contract: what the customer actually bought, in pence, per brand for the whole term.
  price_mode text not null check (price_mode in ('launch', 'standard')),
  price_per_brand integer not null check (price_per_brand > 0),
  -- Price the next renewal will charge, disclosed at checkout. Never silently changed.
  renewal_price_per_brand integer not null check (renewal_price_per_brand > 0),
  total_amount integer not null check (total_amount > 0),
  currency text not null default 'GBP',
  start_date timestamptz,
  expiry_date timestamptz,
  renewal_status text not null default 'auto' check (renewal_status in ('auto', 'canceled')),
  status subscription_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index on subscriptions (organization_id);

create table brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_name text not null check (char_length(brand_name) between 1 and 120),
  website_url text not null,
  domain text not null,
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  verification_status verification_status not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, domain)
);
create index on brands (organization_id);

-- One row per purchased brand slot. brand_id is null while the slot is unused.
create table brand_licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  brand_id uuid unique references brands(id) on delete set null,
  status licence_status not null default 'active',
  activated_at timestamptz not null default now()
);
create index on brand_licenses (organization_id, status);

create table audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (organization_id, created_at desc);

-- ---------------------------------------------------------------- helpers
create or replace function is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where organization_id = org and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- Creating an organisation makes the caller its owner, atomically.
create or replace function create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into organizations (name) values (org_name) returning id into new_id;
  insert into organization_members (organization_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into audit_log (organization_id, actor_id, action) values (new_id, auth.uid(), 'organization.created');
  return new_id;
end $$;

-- ------------------------------------------------- licence enforcement
-- Adding a brand claims a free active licence. No free licence, no brand.
create or replace function claim_licence_for_brand()
returns trigger language plpgsql security definer set search_path = public as $$
declare lic uuid;
begin
  select l.id into lic
  from brand_licenses l
  join subscriptions s on s.id = l.subscription_id
  where l.organization_id = new.organization_id
    and l.status = 'active'
    and l.brand_id is null
    and s.status = 'active'
    and (s.expiry_date is null or s.expiry_date > now())
  order by s.expiry_date nulls last
  limit 1
  for update of l skip locked;

  if lic is null then
    raise exception 'no_free_licence: purchase another brand licence to add this brand'
      using errcode = 'P0001';
  end if;
  update brand_licenses set brand_id = new.id where id = lic;
  return new;
end $$;

-- Row must exist before the licence can reference it, so run after insert.
create trigger brands_claim_licence
  after insert on brands
  for each row execute function claim_licence_for_brand();

-- Deleting a brand frees its licence (the FK sets brand_id null).
-- "Replace a brand" = delete + add, keeping the same licence count.

-- ---------------------------------------------------------------- RLS
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table subscriptions enable row level security;
alter table brands enable row level security;
alter table brand_licenses enable row level security;
alter table audit_log enable row level security;

create policy org_select on organizations for select using (is_org_member(id));
create policy org_update on organizations for update using (is_org_admin(id)) with check (is_org_admin(id));

create policy members_select on organization_members for select using (is_org_member(organization_id));
create policy members_admin_write on organization_members for all
  using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));

create policy subs_select on subscriptions for select using (is_org_member(organization_id));
create policy licences_select on brand_licenses for select using (is_org_member(organization_id));
-- No insert/update/delete policies on subscriptions or brand_licenses: service role only.

create policy brands_select on brands for select using (is_org_member(organization_id));
create policy brands_insert on brands for insert with check (is_org_admin(organization_id));
create policy brands_update on brands for update
  using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
create policy brands_delete on brands for delete using (is_org_admin(organization_id));

create policy audit_select on audit_log for select using (is_org_admin(organization_id));

-- Members must not be able to forge verification state from the client.
create or replace function protect_brand_verification()
returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' and (
       new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.verification_token is distinct from old.verification_token
    or new.organization_id is distinct from old.organization_id
  ) then
    raise exception 'verification fields are managed by the server';
  end if;
  return new;
end $$;
create trigger brands_protect_verification before update on brands
  for each row execute function protect_brand_verification();

-- Prevent removing the last owner.
create or replace function keep_one_owner()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    if exists (select 1 from organizations where id = old.organization_id)
       and not exists (
      select 1 from organization_members
      where organization_id = old.organization_id and role = 'owner' and id <> old.id
    ) then
      raise exception 'an organisation must keep at least one owner';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger members_keep_owner before update or delete on organization_members
  for each row execute function keep_one_owner();
