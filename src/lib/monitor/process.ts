import type { SupabaseClient } from "@supabase/supabase-js";
import { emailOnce, notify, orgPeople } from "@/lib/account";
import { issueAlert } from "@/lib/email/templates";
import { runScan, type ScanResult } from "@/lib/scan";
import { alertCandidates, findingsFrom, planSync, type Finding, type IssueRow } from "./findings";

type Admin = SupabaseClient;
export interface BrandRef { id: string; organization_id: string; brand_name: string; website_url: string; domain: string }
export interface RecordOutcome { result: ScanResult; created: number; resolved: number; alerted: number; baseline: boolean }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RETENTION_DAYS = 90;

/**
 * Runs a scan for a brand, stores it, keeps the issue list in step, and alerts on new critical issues.
 * The first successful scan is a silent baseline. New critical issues are confirmed with a second scan
 * before anyone is emailed, so a one-off blip doesn't page people.
 */
export async function recordScan(admin: Admin, brand: BrandRef, source: "manual" | "scheduled"): Promise<RecordOutcome> {
  const { data: prevRow } = await admin.from("brand_scans").select("result").eq("brand_id", brand.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { count: goodScans } = await admin.from("brand_scans").select("id", { count: "exact", head: true }).eq("brand_id", brand.id).not("score", "is", null);
  const baseline = !goodScans;
  const { data: existingRaw } = await admin.from("issues").select("id, check_id, url, status, severity, title, times_opened, last_alerted_at").eq("brand_id", brand.id);
  const existing = (existingRaw ?? []) as IssueRow[];

  let result = await runScan(brand.website_url, brand.domain);
  if (result.fatal) {
    await sleep(3000); // one retry before calling a site unreachable
    result = await runScan(brand.website_url, brand.domain);
  } else if (!baseline && alertCandidates(planSync(existing, findingsFrom(result))).length > 0) {
    await sleep(2000);
    const confirm = await runScan(brand.website_url, brand.domain);
    if (!confirm.fatal) result = confirm; // only what shows up twice is treated as real
  }

  await admin.from("brand_scans").insert({ brand_id: brand.id, organization_id: brand.organization_id, score: result.score, coverage: result.coverage, result, source });
  await admin.from("brand_scans").delete().eq("brand_id", brand.id).lt("created_at", new Date(Date.now() - RETENTION_DAYS * 864e5).toISOString());

  const findings = findingsFrom(result);
  const plan = planSync(existing, findings, { partial: !!result.fatal });
  const nowIso = new Date().toISOString();
  const base = { brand_id: brand.id, organization_id: brand.organization_id };

  const createdRows: { id: string; finding: Finding }[] = [];
  if (plan.create.length) {
    const { data } = await admin.from("issues").insert(plan.create.map((f) => ({ ...base, check_id: f.check_id, category: f.category, title: f.title, severity: f.severity, url: f.url, detail: f.detail, recommendation: f.recommendation ?? null })))
      .select("id, check_id, url");
    for (const row of data ?? []) createdRows.push({ id: row.id, finding: plan.create.find((f) => f.check_id === row.check_id && f.url === row.url)! });
  }
  for (const { issue, finding } of plan.reopen) {
    await admin.from("issues").update({ status: "open", resolved_at: null, times_opened: issue.times_opened + 1, last_detected_at: nowIso, severity: finding.severity, title: finding.title, detail: finding.detail, recommendation: finding.recommendation ?? null }).eq("id", issue.id);
  }
  for (const { issue, finding } of plan.touch) {
    await admin.from("issues").update({ last_detected_at: nowIso, severity: finding.severity, title: finding.title, detail: finding.detail, recommendation: finding.recommendation ?? null }).eq("id", issue.id);
  }
  if (plan.resolve.length) await admin.from("issues").update({ status: "resolved", resolved_at: nowIso }).in("id", plan.resolve.map((i) => i.id));

  let alerted = 0;
  if (!baseline) {
    const candidates = alertCandidates(plan);
    if (candidates.length) {
      const ids = [
        ...createdRows.filter((r) => candidates.includes(r.finding)).map((r) => ({ id: r.id, finding: r.finding })),
        ...plan.reopen.filter((r) => candidates.includes(r.finding)).map((r) => ({ id: r.issue.id, finding: r.finding })),
      ];
      alerted = await deliverAlerts(admin, brand, ids, prevRow?.result as ScanResult | undefined, result.scannedAt);
    }
    const fixed = plan.resolve.filter((i) => i.severity === "critical");
    if (fixed.length) {
      for (const p of await orgPeople(admin, brand.organization_id)) {
        await notify(admin, { userId: p.userId, orgId: brand.organization_id, kind: "issue_resolved", title: `Fixed on ${brand.domain}: ${fixed.map((i) => i.title).join(", ").slice(0, 120)}`, href: `/app/brands/${brand.id}` });
      }
    }
  }
  return { result, created: plan.create.length + plan.reopen.length, resolved: plan.resolve.length, alerted, baseline };
}

function previousState(prev: ScanResult | undefined, checkId: string): string {
  const c = prev?.checks.find((k) => k.id === checkId);
  if (!c) return "No issue found";
  return c.status === "pass" ? "OK" : c.detail;
}

async function deliverAlerts(admin: Admin, brand: BrandRef, items: { id: string; finding: Finding }[], prev: ScanResult | undefined, scannedAt: string): Promise<number> {
  const people = await orgPeople(admin, brand.organization_id);
  const issues = items.map(({ finding: f }) => ({ title: f.title, severity: "critical" as const, url: f.url, detail: f.detail, previous: previousState(prev, f.check_id), recommendation: f.recommendation }));
  const ref = `${brand.id}:${items.map((i) => i.id).sort().join(",")}`.slice(0, 240);
  let sent = 0;
  for (const p of people) {
    const title = issues.length === 1 ? `Critical: ${issues[0].title} on ${brand.domain}` : `${issues.length} critical issues on ${brand.domain}`;
    await notify(admin, { userId: p.userId, orgId: brand.organization_id, kind: "alert", title, body: issues[0].detail.slice(0, 160), href: `/app/brands/${brand.id}` });
    if (!p.alertEmails) continue;
    const ok = await emailOnce(admin, p, "alert", ref, () => issueAlert({ firstName: p.firstName, brandName: brand.brand_name, domain: brand.domain, issues, detectedAt: new Date(scannedAt), brandId: brand.id }));
    if (ok) sent++;
  }
  const status = sent > 0 ? "sent" : people.some((p) => p.alertEmails) ? "failed" : "skipped";
  await admin.from("alerts").insert(items.map((i) => ({ organization_id: brand.organization_id, brand_id: brand.id, issue_id: i.id, severity: "critical", notification_status: status, sent_at: sent > 0 ? new Date().toISOString() : null })));
  await admin.from("issues").update({ last_alerted_at: new Date().toISOString() }).in("id", items.map((i) => i.id));
  return items.length;
}
