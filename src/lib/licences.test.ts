import { describe, expect, it } from "vitest";
import { summariseLicences, type LicenceRow } from "./licences";

const now = Date.parse("2026-11-25T00:00:00Z");
const day = 864e5;
const row = (o: Partial<LicenceRow>): LicenceRow => ({ id: "x", brand_id: null, status: "active", kind: "paid", expires_at: null, ...o });

describe("summariseLicences", () => {
  it("counts an unexpired trial and reports days left", () => {
    const s = summariseLicences([row({ kind: "trial", expires_at: new Date(now + 9.2 * day).toISOString(), brand_id: "b" })], now);
    expect(s.valid).toHaveLength(1);
    expect(s.used).toBe(1);
    expect(s.trial).toMatchObject({ daysLeft: 10, expired: false });
  });
  it("does not count an expired trial", () => {
    const s = summariseLicences([row({ kind: "trial", expires_at: new Date(now - day).toISOString() }), row({})], now);
    expect(s.valid).toHaveLength(1);
    expect(s.trial?.expired).toBe(true);
    expect(s.trial?.daysLeft).toBe(0);
  });
  it("has no trial when none was granted", () => {
    expect(summariseLicences([row({})], now).trial).toBeNull();
  });
});
