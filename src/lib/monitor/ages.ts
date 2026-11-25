import type { TrackedIssue } from "@/components/BrandWorkspaceView";

interface Row { title: string; severity: string; detail: string | null; status: string; first_detected_at: string; resolved_at: string | null }

/** Splits tracked issues into open (critical first, with age in days) and recently resolved. */
export function summariseIssueAges(rows: Row[], now = Date.now()): { open: TrackedIssue[]; resolved: TrackedIssue[] } {
  const map = (r: Row): TrackedIssue => ({
    title: r.title, severity: r.severity === "critical" ? "critical" : "warning", detail: r.detail, firstDetected: r.first_detected_at, resolvedAt: r.resolved_at,
    daysOpen: Math.max(0, Math.floor((now - Date.parse(r.first_detected_at)) / 864e5)),
  });
  const open = rows.filter((r) => r.status === "open").map(map).sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1) || b.daysOpen - a.daysOpen);
  const resolved = rows.filter((r) => r.status === "resolved").map(map).slice(0, 8);
  return { open, resolved };
}
