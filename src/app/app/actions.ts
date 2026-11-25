"use server";

import { resolveTxt } from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { polarProvider } from "@/lib/billing/polar";
import { VERIFY_TXT_PREFIX, parseSite, verificationRecordName } from "@/lib/domain";
import { verifyViaMeta } from "@/lib/verify";
import { isDuration, isValidBrandCount, type PriceMode } from "@/lib/pricing";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const back = (org: string, key: "error" | "ok", msg: string): never =>
  redirect(`/app?org=${org}&${key}=${encodeURIComponent(msg)}`);

async function requireAdmin(orgId: string) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: m } = await supabase
    .from("organization_members").select("role")
    .eq("organization_id", orgId).eq("user_id", auth.user.id).maybeSingle();
  if (!m || (m.role !== "owner" && m.role !== "admin")) back(orgId, "error", "You need admin access for that.");
  return { supabase, user: auth.user };
}

export async function createOrganization(formData: FormData) {
  const name = z.string().trim().min(1).max(120).safeParse(formData.get("name"));
  if (!name.success) redirect("/app?error=" + encodeURIComponent("Enter an organisation name"));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_organization", { org_name: name.data });
  if (error) redirect("/app?error=" + encodeURIComponent("Could not create organisation"));
  redirect(`/app?org=${data}`);
}

export async function addBrand(formData: FormData) {
  const orgId = z.string().uuid().parse(formData.get("org"));
  const name = z.string().trim().min(1).max(120).safeParse(formData.get("name"));
  const site = parseSite(String(formData.get("site") ?? ""));
  if (!name.success || !site) back(orgId, "error", "Enter a brand name and a public website address (no IPs or local addresses).");
  const { supabase } = await requireAdmin(orgId);
  const { data: created, error } = await supabase.from("brands").insert({
    organization_id: orgId, brand_name: name.data!, website_url: site!.url, domain: site!.domain,
  }).select("id").single();
  if (error) {
    if (error.message.includes("no_free_licence")) back(orgId, "error", "No free brand licences. Buy another licence to add this brand.");
    if (error.code === "23505") back(orgId, "error", "That website is already added.");
    back(orgId, "error", "Could not add brand.");
  }
  revalidatePath("/app");
  // Show value straight away: one preview scan now. Daily monitoring, alerts and reports start once ownership is verified.
  let scanned = false;
  try {
    const { recordScan } = await import("@/lib/monitor/process");
    const out = await recordScan(supabaseAdmin(), { id: created!.id, organization_id: orgId, brand_name: name.data!, website_url: site!.url, domain: site!.domain }, "manual");
    scanned = !out.result.fatal;
  } catch (e) {
    console.error("[brand] preview scan failed:", e instanceof Error ? e.message : e);
  }
  redirect(`/app/brands/${created!.id}?org=${orgId}&${scanned ? "ok" : "error"}=${encodeURIComponent(scanned ? "Your first report is ready. Verify your domain to turn on daily monitoring, alerts and reports." : "Brand added, but we couldn't scan the site just now. Check the address, then run a scan from here.")}`);
}

export async function removeBrand(formData: FormData) {
  const orgId = z.string().uuid().parse(formData.get("org"));
  const brandId = z.string().uuid().parse(formData.get("brand"));
  const { supabase } = await requireAdmin(orgId);
  await supabase.from("brands").delete().eq("id", brandId).eq("organization_id", orgId);
  revalidatePath("/app");
  back(orgId, "ok", "Brand removed. Its licence is free to reuse.");
}

