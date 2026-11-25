-- Profiles (first/last name, work or personal), one free trial licence per user,
-- in-app notifications and an email event log for de-duplication.

create type account_type as enum ('work', 'personal');
create type licence_kind as enum ('paid', 'trial');

-- ------------------------------------------------------------ profiles
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  account_type account_type not null,
  company_name text check (company_name is null or char_length(company_name) between 1 and 120),
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  constraint work_needs_company check (account_type <> 'work' or company_name is not null)
);
alter table profiles enable row level security;
create policy profiles_select on profiles for select using (user_id = auth.uid());
create policy profiles_update on profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Inserts happen on the server (service role) at signup.

-- ------------------------------------------------------- trial licences
alter table brand_licenses alter column subscription_id drop not null;
alter table brand_licenses
  add column kind licence_kind not null default 'paid',
  add column expires_at timestamptz,
  add column granted_to uuid references auth.users(id) on delete set null;

alter table brand_licenses add constraint licence_shape check (
  (kind = 'trial' and subscription_id is null and expires_at is not null and granted_to is not null)
  or (kind = 'paid' and subscription_id is not null)
);
-- One free trial licence per person, ever.
create unique index one_trial_per_user on brand_licenses (granted_to) where kind = 'trial';

-- A website can only ever start one free trial, whoever signs up.
create table trial_domains (
  domain text primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table trial_domains enable row level security;
-- No policies: server only.

-- Is this licence usable right now?
create or replace function licence_is_valid(l brand_licenses)
returns boolean language sql stable as $$
  select l.status = 'active' and (
    (l.kind = 'trial' and l.expires_at > now())
    or (l.kind = 'paid' and exists (
      select 1 from subscriptions s
      where s.id = l.subscription_id and s.status = 'active' and (s.expiry_date is null or s.expiry_date > now())
    ))
  );
$$;

-- Grants the one free trial licence (14 days). Returns false if this person already had one.
create or replace function grant_trial(org uuid, person uuid, days int default 14)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into brand_licenses (organization_id, kind, expires_at, granted_to)
  values (org, 'trial', now() + make_interval(days => days), person);
  return true;
exception when unique_violation then
  return false;
end $$;

-- Paid licences first, then the trial licence. Trial licences lock the website to one trial.
create or replace function claim_licence_for_brand()
returns trigger language plpgsql security definer set search_path = public as $$
declare lic brand_licenses%rowtype; claimed int;
begin
  select l.* into lic
  from brand_licenses l
  where l.organization_id = new.organization_id
    and l.brand_id is null
    and licence_is_valid(l)
  order by (l.kind = 'trial'), l.expires_at nulls last
  limit 1
  for update skip locked;

  if lic.id is null then
    raise exception 'no_free_licence: add a brand licence to monitor another brand' using errcode = 'P0001';
  end if;

  if lic.kind = 'trial' then
    insert into trial_domains (domain, organization_id) values (new.domain, new.organization_id)
    on conflict (domain) do nothing;
    get diagnostics claimed = row_count;
    if claimed = 0 and not exists (select 1 from trial_domains where domain = new.domain and organization_id = new.organization_id) then
      raise exception 'trial_domain_used: this website has already had a free trial' using errcode = 'P0001';
    end if;
  end if;

  update brand_licenses set brand_id = new.id where id = lic.id;
  return new;
end $$;

-- After new paid licences appear, attach them to brands that have no valid licence (e.g. trial ended).
create or replace function assign_free_licences(org uuid)
returns int language plpgsql security definer set search_path = public as $$
declare b record; lic brand_licenses%rowtype; n int := 0;
begin
  for b in
    select br.id from brands br
    where br.organization_id = org
      and not exists (select 1 from brand_licenses l where l.brand_id = br.id and licence_is_valid(l))
    order by br.created_at
  loop
    select l.* into lic from brand_licenses l
    where l.organization_id = org and l.brand_id is null and l.kind = 'paid' and licence_is_valid(l)
    limit 1 for update skip locked;
    exit when lic.id is null;
    -- release any dead licence still pointing at this brand (brand_id is unique)
    update brand_licenses set brand_id = null where brand_id = b.id;
    update brand_licenses set brand_id = b.id where id = lic.id;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function brand_has_valid_licence(brand uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from brand_licenses l where l.brand_id = brand and licence_is_valid(l));
$$;

-- ------------------------------------------------------- notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);
alter table notifications enable row level security;
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on notifications for delete using (user_id = auth.uid());

-- Dedupe log so scheduled emails are sent once per (person, kind, reference).
create table email_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  ref text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table email_events enable row level security;
-- No policies: server only.
