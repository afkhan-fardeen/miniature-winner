import type { SupabaseClient } from "@supabase/supabase-js";
import { recordScan, type BrandRef, type RecordOutcome } from "./process";

type Admin = SupabaseClient;
export interface DueOptions { limit?: number; concurrency?: number; onlyBrand?: string; force?: boolean }
export interface ScanRun { brand: string; domain: string; ok: boolean; outcome?: Pick<RecordOutcome, "created" | "resolved" | "alerted" | "baseline"> & { score: number | null; fatal?: string }; error?: string }

const DUE_AFTER_MS = 22 * 60 * 60 * 1000; // daily, with slack for the hourly runner

/** Verified brands with a usable licence that haven't been scanned in the last ~day. */
export async function dueBrands(admin: Admin, opts: DueOptions = {}): Promise<BrandRef[]> {
  let q = admin.from("brands").select("id, organization_id, brand_name, website_url, domain").eq("verification_status", "verified").order("created_at");
  if (opts.onlyBrand) q = q.eq("id", opts.onlyBrand);
  const { data: brands } = await q.limit(1000);
  if (!brands?.length) return [];

  const recent = new Set<string>();
  if (!opts.force) {
    const since = new Date(Date.now() - DUE_AFTER_MS).toISOString();
    const { data: scans } = await admin.from("brand_scans").select("brand_id").gt("created_at", since).limit(5000);
    for (const s of scans ?? []) recent.add(s.brand_id);
  }
  const due: BrandRef[] = [];
  for (const b of brands) {
    if (recent.has(b.id)) continue;
    const { data: licensed } = await admin.rpc("brand_has_valid_licence", { brand: b.id });
    if (licensed) due.push(b as BrandRef);
    if (due.length >= (opts.limit ?? 6)) break;
  }
  return due;
}

export async function runDueScans(admin: Admin, opts: DueOptions = {}): Promise<{ due: number; runs: ScanRun[] }> {
  const due = await dueBrands(admin, opts);
  const runs: ScanRun[] = [];
  const size = opts.concurrency ?? 3;
  for (let i = 0; i < due.length; i += size) {
    const batch = due.slice(i, i + size);
    const settled = await Promise.allSettled(batch.map((b) => recordScan(admin, b, "scheduled")));
    settled.forEach((s, j) => {
      const b = batch[j];
      if (s.status === "fulfilled") runs.push({ brand: b.id, domain: b.domain, ok: !s.value.result.fatal, outcome: { created: s.value.created, resolved: s.value.resolved, alerted: s.value.alerted, baseline: s.value.baseline, score: s.value.result.score, fatal: s.value.result.fatal } });
      else runs.push({ brand: b.id, domain: b.domain, ok: false, error: s.reason instanceof Error ? s.reason.message : String(s.reason) });
    });
  }
  return { due: due.length, runs };
}
