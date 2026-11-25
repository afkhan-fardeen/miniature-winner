import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandWorkspaceView } from "@/components/BrandWorkspaceView";
import type { ScanResult } from "@/lib/scan";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Brand report" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ params, searchParams }: { params: PageProps<"/app/brands/[id]">["params"]; searchParams: PageProps<"/app/brands/[id]">["searchParams"] }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: brand } = await supabase.from("brands").select("id, organization_id, brand_name, domain, verification_status").eq("id", id).maybeSingle();
  if (!brand) notFound();
  const { data: scans } = await supabase.from("brand_scans").select("result, score, created_at").eq("brand_id", id).order("created_at", { ascending: false }).limit(8);
  const latest = scans?.[0]?.result as ScanResult | undefined;
  const history = [...(scans ?? [])].reverse().filter((s) => typeof s.score === "number").map((s) => ({ at: s.created_at, score: s.score as number }));

  return (
    <BrandWorkspaceView
      email={auth.user.email} orgId={brand.organization_id}
      brand={{ id: brand.id, name: brand.brand_name, domain: brand.domain, verified: brand.verification_status === "verified" }}
      scan={latest ?? null} history={history} error={one(sp.error)} ok={one(sp.ok)}
    />
  );
}

export default function BrandPage({ params, searchParams }: PageProps<"/app/brands/[id]">) {
  return <Suspense fallback={<div className="p-10 text-sm text-ink-2">Loading…</div>}><Content params={params} searchParams={searchParams} /></Suspense>;
}
