-- Issue tracking, alerts and reports. Written only by the server (service role); members can read.

alter table profiles add column alert_emails boolean not null default true;
alter table brand_scans add column source text not null default 'manual' check (source in ('manual', 'scheduled'));

create table issues (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  check_id text not null,
  category text not null,
  title text not null,
  severity text not null check (severity in ('critical', 'warning')),
  url text not null default '',
  detail text,
  recommendation text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  times_opened integer not null default 1,
  last_alerted_at timestamptz,
  unique (brand_id, check_id, url)
);
create index on issues (brand_id, status);
create index on issues (organization_id, first_detected_at desc);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  issue_id uuid not null references issues(id) on delete cascade,
  severity text not null,
  notification_status text not null check (notification_status in ('sent', 'failed', 'skipped')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on alerts (organization_id, created_at desc);

create table reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  kind text not null check (kind in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (brand_id, kind, period_start)
);
create index on reports (organization_id, created_at desc);

alter table issues enable row level security;
alter table alerts enable row level security;
alter table reports enable row level security;
create policy issues_select on issues for select using (is_org_member(organization_id));
create policy alerts_select on alerts for select using (is_org_member(organization_id));
create policy reports_select on reports for select using (is_org_member(organization_id));
-- No insert/update/delete policies: service role only.
