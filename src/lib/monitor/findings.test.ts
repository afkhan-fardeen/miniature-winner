import { describe, expect, it } from "vitest";
import type { Check, ScanResult } from "@/lib/scan";
import { alertCandidates, changesBetween, findingsFrom, planSync, type IssueRow } from "./findings";

const chk = (id: string, status: Check["status"], severity: Check["severity"] = "info", url?: string): Check =>
  ({ id, category: "technical", title: id, status, severity, detail: `${id} ${status}`, url });
const scan = (checks: Check[], fatal?: string): ScanResult => ({ site: "https://x.example", domain: "x.example", scannedAt: "", durationMs: 1, pagesFetched: [], checks, categories: [], score: 80, coverage: 100, fatal });
const issue = (o: Partial<IssueRow>): IssueRow => ({ id: "i", check_id: "a", url: "", status: "open", severity: "critical", title: "a", times_opened: 1, last_alerted_at: null, ...o });

describe("findingsFrom", () => {
  it("turns failures and warnings into findings and ignores passes, notes and response time", () => {
    const f = findingsFrom(scan([chk("a", "fail", "critical"), chk("b", "warn", "warning"), chk("c", "pass"), chk("d", "info"), chk("speed", "warn", "warning"), chk("e", "unavailable")]));
    expect(f.map((x) => [x.check_id, x.severity])).toEqual([["a", "critical"], ["b", "warning"]]);
  });
  it("a non-critical failure is a warning", () => {
    expect(findingsFrom(scan([chk("a", "fail", "warning")]))[0].severity).toBe("warning");
  });
  it("an unreachable site is one critical finding", () => {
    const f = findingsFrom(scan([], "The homepage returned HTTP 500."));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ check_id: "site-unreachable", severity: "critical" });
  });
});

describe("planSync", () => {
  it("creates, touches, reopens and resolves", () => {
    const existing = [issue({ id: "1", check_id: "a" }), issue({ id: "2", check_id: "b" }), issue({ id: "3", check_id: "c", status: "resolved" })];
    const findings = findingsFrom(scan([chk("a", "fail", "critical"), chk("c", "fail", "critical"), chk("d", "fail", "critical")]));
    const plan = planSync(existing, findings);
    expect(plan.touch.map((t) => t.issue.id)).toEqual(["1"]);
    expect(plan.reopen.map((t) => t.issue.id)).toEqual(["3"]);
    expect(plan.create.map((f) => f.check_id)).toEqual(["d"]);
    expect(plan.resolve.map((i) => i.id)).toEqual(["2"]);
  });
  it("a scan that could not reach the site resolves nothing", () => {
    const plan = planSync([issue({ id: "1", check_id: "a" })], findingsFrom(scan([], "down")), { partial: true });
    expect(plan.resolve).toHaveLength(0);
    expect(plan.create[0].check_id).toBe("site-unreachable");
  });
  it("treats the same check on different URLs as different issues", () => {
    const plan = planSync([issue({ check_id: "p", url: "https://x.example/a" })], findingsFrom(scan([chk("p", "fail", "critical", "https://x.example/b")])));
    expect(plan.create).toHaveLength(1);
    expect(plan.resolve).toHaveLength(1);
  });
});

describe("alertCandidates", () => {
  const now = Date.parse("2026-11-26T12:00:00Z");
  it("alerts on new critical issues only, not warnings", () => {
    const plan = planSync([], findingsFrom(scan([chk("a", "fail", "critical"), chk("b", "warn", "warning")])));
    expect(alertCandidates(plan, now).map((f) => f.check_id)).toEqual(["a"]);
  });
  it("does not re-alert a flapping issue inside the cooldown, but does after it", () => {
    const f = findingsFrom(scan([chk("a", "fail", "critical")]));
    const soon = planSync([issue({ status: "resolved", last_alerted_at: "2026-11-26T06:00:00Z" })], f);
    const later = planSync([issue({ status: "resolved", last_alerted_at: "2026-11-24T06:00:00Z" })], f);
    expect(alertCandidates(soon, now)).toHaveLength(0);
    expect(alertCandidates(later, now)).toHaveLength(1);
  });
  it("does not alert for issues that were already open", () => {
    const plan = planSync([issue({})], findingsFrom(scan([chk("a", "fail", "critical")])));
    expect(alertCandidates(plan, now)).toHaveLength(0);
  });
});

describe("changesBetween", () => {
  it("lists regressions first and ignores noise", () => {
    const prev = scan([chk("a", "pass"), chk("b", "fail", "critical"), chk("speed", "pass"), chk("u", "unavailable")]);
    const curr = scan([chk("a", "fail", "critical"), chk("b", "pass"), chk("speed", "warn"), chk("u", "pass")]);
    const c = changesBetween(prev, curr);
    expect(c.map((x) => [x.check_id, x.direction])).toEqual([["a", "worse"], ["b", "better"]]);
  });
  it("returns nothing without a usable previous scan", () => {
    expect(changesBetween(null, scan([chk("a", "pass")]))).toEqual([]);
    expect(changesBetween(scan([], "down"), scan([chk("a", "pass")]))).toEqual([]);
  });
});
