// Applies supabase/migrations/*.sql in order. Usage: npm run db:migrate
// Reads DATABASE_URL from .env.local (never printed). Refuses to touch a database
// that looks like the old Klyroo app's (has an "accounts" table).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
if (!env.DATABASE_URL) throw new Error("DATABASE_URL missing in .env.local");

const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const old = await client.query("select to_regclass('public.accounts') as t");
  if (old.rows[0].t) throw new Error("Found an 'accounts' table: this looks like the OLD Klyroo database. Use a fresh Supabase project.");
  await client.query("create table if not exists public._klyroo_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from public._klyroo_migrations")).rows.map((r) => r.name));
  for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(f)) { console.log("skip   ", f); continue; }
    await client.query("begin");
    try {
      await client.query(readFileSync(join("supabase/migrations", f), "utf8"));
      await client.query("insert into public._klyroo_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log("applied", f);
    } catch (e) { await client.query("rollback"); throw e; }
  }
} finally { await client.end(); }
