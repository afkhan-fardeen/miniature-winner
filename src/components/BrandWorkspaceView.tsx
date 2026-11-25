import { ChevronLeft, Play } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ScanResultView } from "@/components/ScanResultView";
import type { Change } from "@/lib/monitor/findings";
import type { ScanResult } from "@/lib/scan";
import { runBrandScan } from "@/app/app/actions";

export interface HistoryPoint { at: string; score: number }
export interface TrackedIssue { title: string; severity: "critical" | "warning"; detail: string | null; firstDetected: string; resolvedAt?: string | null; daysOpen: number }

const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function BrandWorkspaceView({
  email, orgId, brand, scan, history, error, ok, expand = false, open = [], resolved = [], changes = [], lastScan,
}: {
  email?: string | null; orgId: string;
  brand: { id: string; name: string; domain: string; verified: boolean };
  scan: ScanResult | null; history: HistoryPoint[];
  error?: string; ok?: string; expand?: boolean;
  open?: TrackedIssue[]; resolved?: TrackedIssue[]; changes?: Change[]; lastScan?: { at: string; source: "manual" | "scheduled" };
}) {
  return (
    <>
      <AppHeader email={email} />
      <main className="container-x max-w-[1000px] py-10">
        <Link href={`/app?org=${orgId}`} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"><ChevronLeft size={16} aria-hidden /> All brands</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Brand</p>
            <h1 className="mt-1 text-[32px] leading-9 tracking-[-0.02em]">{brand.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">{brand.domain} <span className={`chip ${brand.verified ? "chip-ok" : "chip-warn"}`}>{brand.verified ? "Verified" : "Not verified"}</span></p>
            {lastScan && <p className="mt-1 text-xs text-ink-2">Checked automatically every day. Last scan {new Date(lastScan.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC ({lastScan.source}).</p>}
          </div>
          <form action={runBrandScan}>
            <input type="hidden" name="org" value={orgId} /><input type="hidden" name="brand" value={brand.id} />
            <button className="btn btn-primary btn-lg" disabled={!brand.verified}><Play size={16} aria-hidden /> Run scan now</button>
          </form>
        </div>

        <div className="mt-6 space-y-3" aria-live="polite">
          {error && <p role="alert" className="alert-error">{error}</p>}
          {ok && <p role="status" className="alert-ok">{ok}</p>}
        </div>

        {!scan ? (
          <div className="card-surface mt-8 text-center">
            <h2 className="h3">No scans yet</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-2">Run your first scan to get a readiness score and a list of what to fix.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <ScanResultView r={scan} showCta={false} expand={expand} />

            {changes.length > 0 && (
              <section aria-label="Changes since the previous scan">
                <h2 className="h3">Changes since the previous scan</h2>
                <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
                  {changes.map((c) => (
                    <li key={c.check_id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <span>{c.title}</span>
                      <span className={c.direction === "worse" ? "text-danger" : "text-ok"}>{c.from} → {c.to}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(open.length > 0 || resolved.length > 0) && (
              <section aria-label="Issue history">
                <h2 className="h3">Issue tracker</h2>
                <p className="mt-1 text-sm text-ink-2">We keep track of each issue from the day it appeared until it is fixed. New critical issues are emailed to you after a second check confirms them.</p>
                <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                  {open.map((i) => (
                    <li key={`o-${i.title}-${i.firstDetected}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <span className="flex items-center gap-2">{i.title}<span className={`chip ${i.severity === "critical" ? "chip-crit" : "chip-warn"}`}>{i.severity === "critical" ? "Critical" : "Warning"}</span></span>
                      <span className="text-ink-2">Open {i.daysOpen < 1 ? "since today" : `for ${i.daysOpen} day${i.daysOpen === 1 ? "" : "s"}`}</span>
                    </li>
                  ))}
                  {resolved.map((i) => (
                    <li key={`r-${i.title}-${i.firstDetected}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm text-ink-2">
                      <span className="flex items-center gap-2"><span className="line-through">{i.title}</span><span className="chip chip-ok">Resolved</span></span>
                      <span>{i.resolvedAt ? new Date(i.resolvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : ""}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {history.length > 1 && (
              <section className="card" aria-label="Score history">
                <div className="flex items-baseline justify-between">
                  <h2 className="h3">Score history</h2>
                  <span className="text-sm text-ink-2">Last {history.length} scans</span>
                </div>
                <ul className="mt-6 flex h-44 items-end gap-3">
                  {history.map((h, i) => (
                    <li key={h.at} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs tabular-nums text-ink-2">{h.score}</span>
                      <span className={`w-full rounded-md ${i === history.length - 1 ? "bg-ink" : "bg-line"}`} style={{ height: `${Math.max(h.score * 1.1, 4)}px` }} />
                      <span className="text-xs text-ink-2">{fmt(h.at)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
