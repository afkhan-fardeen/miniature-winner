import type { SupabaseClient } from "@supabase/supabase-js";
import { emailOnce, orgPeople } from "@/lib/account";
import { periodicReport } from "@/lib/email/templates";
import { buildReport, previousPeriod, type IssueLite, type ReportData, type ScanLite } from "./data";
import { renderReportPdf } from "./pdf";

type Admin = SupabaseClient;

export interface GenerateOutcome { period: { start: string; end: string }; reports: number; emails: number }

/** Builds the report for every brand that was scanned in the period, stores it, and emails each organisation once. */
export async function generateReports(admin: Admin, kind: "weekly" | "monthly", today: Date): Promise<GenerateOutcome> {
  const period = previousPeriod(kind, today);
  const from = `${period.start}T00:00:00.000Z`;
  const to = new Date(Date.parse(`${period.end}T00:00:00Z`) + 864e5).toISOString();

  const { data: brands } = await admin.from("brands").select("id, organization_id, brand_name, domain").eq("verification_status", "verified").limit(2000);
  const byOrg = new Map<string, ReportData[]>();
  let created = 0;

  for (const b of brands ?? []) {
    const { data: scans } = await admin.from("brand_scans").select("created_at, score, result").eq("brand_id", b.id).gte("created_at", from).lt("created_at", to).order("created_at");
    if (!scans?.length) continue;
    const { data: before } = await admin.from("brand_scans").select("created_at, score, result").eq("brand_id", b.id).lt("created_at", from).not("score", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: issues } = await admin.from("issues").select("title, severity, url, category, first_detected_at, resolved_at, status, detail, recommendation").eq("brand_id", b.id);
    const data = buildReport({
      kind, brand: { id: b.id, name: b.brand_name, domain: b.domain }, start: period.start, end: period.end,
      scansInPeriod: scans as ScanLite[], scanBefore: (before as ScanLite | null) ?? null, issues: (issues ?? []) as IssueLite[],
    });
    const { data: row } = await admin.from("reports").upsert(
      { organization_id: b.organization_id, brand_id: b.id, kind, period_start: period.start, period_end: period.end, data },
      { onConflict: "brand_id,kind,period_start", ignoreDuplicates: true },
    ).select("id");
    if (row?.length) created++;
    byOrg.set(b.organization_id, [...(byOrg.get(b.organization_id) ?? []), data]);
  }

  let emails = 0;
  for (const [orgId, reports] of byOrg) {
    const people = await orgPeople(admin, orgId);
    const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).single();
    const attachments = kind === "monthly"
      ? await Promise.all(reports.map(async (r) => ({ filename: `klyroo-${r.brand.domain}-${period.start.slice(0, 7)}.pdf`, content: Buffer.from(await renderReportPdf(r)).toString("base64") })))
      : undefined;
    for (const p of people) {
      const sent = await emailOnce(admin, p, `${kind}_report`, `${orgId}:${period.start}`, () => ({
        ...periodicReport({ firstName: p.firstName, kind, orgName: org?.name ?? "", start: period.start, end: period.end, reports }), attachments,
      }), { respectPreference: true });
      if (sent) emails++;
    }
  }
  return { period, reports: created, emails };
}
