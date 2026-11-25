/**
 * Best-effort protection for the public scanner: per-IP rate limit plus a short result cache.
 * In-memory, so each serverless instance keeps its own counters. Move to a shared store before heavy traffic.
 */
import type { ScanResult } from "./types";

const hits = new Map<string, number[]>();
const cache = new Map<string, { at: number; result: ScanResult }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const CACHE_MS = 10 * 60 * 1000;

export function getCached(domain: string): ScanResult | null {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  cache.delete(domain);
  return null;
}
export function putCached(domain: string, result: ScanResult) {
  if (cache.size > 500) cache.clear();
  cache.set(domain, { at: Date.now(), result });
}

/** Returns true if this IP may start another scan, and records it. */
export function allowScan(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(ip, recent); return false; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
