import { Download, FileBarChart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import type { ReportData } from "@/lib/reports/data";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reports" };
const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function Content() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: rows } = await supabase.from("reports").select("id, kind, period_start, period_end, data, created_at").order("period_start", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <AppHeader email={auth.user.email} />
      <main className="container-x max-w-[900px] py-10">
        <h1 className="text-[32px] leading-9 tracking-[-0.02em]">Reports</h1>
        <p className="mt-2 text-ink-2">A weekly report arrives every Monday and a monthly report with a PDF on the 1st. Every report is kept here.</p>
        {(rows ?? []).length === 0 ? (
          <div className="card-surface mt-8 flex flex-col items-center py-14 text-center">
            <FileBarChart size={28} className="text-ink-2" aria-hidden />
            <p className="mt-3">No reports yet.</p>
            <p className="max-w-sm text-sm text-ink-2">Your first report is created after a full week or month of scans on a verified brand.</p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-line rounded-xl border border-line">
            {rows!.map((r) => {
              const d = r.data as ReportData;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <Link href={`/app/reports/${r.id}`} className="hover:underline underline-offset-4">{d.brand.name}</Link>
                    <div className="text-sm text-ink-2">{r.kind === "weekly" ? "Weekly" : "Monthly"} · {fmt(r.period_start)} to {fmt(r.period_end)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.score.end !== null && <span className="chip tabular-nums">Score {d.score.end}</span>}
                    <Link href={`/app/reports/${r.id}`} className="btn btn-outline">View</Link>
                    <a href={`/app/reports/${r.id}/pdf`} className="btn btn-outline" aria-label="Download PDF"><Download size={16} aria-hidden /> PDF</a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

export default function ReportsPage() {
  return <Suspense fallback={<div className="p-10 text-sm text-ink-2">Loading…</div>}><Content /></Suspense>;
}
