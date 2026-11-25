-- Short one-time links for emailed confirmation and password-reset steps.
-- The email carries only a random code. The real Supabase token stays here, server-side.
create table auth_links (
  code text primary key,
  token_hash text not null,
  type text not null check (type in ('signup', 'magiclink', 'recovery')),
  next text not null default '/app',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on auth_links (expires_at);
alter table auth_links enable row level security;
-- No policies: only the server (service role) can read or write.
