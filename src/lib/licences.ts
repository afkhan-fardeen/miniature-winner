export interface LicenceRow { id: string; brand_id: string | null; status: string; kind: "paid" | "trial"; expires_at: string | null }

export interface LicenceSummary {
  valid: LicenceRow[];
  used: number;
  trial: { endsAt: string; daysLeft: number; expired: boolean } | null;
}

/** Which licences can be used right now, and the state of the free trial. */
export function summariseLicences(rows: LicenceRow[], now = Date.now()): LicenceSummary {
  const valid = rows.filter((l) => l.kind === "paid" || (l.expires_at !== null && new Date(l.expires_at).getTime() > now));
  const t = rows.find((l) => l.kind === "trial");
  const trial = t?.expires_at
    ? { endsAt: t.expires_at, expired: new Date(t.expires_at).getTime() <= now, daysLeft: Math.max(0, Math.ceil((new Date(t.expires_at).getTime() - now) / 864e5)) }
    : null;
  return { valid, used: valid.filter((l) => l.brand_id).length, trial };
}
