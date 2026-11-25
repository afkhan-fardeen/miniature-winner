// Integration check of RLS + licence cap against the project in .env.local. Cleans up after itself.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const mk = () => createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

let fails = 0;
const check = (name, ok, extra = "") => { console.log(ok ? "PASS" : "FAIL", name, ok ? "" : extra); if (!ok) fails++; };
const pw = "Test-" + Math.random().toString(36).slice(2) + "!9";
const users = [];
const orgs = [];

async function user(tag) {
  const email = `klyroo-test-${tag}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
  if (error) throw error;
  users.push(data.user.id);
  const c = mk();
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: pw });
  if (e2) throw e2;
  return c;
}

try {
  const a = await user("a");
  const b = await user("b");

  const { data: orgA, error: oe } = await a.rpc("create_organization", { org_name: "Org A" });
  check("create_organization works", !oe && !!orgA, oe?.message);
  orgs.push(orgA);

  // Tenant isolation
  const seenByB = await b.from("organizations").select("id").eq("id", orgA);
  check("other user cannot see org", seenByB.data?.length === 0);

  // No licence -> cannot add brand
  const noLic = await a.from("brands").insert({ organization_id: orgA, brand_name: "X", website_url: "https://x.com", domain: "x.com" });
  check("brand blocked without licence", noLic.error?.message.includes("no_free_licence"), noLic.error?.message);

  // Service role creates 1 paid licence
  const { data: sub } = await admin.from("subscriptions").insert({
    organization_id: orgA, duration_months: 12, quantity: 1, price_mode: "launch", price_per_brand: 30000,
    renewal_price_per_brand: 36000, total_amount: 30000, status: "active",
    start_date: new Date().toISOString(), expiry_date: new Date(Date.now() + 365 * 864e5).toISOString(),
  }).select("id").single();
  await admin.from("brand_licenses").insert({ organization_id: orgA, subscription_id: sub.id });

  // Clients cannot forge billing rows
  const forge = await a.from("subscriptions").insert({ organization_id: orgA, duration_months: 12, quantity: 99, price_mode: "launch", price_per_brand: 1, renewal_price_per_brand: 1, total_amount: 1, status: "active" });
  check("client cannot insert subscriptions", !!forge.error);
  const forgeLic = await a.from("brand_licenses").insert({ organization_id: orgA, subscription_id: sub.id });
  check("client cannot insert licences", !!forgeLic.error);

  // First brand OK, second blocked
  const b1 = await a.from("brands").insert({ organization_id: orgA, brand_name: "One", website_url: "https://one.com", domain: "one.com" }).select("id").single();
  check("first brand allowed with 1 licence", !b1.error, b1.error?.message);
  const b2 = await a.from("brands").insert({ organization_id: orgA, brand_name: "Two", website_url: "https://two.com", domain: "two.com" });
  check("second brand blocked (cap)", b2.error?.message.includes("no_free_licence"), b2.error?.message);

  // Other tenant cannot touch brand
  const seeBrand = await b.from("brands").select("id").eq("id", b1.data.id);
  check("other user cannot see brand", seeBrand.data?.length === 0);
  const upd = await b.from("brands").update({ brand_name: "hacked" }).eq("id", b1.data.id).select();
  check("other user cannot update brand", (upd.data?.length ?? 0) === 0);

  // Cannot forge verification
  const ver = await a.from("brands").update({ verification_status: "verified" }).eq("id", b1.data.id);
  check("owner cannot self-verify", !!ver.error, "update succeeded");

  // Replace a brand: delete frees the licence
  await a.from("brands").delete().eq("id", b1.data.id);
  const b3 = await a.from("brands").insert({ organization_id: orgA, brand_name: "Three", website_url: "https://three.com", domain: "three.com" });
  check("deleting a brand frees its licence", !b3.error, b3.error?.message);

  // Last owner protected
  const me = (await a.auth.getUser()).data.user.id;
  const leave = await a.from("organization_members").delete().eq("organization_id", orgA).eq("user_id", me);
  check("last owner cannot be removed", !!leave.error);
} catch (e) {
  console.log("ERROR", e.message ?? e); fails++;
} finally {
  for (const o of orgs) await admin.from("organizations").delete().eq("id", o);
  for (const u of users) await admin.auth.admin.deleteUser(u);
  console.log(fails ? `\n${fails} FAILED` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
}
