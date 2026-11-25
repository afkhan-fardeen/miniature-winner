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

  // ---- Trial licence
  const { data: orgB } = await b.rpc("create_organization", { org_name: "Org B" });
  orgs.push(orgB);
  const meB = (await b.auth.getUser()).data.user.id;
  const g1 = await admin.rpc("grant_trial", { org: orgB, person: meB });
  const g2 = await admin.rpc("grant_trial", { org: orgB, person: meB });
  check("trial granted once", g1.data === true && g2.data === false, JSON.stringify([g1.data, g2.data, g1.error?.message]));
  const t1 = await b.from("brands").insert({ organization_id: orgB, brand_name: "T1", website_url: "https://trial-one.example", domain: "trial-one.example" }).select("id").single();
  check("trial licence allows one brand", !t1.error, t1.error?.message);
  const t2 = await b.from("brands").insert({ organization_id: orgB, brand_name: "T2", website_url: "https://trial-two.example", domain: "trial-two.example" });
  check("second brand blocked on trial", t2.error?.message.includes("no_free_licence"), t2.error?.message);

  // Same website cannot start another trial from a different account
  const { data: orgC } = await a.rpc("create_organization", { org_name: "Org C" });
  orgs.push(orgC);
  await admin.rpc("grant_trial", { org: orgC, person: me });
  const dup = await a.from("brands").insert({ organization_id: orgC, brand_name: "Dup", website_url: "https://trial-one.example", domain: "trial-one.example" });
  check("website cannot get a second free trial", dup.error?.message.includes("trial_domain_used"), dup.error?.message);

  // Expired trial: new brands blocked, then a paid licence is auto-assigned to the unlicensed brand
  await admin.from("brand_licenses").update({ expires_at: new Date(Date.now() - 864e5).toISOString() }).eq("granted_to", meB);
  const { data: valid } = await admin.rpc("brand_has_valid_licence", { brand: t1.data.id });
  check("expired trial is not a valid licence", valid === false, String(valid));
  const { data: subB } = await admin.from("subscriptions").insert({
    organization_id: orgB, duration_months: 1, quantity: 1, price_mode: "launch", price_per_brand: 3900, renewal_price_per_brand: 4900,
    total_amount: 3900, status: "active", start_date: new Date().toISOString(), expiry_date: new Date(Date.now() + 30 * 864e5).toISOString(),
  }).select("id").single();
  await admin.from("brand_licenses").insert({ organization_id: orgB, subscription_id: subB.id });
  const { data: assigned } = await admin.rpc("assign_free_licences", { org: orgB });
  const { data: valid2 } = await admin.rpc("brand_has_valid_licence", { brand: t1.data.id });
  check("paid licence auto-assigned to brand after trial", assigned === 1 && valid2 === true, JSON.stringify([assigned, valid2]));

  // Profiles + notifications privacy
  await admin.from("profiles").insert({ user_id: me, first_name: "A", last_name: "A", account_type: "personal" });
  const prof = await b.from("profiles").select("user_id").eq("user_id", me);
  check("other user cannot read profile", prof.data?.length === 0);
  const forgedProfile = await a.from("profiles").insert({ user_id: me, first_name: "X", last_name: "Y", account_type: "personal" });
  check("client cannot insert profile", !!forgedProfile.error);
  await admin.from("notifications").insert({ user_id: me, kind: "t", title: "Hi" });
  const notes = await b.from("notifications").select("id");
  check("other user cannot read notifications", notes.data?.length === 0);
  const forgedNote = await a.from("notifications").insert({ user_id: me, kind: "t", title: "forged" });
  check("client cannot insert notifications", !!forgedNote.error);

  // ---- Issues, alerts, reports: readable by members only, writable by the server only
  const bid = t1.data.id;
  const { data: iss } = await admin.from("issues").insert({ brand_id: bid, organization_id: orgB, check_id: "sitemap", category: "technical", title: "XML sitemap", severity: "critical", url: "" }).select("id").single();
  await admin.from("alerts").insert({ organization_id: orgB, brand_id: bid, issue_id: iss.id, severity: "critical", notification_status: "sent" });
  await admin.from("reports").insert({ organization_id: orgB, brand_id: bid, kind: "weekly", period_start: "2026-11-16", period_end: "2026-11-22", data: {} });
  for (const table of ["issues", "alerts", "reports"]) {
    const mine = await b.from(table).select("id");
    const theirs = await a.from(table).select("id").eq("organization_id", orgB);
    check(`member can read ${table}`, (mine.data?.length ?? 0) === 1, JSON.stringify(mine.error));
    check(`other tenant cannot read ${table}`, theirs.data?.length === 0);
  }
  const forgedIssue = await b.from("issues").insert({ brand_id: bid, organization_id: orgB, check_id: "x", category: "technical", title: "x", severity: "warning" });
  check("client cannot insert issues", !!forgedIssue.error);
  const dupIssue = await admin.from("issues").insert({ brand_id: bid, organization_id: orgB, check_id: "sitemap", category: "technical", title: "dup", severity: "critical", url: "" });
  check("one issue row per brand, check and url", !!dupIssue.error);
} catch (e) {
  console.log("ERROR", e.message ?? e); fails++;
} finally {
  for (const o of orgs) await admin.from("organizations").delete().eq("id", o);
  for (const u of users) await admin.auth.admin.deleteUser(u);
  console.log(fails ? `\n${fails} FAILED` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
}
