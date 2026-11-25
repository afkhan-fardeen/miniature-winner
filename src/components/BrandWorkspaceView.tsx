import { ChevronLeft, Play } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ScanResultView } from "@/components/ScanResultView";
import type { ScanResult } from "@/lib/scan";
import { runBrandScan } from "@/app/app/actions";

export interface HistoryPoint { at: string; score: number }

const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function BrandWorkspaceView({
  email, orgId, brand, scan, history, error, ok, expand = false,
}: {
  email?: string | null; orgId: string;
  brand: { id: string; name: string; domain: string; verified: boolean };
  scan: ScanResult | null; history: HistoryPoint[];
  error?: string; ok?: string; expand?: boolean;
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
