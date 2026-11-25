-- Stored scan results per brand. Written only by the server (service role); members can read.
create table brand_scans (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  score smallint check (score between 0 and 100),
  coverage smallint not null check (coverage between 0 and 100),
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index on brand_scans (brand_id, created_at desc);
create index on brand_scans (organization_id);

alter table brand_scans enable row level security;
create policy brand_scans_select on brand_scans for select using (is_org_member(organization_id));
-- No insert/update/delete policies: service role only.
