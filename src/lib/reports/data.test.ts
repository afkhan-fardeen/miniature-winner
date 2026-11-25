import { describe, expect, it } from "vitest";
import type { Check, ScanResult } from "@/lib/scan";
import { buildReport, previousPeriod, type IssueLite, type ScanLite } from "./data";

const chk = (id: string, status: Check["status"]): Check => ({ id, category: "technical", title: id, status, severity: "info", detail: "" });
const res = (checks: Check[], score: number, fatal?: string): ScanResult => ({ site: "s", domain: "d", scannedAt: "", durationMs: 1, pagesFetched: [], checks, categories: [{ id: "crawlers", label: "AI crawler access", weight: 20, score: 100, checked: 3 }, { id: "brand", label: "Brand consistency", weight: 15, score: null, checked: 0 }], score, coverage: 80, fatal });
const scan = (at: string, score: number, checks: Check[] = []): ScanLite => ({ created_at: at, score, result: res(checks, score) });
const issue = (o: Partial<IssueLite>): IssueLite => ({ title: "t", severity: "warning", url: "", category: "technical", first_detected_at: "2026-11-01T00:00:00Z", resolved_at: null, status: "open", detail: null, recommendation: null, ...o });
const brand = { id: "b", name: "Brand", domain: "brand.example" };

describe("buildReport", () => {
  const input = {
    kind: "weekly" as const, brand, start: "2026-11-16", end: "2026-11-22",
    scanBefore: scan("2026-11-15T06:00:00Z", 70, [chk("a", "pass")]),
    scansInPeriod: [scan("2026-11-17T06:00:00Z", 72), scan("2026-11-22T06:00:00Z", 80, [chk("a", "fail")])],
    issues: [
      issue({ title: "New critical", severity: "critical", first_detected_at: "2026-11-18T06:00:00Z", url: "https://x/a", recommendation: "Fix A" }),
      issue({ title: "Fixed one", status: "resolved", resolved_at: "2026-11-20T06:00:00Z", first_detected_at: "2026-11-02T00:00:00Z" }),
      issue({ title: "Old warning", url: "https://x/a", recommendation: "Fix A" }),
      issue({ title: "Before the week", first_detected_at: "2026-11-10T00:00:00Z", status: "resolved", resolved_at: "2026-11-12T00:00:00Z" }),
    ],
  };
  it("compares the last scan with the one before the period", () => {
    const r = buildReport(input);
    expect(r.score).toEqual({ start: 70, end: 80, delta: 10 });
    expect(r.scans).toBe(2);
  });
  it("splits new, resolved and outstanding issues, critical first", () => {
    const r = buildReport(input);
    expect(r.newIssues.map((x) => x.title)).toEqual(["New critical"]);
    expect(r.resolved.map((x) => x.title)).toEqual(["Fixed one"]);
    expect(r.outstanding.map((x) => x.title)).toEqual(["New critical", "Old warning"]);
  });
  it("lists affected URLs, de-duplicated priorities, untested areas and changes", () => {
    const r = buildReport(input);
    expect(r.topUrls[0]).toEqual({ url: "https://x/a", count: 3 });
    expect(r.priorities).toEqual(["Fix A"]);
    expect(r.untested).toContain("Brand consistency");
    expect(r.changes.map((c) => [c.check_id, c.direction])).toEqual([["a", "worse"]]);
  });
  it("ignores failed scans and handles a period with no scans", () => {
    const r = buildReport({ ...input, scansInPeriod: [{ created_at: "2026-11-17T06:00:00Z", score: null, result: res([], 0, "down") }], scanBefore: null });
    expect(r.scans).toBe(0);
    expect(r.score).toEqual({ start: null, end: null, delta: null });
  });
});

describe("previousPeriod", () => {
  it("weekly: the Monday to Sunday before today", () => {
    expect(previousPeriod("weekly", new Date("2026-11-30T08:00:00Z"))).toEqual({ start: "2026-11-23", end: "2026-11-29" }); // Monday
    expect(previousPeriod("weekly", new Date("2026-12-02T08:00:00Z"))).toEqual({ start: "2026-11-23", end: "2026-11-29" }); // Wednesday
  });
  it("monthly: the previous calendar month, including across a year", () => {
    expect(previousPeriod("monthly", new Date("2026-12-01T08:00:00Z"))).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(previousPeriod("monthly", new Date("2027-01-01T08:00:00Z"))).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });
});

import { renderReportPdf } from "./pdf";
import { periodicReport, issueAlert } from "@/lib/email/templates";

describe("pdf and emails", () => {
  const r = buildReport({
    kind: "monthly", brand, start: "2026-11-01", end: "2026-11-30",
    scanBefore: null, scansInPeriod: [scan("2026-11-10T06:00:00Z", 64, [chk("a", "fail")]), scan("2026-11-28T06:00:00Z", 71)],
    issues: [issue({ title: "Missing “price” – schema", severity: "critical", first_detected_at: "2026-11-12T00:00:00Z", url: "https://x/p", recommendation: "Add price…" })],
  });
  it("renders a real PDF, even with curly quotes and dashes in the text", async () => {
    const bytes = await renderReportPdf(r);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1500);
  });
  it("writes a report email covering each brand, and an alert email with before and now", () => {
    const e = periodicReport({ firstName: "Ada", kind: "monthly", orgName: "Org", start: "2026-11-01", end: "2026-11-30", reports: [r] });
    expect(e.subject).toContain("monthly");
    expect(e.html).toContain("brand.example");
    expect(e.html).toContain("71");
    const a = issueAlert({ firstName: "Ada", brandName: "Brand", domain: "brand.example", brandId: "b", detectedAt: new Date("2026-11-26T06:00:00Z"), issues: [{ title: "XML sitemap", severity: "critical", url: "", detail: "No valid sitemap", previous: "OK", recommendation: "Publish one" }] });
    expect(a.subject).toBe("Critical: XML sitemap on brand.example");
    expect(a.html).toContain("Before");
    expect(a.text).toContain("Publish one");
  });
});
