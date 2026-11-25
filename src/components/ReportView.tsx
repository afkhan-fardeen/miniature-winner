import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { IssueLite, ReportData } from "@/lib/reports/data";

const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function IssueList({ title, items, empty, limit = 12 }: { title: string; items: IssueLite[]; empty: string; limit?: number }) {
  return (
    <section>
      <h2 className="h3">{title} <span className="text-base text-ink-2">{items.length}</span></h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-ink-2">{empty}</p> : (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {items.slice(0, limit).map((i, n) => (
            <li key={`${i.title}-${i.url}-${n}`} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span>{i.title}</span>
                <span className={`chip ${i.severity === "critical" ? "chip-crit" : "chip-warn"}`}>{i.severity === "critical" ? "Critical" : "Warning"}</span>
              </div>
              {i.detail && <p className="mt-0.5 text-sm text-ink-2">{i.detail}</p>}
              {i.url && <p className="mt-0.5 break-all text-xs text-ink-2">{i.url}</p>}
              {i.recommendation && <p className="mt-1 text-sm"><span className="text-ink-2">Fix: </span>{i.recommendation}</p>}
            </li>
          ))}
        </ul>
      )}
      {items.length > limit && <p className="mt-2 text-sm text-ink-2">and {items.length - limit} more.</p>}
    </section>
  );
}

export function ReportView({ r }: { r: ReportData }) {
  const d = r.score.delta;
  const Trend = d === null || d === 0 ? Minus : d > 0 ? ArrowUp : ArrowDown;
  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <div className="card-surface flex flex-col items-center justify-center py-8 text-center">
          <div className="text-6xl tracking-tight tabular-nums">{r.score.end ?? "n/a"}</div>
          <div className="text-xs text-ink-2">/ 100</div>
          {d !== null && (
            <div className={`mt-3 inline-flex items-center gap-1 text-sm ${d < 0 ? "text-danger" : d > 0 ? "text-ok" : "text-ink-2"}`}>
              <Trend size={16} aria-hidden /> {d === 0 ? "No change" : `${Math.abs(d)} point${Math.abs(d) === 1 ? "" : "s"} ${d > 0 ? "up" : "down"}`}
            </div>
          )}
          <div className="mt-2 text-xs text-ink-2">{r.scans} scan{r.scans === 1 ? "" : "s"} in this period</div>
          {r.coverage !== null && r.coverage < 100 && <div className="mt-1 max-w-[220px] text-xs text-ink-2">Based on {r.coverage}% of checks. Untested areas aren&apos;t counted as passed.</div>}
        </div>
        <div className="card">
          <h2 className="h3">Score by area</h2>
          <ul className="mt-5 space-y-4">
            {r.categories.map((c) => (
              <li key={c.id}>
                <div className="flex justify-between text-sm"><span>{c.label}</span><span className="tabular-nums text-ink-2">{c.score ?? "Not tested"}</span></div>
                <div className="mt-1.5 h-2 rounded-full bg-muted">{c.score !== null && <div className={`h-2 rounded-full ${c.score >= 75 ? "bg-ink" : "bg-acid"}`} style={{ width: `${Math.max(c.score, 3)}%` }} />}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[["New issues", r.newIssues.length], ["Resolved", r.resolved.length], ["Outstanding", r.outstanding.length]].map(([k, v]) => (
          <div key={k} className="card"><div className="text-sm text-ink-2">{k}</div><div className="mt-1 text-4xl tracking-tight tabular-nums">{v}</div></div>
        ))}
      </div>

      <IssueList title="New issues" items={r.newIssues} empty="No new issues were found in this period." />
      <IssueList title="Resolved" items={r.resolved} empty="No issues were resolved in this period." />
      <IssueList title="Outstanding" items={r.outstanding} empty="Nothing is outstanding." limit={20} />

      {r.changes.length > 0 && (
        <section>
          <h2 className="h3">Changes since the last scan</h2>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
            {r.changes.map((c) => (
              <li key={c.check_id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span>{c.title}</span>
                <span className={c.direction === "worse" ? "text-danger" : "text-ok"}>{c.from} → {c.to}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.kind === "monthly" && r.topUrls.length > 0 && (
        <section>
          <h2 className="h3">Most affected URLs</h2>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
            {r.topUrls.map((u) => <li key={u.url} className="flex justify-between gap-4 px-5 py-3"><span className="break-all">{u.url}</span><span className="text-ink-2">{u.count}</span></li>)}
          </ul>
        </section>
      )}

      <section>
        <h2 className="h3">Recommended actions</h2>
        {r.priorities.length ? <ol className="mt-3 list-decimal space-y-2 pl-5">{r.priorities.map((p) => <li key={p}>{p}</li>)}</ol> : <p className="mt-2 text-sm text-ink-2">No actions needed right now.</p>}
        {r.untested.length > 0 && <p className="mt-4 text-sm text-ink-2">Not tested this period: {r.untested.join(", ")}.</p>}
      </section>
      <p className="text-xs text-ink-2">Generated {fmt(r.generatedAt)}. A technical readiness report, not an AI visibility or ranking score.</p>
    </div>
  );
}
