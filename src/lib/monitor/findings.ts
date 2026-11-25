import type { CategoryId, Check, ScanResult } from "@/lib/scan";

export type IssueSeverity = "critical" | "warning";

export interface Finding {
  check_id: string;
  category: CategoryId | "availability";
  title: string;
  severity: IssueSeverity;
  url: string;
  detail: string;
  recommendation?: string;
}

export interface IssueRow {
  id: string;
  check_id: string;
  url: string;
  status: "open" | "resolved";
  severity: IssueSeverity;
  title: string;
  times_opened: number;
  last_alerted_at: string | null;
}

/** Response time varies run to run, so it is reported but never becomes an issue or an alert. */
const NOISY = new Set(["speed"]);

export const keyOf = (id: string, url: string) => `${id}|${url}`;

export function findingsFrom(result: ScanResult): Finding[] {
  if (result.fatal) {
    return [{
      check_id: "site-unreachable", category: "availability", title: "Website unreachable", severity: "critical", url: result.site,
      detail: result.fatal, recommendation: "Check that the site is online, and that a firewall isn't blocking KlyrooBot (see /bot).",
    }];
  }
  return result.checks
    .filter((c) => (c.status === "fail" || c.status === "warn") && !NOISY.has(c.id))
    .map((c: Check): Finding => ({
      check_id: c.id, category: c.category, title: c.title, url: c.url ?? "", detail: c.detail, recommendation: c.recommendation,
      severity: c.status === "fail" && c.severity === "critical" ? "critical" : "warning",
    }));
}

export interface SyncPlan {
  create: Finding[];
  reopen: { issue: IssueRow; finding: Finding }[];
  touch: { issue: IssueRow; finding: Finding }[];
  resolve: IssueRow[];
}

/**
 * Compares what the latest scan found with what we already track.
 * `partial` means the scan could not test the site (it was unreachable): existing issues are left alone
 * rather than being marked resolved by a scan that saw nothing.
 */
export function planSync(existing: IssueRow[], findings: Finding[], opts: { partial?: boolean } = {}): SyncPlan {
  const byKey = new Map(existing.map((i) => [keyOf(i.check_id, i.url), i]));
  const plan: SyncPlan = { create: [], reopen: [], touch: [], resolve: [] };
  const seen = new Set<string>();
  for (const f of findings) {
    const k = keyOf(f.check_id, f.url);
    seen.add(k);
    const issue = byKey.get(k);
    if (!issue) plan.create.push(f);
    else if (issue.status === "resolved") plan.reopen.push({ issue, finding: f });
    else plan.touch.push({ issue, finding: f });
  }
  if (!opts.partial) {
    for (const i of existing) if (i.status === "open" && !seen.has(keyOf(i.check_id, i.url))) plan.resolve.push(i);
  }
  return plan;
}

export const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Critical findings that deserve an immediate alert: newly found, or back after being fixed (not within the cooldown). */
export function alertCandidates(plan: SyncPlan, now = Date.now()): Finding[] {
  const fresh = plan.create.filter((f) => f.severity === "critical");
  const back = plan.reopen
    .filter(({ finding, issue }) => finding.severity === "critical" && (!issue.last_alerted_at || now - Date.parse(issue.last_alerted_at) > ALERT_COOLDOWN_MS))
    .map((r) => r.finding);
  return [...fresh, ...back];
}

export interface Change { check_id: string; title: string; from: string; to: string; direction: "worse" | "better" | "changed" }

const RANK: Record<string, number> = { pass: 3, info: 2, warn: 1, fail: 0, unavailable: 2 };

/** What changed between two scans, on checks that matter. Used on the brand page and in reports. */
export function changesBetween(prev: ScanResult | null, curr: ScanResult): Change[] {
  if (!prev || prev.fatal || curr.fatal) return [];
  const before = new Map(prev.checks.map((c) => [keyOf(c.id, c.url ?? ""), c]));
  const out: Change[] = [];
  for (const c of curr.checks) {
    if (NOISY.has(c.id)) continue;
    const p = before.get(keyOf(c.id, c.url ?? ""));
    if (!p || p.status === c.status) continue;
    if (p.status === "unavailable" || c.status === "unavailable") continue;
    const direction = RANK[c.status] < RANK[p.status] ? "worse" : RANK[c.status] > RANK[p.status] ? "better" : "changed";
    out.push({ check_id: c.id, title: c.title, from: p.status, to: c.status, direction });
  }
  return out.sort((a, b) => (a.direction === "worse" ? -1 : 1) - (b.direction === "worse" ? -1 : 1));
}
