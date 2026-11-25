export type CheckStatus = "pass" | "warn" | "fail" | "info" | "unavailable";
export type Severity = "critical" | "warning" | "info";
export type CategoryId = "crawlers" | "structured" | "content" | "technical" | "brand";

export interface Check {
  id: string;
  category: CategoryId;
  title: string;
  status: CheckStatus;
  severity: Severity;
  detail: string;
  url?: string;
  recommendation?: string;
}

export const CATEGORIES: { id: CategoryId; label: string; weight: number }[] = [
  { id: "crawlers", label: "AI crawler access", weight: 20 },
  { id: "structured", label: "Structured data", weight: 25 },
  { id: "content", label: "Content readiness", weight: 20 },
  { id: "technical", label: "Technical health", weight: 20 },
  { id: "brand", label: "Brand consistency", weight: 15 },
];

export interface CategoryScore { id: CategoryId; label: string; weight: number; score: number | null; checked: number }

export interface ScanResult {
  site: string;
  domain: string;
  scannedAt: string;
  durationMs: number;
  pagesFetched: string[];
  checks: Check[];
  categories: CategoryScore[];
  /** 0-100 over the categories we could actually test. null if nothing could be tested. */
  score: number | null;
  /** Share of the score weight that was actually tested. */
  coverage: number;
  fatal?: string;
}
