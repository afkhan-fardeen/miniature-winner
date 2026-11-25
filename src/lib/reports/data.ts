import { changesBetween, type Change } from "@/lib/monitor/findings";
import { CATEGORIES, type ScanResult } from "@/lib/scan";

export interface IssueLite {
  title: string; severity: "critical" | "warning"; url: string; category: string;
  first_detected_at: string; resolved_at: string | null; status: "open" | "resolved";
  detail: string | null; recommendation: string | null;
}
export interface ScanLite { created_at: string; score: number | null; result: ScanResult }

export interface ReportData {
  kind: "weekly" | "monthly";
  brand: { id: string; name: string; domain: string };
  period: { start: string; end: string }; // inclusive dates, YYYY-MM-DD
  generatedAt: string;
  scans: number;
  score: { start: number | null; end: number | null; delta: number | null };
  coverage: number | null;
  categories: { id: string; label: string; score: number | null }[];
  newIssues: IssueLite[];
  resolved: IssueLite[];
  outstanding: IssueLite[];
  changes: Change[];
  topUrls: { url: string; count: number }[];
  priorities: string[];
  untested: string[];
}

const rank = (s: string) => (s === "critical" ? 0 : 1);
const bySeverity = (a: IssueLite, b: IssueLite) => rank(a.severity) - rank(b.severity) || a.title.localeCompare(b.title);
const within = (iso: string | null, start: number, end: number) => !!iso && Date.parse(iso) >= start && Date.parse(iso) < end;

/**
 * Builds a report from stored scans and issues only: no estimates. Anything we couldn't test is listed as
 * untested rather than counted as passing, and the score change compares scans from the same period.
 */
export function buildReport(i: {
  kind: "weekly" | "monthly"; brand: ReportData["brand"]; start: string; end: string; now?: Date;
  scansInPeriod: ScanLite[]; scanBefore: ScanLite | null; issues: IssueLite[];
}): ReportData {
  const startMs = Date.parse(`${i.start}T00:00:00Z`);
  const endMs = Date.parse(`${i.end}T00:00:00Z`) + 864e5; // exclusive
  const scans = [...i.scansInPeriod].filter((s) => !s.result.fatal && s.score !== null).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const first = scans[0] ?? null;
  const last = scans[scans.length - 1] ?? null;
  const startScore = i.scanBefore?.score ?? first?.score ?? null;
  const endScore = last?.score ?? null;

  const newIssues = i.issues.filter((x) => within(x.first_detected_at, startMs, endMs)).sort(bySeverity);
  const resolved = i.issues.filter((x) => within(x.resolved_at, startMs, endMs)).sort(bySeverity);
  const outstanding = i.issues.filter((x) => x.status === "open").sort(bySeverity);

  const counts = new Map<string, number>();
  for (const x of [...newIssues, ...outstanding]) if (x.url) counts.set(x.url, (counts.get(x.url) ?? 0) + 1);
  const topUrls = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([url, count]) => ({ url, count }));

  const seen = new Set<string>();
  const priorities = outstanding.map((x) => x.recommendation || x.title).filter((t) => (seen.has(t) ? false : (seen.add(t), true))).slice(0, 5);

  const cats = last?.result.categories ?? [];
  const categories = CATEGORIES.map((c) => ({ id: c.id, label: c.label, score: cats.find((x) => x.id === c.id)?.score ?? null }));

  return {
    kind: i.kind, brand: i.brand, period: { start: i.start, end: i.end }, generatedAt: (i.now ?? new Date()).toISOString(),
    scans: scans.length,
    score: { start: startScore, end: endScore, delta: startScore !== null && endScore !== null ? endScore - startScore : null },
    coverage: last?.result.coverage ?? null,
    categories, newIssues, resolved, outstanding,
    changes: changesBetween((i.scanBefore ?? first)?.result ?? null, last?.result ?? (first?.result as ScanResult)).slice(0, 12),
    topUrls, priorities,
    untested: categories.filter((c) => c.score === null).map((c) => c.label),
  };
}

/** Previous full week (Mon to Sun) or previous calendar month, relative to `today` (UTC). */
export function previousPeriod(kind: "weekly" | "monthly", today: Date): { start: string; end: string } {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (kind === "weekly") {
    const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
    const end = new Date(d.getTime() - (dow + 1) * 864e5); // last Sunday
    return { start: iso(new Date(end.getTime() - 6 * 864e5)), end: iso(end) };
  }
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(first.getTime() - 864e5);
  return { start: iso(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))), end: iso(end) };
}
