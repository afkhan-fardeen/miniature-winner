import { ChevronLeft, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ReportView } from "@/components/ReportView";
import type { ReportData } from "@/lib/reports/data";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Report" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function Content({ params }: { params: PageProps<"/app/reports/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: row } = await supabase.from("reports").select("id, kind, period_start, period_end, data").eq("id", id).maybeSingle();
  if (!row) notFound();
  const r = row.data as ReportData;
  return (
    <>
      <AppHeader email={auth.user.email} />
      <main className="container-x max-w-[900px] py-10">
        <Link href="/app/reports" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"><ChevronLeft size={16} aria-hidden /> All reports</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{row.kind === "weekly" ? "Weekly report" : "Monthly report"}</p>
            <h1 className="mt-1 text-[32px] leading-9 tracking-[-0.02em]">{r.brand.name}</h1>
            <p className="mt-1 text-sm text-ink-2">{r.brand.domain} · {fmt(row.period_start)} to {fmt(row.period_end)}</p>
          </div>
          <a href={`/app/reports/${row.id}/pdf`} className="btn btn-primary btn-lg"><Download size={16} aria-hidden /> Download PDF</a>
        </div>
        <div className="mt-8"><ReportView r={r} /></div>
      </main>
    </>
  );
}

export default function ReportPage({ params }: PageProps<"/app/reports/[id]">) {
  return <Suspense fallback={<div className="p-10 text-sm text-ink-2">Loading…</div>}><Content params={params} /></Suspense>;
}
