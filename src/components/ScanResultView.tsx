import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Info, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { bandFor, type Check, type ScanResult } from "@/lib/scan";

const ICON = {
  pass: { Icon: CheckCircle2, cls: "text-ok", label: "Passed" },
  warn: { Icon: AlertTriangle, cls: "text-[#b7791f]", label: "Warning" },
  fail: { Icon: XCircle, cls: "text-danger", label: "Failed" },
  info: { Icon: Info, cls: "text-ink-2", label: "Note" },
  unavailable: { Icon: CircleDashed, cls: "text-ink-2", label: "Not tested" },
} as const;

function Row({ c }: { c: Check }) {
  const { Icon, cls, label } = ICON[c.status];
  return (
    <li className="flex gap-3 px-5 py-4">
      <Icon size={20} className={`mt-0.5 shrink-0 ${cls}`} aria-label={label} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span>{c.title}</span>
          {c.status === "fail" && c.severity === "critical" && <span className="chip chip-crit">Critical</span>}
          {c.status === "warn" && <span className="chip chip-warn">Warning</span>}
        </div>
        <p className="mt-0.5 text-sm text-ink-2">{c.detail}</p>
        {c.recommendation && <p className="mt-1 text-sm"><span className="text-ink-2">Fix: </span>{c.recommendation}</p>}
      </div>
    </li>
  );
}

function Group({ title, items, open = false }: { title: string; items: Check[]; open?: boolean }) {
  if (!items.length) return null;
  return (
    <details open={open} className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <span className="h3">{title} <span className="ml-1 text-base text-ink-2">{items.length}</span></span>
        <span aria-hidden className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
      </summary>
      <ul className="divide-y divide-line border-t border-line">{items.map((c) => <Row key={c.id} c={c} />)}</ul>
    </details>
  );
}

export function ScanResultView({ r, expand = false, showCta = true }: { r: ScanResult; expand?: boolean; showCta?: boolean }) {
  if (r.fatal) {
    return (
      <div className="card flex gap-4">
        <ShieldAlert className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <div>
          <h2 className="h3">We couldn&apos;t scan {r.domain}</h2>
          <p className="mt-2 text-ink-2">{r.fatal}</p>
          <p className="mt-3 text-sm text-ink-2">Scanner details: <Link href="/bot" className="underline underline-offset-4">KlyrooBot</Link></p>
        </div>
      </div>
    );
  }

  const attention = r.checks.filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1));
  const passed = r.checks.filter((c) => c.status === "pass");
  const notes = r.checks.filter((c) => c.status === "info");
  const untested = r.checks.filter((c) => c.status === "unavailable");
  const band = r.score === null ? null : bandFor(r.score);
  const critical = attention.filter((c) => c.severity === "critical").length;
  const when = new Date(r.scannedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <div className="card-surface flex flex-col items-center justify-center py-8 text-center">
          <div className="relative grid size-40 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#E5E7EB" strokeWidth="10" />
              {r.score !== null && <circle cx="60" cy="60" r="52" fill="none" stroke="#0C0A08" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(r.score / 100) * 326.7} 326.7`} />}
            </svg>
            <div>
              <div className="text-6xl tracking-tight" data-testid="score">{r.score ?? "n/a"}</div>
              <div className="text-xs text-ink-2">/ 100</div>
            </div>
          </div>
          <div className="mt-4">Readiness score</div>
          {band && <div className="mt-1 max-w-[220px] text-sm text-ink-2">{band.label}</div>}
          {r.coverage < 100 && <div className="mt-2 max-w-[220px] text-xs text-ink-2">Based on the {r.coverage}% of checks we could run. Untested areas aren&apos;t counted as passed.</div>}
        </div>

        <div className="card">
          <h2 className="h3">Score by area</h2>
          <ul className="mt-5 space-y-4">
            {r.categories.map((c) => (
              <li key={c.id}>
                <div className="flex justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="tabular-nums text-ink-2">{c.score === null ? "Not tested" : c.score}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted">
                  {c.score !== null && <div className={`h-2 rounded-full ${c.score >= 75 ? "bg-ink" : "bg-acid"}`} style={{ width: `${Math.max(c.score, 3)}%` }} />}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-ink-2">
            Scanned {r.domain} on {when} UTC in {(r.durationMs / 1000).toFixed(1)}s, reading {r.pagesFetched.length} public pages. This is a technical readiness score, not an AI visibility or ranking score.
          </p>
        </div>
      </div>

      {attention.length > 0 ? (
        <section>
          <h2 className="h3 mb-3">{critical ? `${critical} critical issue${critical > 1 ? "s" : ""}, ${attention.length - critical} other` : `${attention.length} thing${attention.length > 1 ? "s" : ""} to improve`}</h2>
          <ul className="divide-y divide-line rounded-xl border border-line">{attention.map((c) => <Row key={c.id} c={c} />)}</ul>
        </section>
      ) : (
        <p className="alert-ok">No problems found in the checks we ran.</p>
      )}

      <div className="space-y-3">
        <Group title="Passing" items={passed} open={expand} />
        <Group title="Notes" items={notes} open={expand} />
        <Group title="Couldn't test" items={untested} open={expand} />
      </div>

      {showCta && (
      <section className="rounded-xl bg-ink p-8 text-paper sm:p-10">
        <h2 className="h2 max-w-[560px]">This is one snapshot. Klyroo watches {r.domain} every day.</h2>
        <p className="mt-3 max-w-[560px] text-[#c9c9c4]">
          Monitoring checks robots.txt, sitemaps and structured data daily, alerts you the moment something breaks, and sends weekly and monthly reports.
        </p>
        <Link href={`/signup?site=${encodeURIComponent(r.domain)}`} className="btn btn-accent btn-lg mt-6">
          Monitor {r.domain} <ArrowRight size={18} aria-hidden />
        </Link>
        </section>
      )}
    </div>
  );
}
