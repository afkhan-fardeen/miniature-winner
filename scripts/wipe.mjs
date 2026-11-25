// DESTRUCTIVE. Drops everything in the "public" schema and deletes all auth users of the
// project in .env.local. Usage: npm run db:wipe -- --yes-wipe=<project-ref>
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const arg = process.argv.find((a) => a.startsWith("--yes-wipe="))?.split("=")[1];
if (arg !== ref) {
  console.error(`Refusing. Re-run with --yes-wipe=${ref} to confirm you mean project ${ref}.`);
  process.exit(1);
}
if (!env.DATABASE_URL?.includes(ref)) throw new Error("DATABASE_URL does not belong to this project ref");

const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(`
    drop schema public cascade;
    create schema public;
    grant usage on schema public to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
  `);
  console.log("public schema reset");
} finally { await client.end(); }

const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const list = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: h })).json();
for (const u of list.users ?? []) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: h });
  console.log("deleted auth user", u.id.slice(0, 8), r.status);
}