export async function verifyBrand(formData: FormData) {
  const orgId = z.string().uuid().parse(formData.get("org"));
  const brandId = z.string().uuid().parse(formData.get("brand"));
  const fromBrandPage = formData.get("from") === "brand";
  const { supabase } = await requireAdmin(orgId);
  const { data: brand } = await supabase.from("brands").select("domain, website_url, verification_token")
    .eq("id", brandId).eq("organization_id", orgId).maybeSingle();
  if (!brand) back(orgId, "error", "Brand not found.");
  const done = (key: "error" | "ok", msg: string): never =>
    redirect(fromBrandPage ? `/app/brands/${brandId}?org=${orgId}&${key}=${encodeURIComponent(msg)}` : `/app?org=${orgId}&${key}=${encodeURIComponent(msg)}`);

  // Either proof is enough: the DNS record, or the meta tag on the homepage.
  let ok = false;
  try {
    const records = await resolveTxt(verificationRecordName(brand!.domain)); // DNS only: no HTTP, no SSRF surface
    ok = records.some((r) => r.join("") === VERIFY_TXT_PREFIX + brand!.verification_token);
  } catch { /* NXDOMAIN or timeout counts as not found */ }
  if (!ok) ok = await verifyViaMeta(brand!.website_url, brand!.verification_token);
  if (!ok) done("error", "We couldn't find the DNS record or the meta tag yet. DNS changes can take a few minutes; a theme change is usually instant. Check you saved it, then try again.");

  await supabaseAdmin().from("brands").update({ verification_status: "verified", verified_at: new Date().toISOString() }).eq("id", brandId);
  revalidatePath("/app");
  done("ok", "Domain verified. Daily monitoring, alerts and reports are now on.");
}

export async function startCheckout(formData: FormData) {
  const orgId = z.string().uuid().parse(formData.get("org"));
  const brands = Number(formData.get("brands"));
  const months = Number(formData.get("months"));
  if (!isValidBrandCount(brands) || !isDuration(months)) redirect("/pricing");
  const { user } = await requireAdmin(orgId);
  const mode: PriceMode = process.env.PRICE_MODE === "standard" ? "standard" : "launch";
  const retry = (code: string): never => redirect(`/app/checkout?brands=${brands}&months=${months}&error=${code}`);

  let url: string | null = null;
  try {
    ({ url } = await polarProvider.createCheckout({
      organizationId: orgId, customerEmail: user.email!, brands, durationMonths: months, priceMode: mode,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app?org=${orgId}&ok=${encodeURIComponent("Payment received. Your licences will appear shortly.")}`,
    }));
  } catch (e) {
    console.error("[checkout] failed to create Polar checkout:", e instanceof Error ? e.message : e);
    retry("checkout_failed");
  }
  redirect(url!);
}

const SCAN_COOLDOWN_MS = 10 * 60 * 1000;

/** Runs a fresh scan for a verified brand and stores it. One per brand every 10 minutes. */
export async function runBrandScan(formData: FormData) {
  const orgId = z.string().uuid().parse(formData.get("org"));
  const brandId = z.string().uuid().parse(formData.get("brand"));
  const { supabase } = await requireAdmin(orgId);
  const { data: brand } = await supabase.from("brands").select("id, brand_name, website_url, domain, verification_status")
    .eq("id", brandId).eq("organization_id", orgId).maybeSingle();
  const to = (key: "error" | "ok", msg: string): never => redirect(`/app/brands/${brandId}?org=${orgId}&${key}=${encodeURIComponent(msg)}`);
  if (!brand) back(orgId, "error", "Brand not found.");
  if (brand!.verification_status !== "verified") {
    const { count } = await supabase.from("brand_scans").select("id", { count: "exact", head: true }).eq("brand_id", brandId).not("score", "is", null);
    if (count) to("error", "Verify your domain to run more scans and turn on daily monitoring.");
  }

  const { data: last } = await supabase.from("brand_scans").select("created_at")
    .eq("brand_id", brandId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < SCAN_COOLDOWN_MS) {
    to("error", "A scan ran in the last 10 minutes. Try again shortly.");
  }

  const { data: licensed } = await supabaseAdmin().rpc("brand_has_valid_licence", { brand: brandId });
  if (!licensed) to("error", "This brand has no active licence. Add a licence to run scans.");

  const { recordScan } = await import("@/lib/monitor/process");
  const out = await recordScan(supabaseAdmin(), { id: brandId, organization_id: orgId, brand_name: brand!.brand_name, website_url: brand!.website_url, domain: brand!.domain }, "manual");
  if (out.result.fatal) to("error", out.result.fatal);
  revalidatePath(`/app/brands/${brandId}`);
  to("ok", "Scan complete.");
}
