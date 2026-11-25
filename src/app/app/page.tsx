import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OrgDashboard } from "@/components/OrgDashboard";
import { summariseLicences, type LicenceRow } from "@/lib/licences";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/app">["searchParams"] }) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let { data: orgs } = await supabase.from("organizations").select("id, name").order("created_at");
  if (!orgs?.length) {
    // New or legacy account without an organisation yet: finish setup, or ask for their details first.
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", auth.user.id).maybeSingle();
    if (!profile) redirect("/app/settings?complete=1");
    const { ensureAccountSetup } = await import("@/lib/account");
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    await ensureAccountSetup(supabaseAdmin(), auth.user.id);
    ({ data: orgs } = await supabase.from("organizations").select("id, name").order("created_at"));
  }
  const active = orgs?.find((o) => o.id === one(sp.org)) ?? orgs?.[0];

  const [brands, licences, subs, scans] = active
    ? await Promise.all([
        supabase.from("brands").select("*").eq("organization_id", active.id).order("created_at"),
        supabase.from("brand_licenses").select("id, brand_id, status, kind, expires_at").eq("organization_id", active.id).eq("status", "active"),
        supabase.from("subscriptions").select("*").eq("organization_id", active.id).order("created_at", { ascending: false }),
        supabase.from("brand_scans").select("brand_id, score, created_at").eq("organization_id", active.id).order("created_at", { ascending: false }).limit(200),
      ])
    : [null, null, null, null];

  const latest = new Map<string, number | null>();
  for (const s of scans?.data ?? []) if (!latest.has(s.brand_id)) latest.set(s.brand_id, s.score);

  const { valid, used, trial } = summariseLicences((licences?.data ?? []) as LicenceRow[]);
  const welcome = one(sp.welcome) === "1" ? "Welcome to Klyroo! Your free trial has started." : undefined;

  return (
    <OrgDashboard
      email={auth.user.email} orgs={orgs ?? []} active={active}
      brands={(brands?.data ?? []).map((b) => ({ ...b, score: latest.get(b.id) ?? null }))}
      total={valid.length} used={used} free={valid.length - used} subs={subs?.data ?? []}
      trial={trial} hasScan={(scans?.data ?? []).length > 0}
      error={one(sp.error)} ok={one(sp.ok) ?? welcome} prefillSite={one(sp.site)?.slice(0, 253) ?? ""}
    />
  );
}

export default function Dashboard({ searchParams }: PageProps<"/app">) {
  return <Suspense fallback={<div className="p-10 text-sm text-ink-2">Loading…</div>}><Content searchParams={searchParams} /></Suspense>;
}
