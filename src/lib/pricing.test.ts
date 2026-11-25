import { describe, expect, it } from "vitest";
import { prorateAdditionalBrands, quote } from "./pricing";

describe("quote (launch)", () => {
  it("matches the PRD price list", () => {
    expect(quote(1, 1).total).toBe(3900);
    expect(quote(1, 3).total).toBe(10500);
    expect(quote(1, 6).total).toBe(19500);
    expect(quote(1, 12).total).toBe(30000);
  });
  it("computes effective monthly per brand", () => {
    expect(quote(1, 3).effectiveMonthlyPerBrand).toBe(3500);
    expect(quote(1, 6).effectiveMonthlyPerBrand).toBe(3250);
    expect(quote(1, 12).effectiveMonthlyPerBrand).toBe(2500);
  });
  it("scales by brand count", () => {
    const q = quote(3, 12);
    expect(q.total).toBe(90000);
    expect(q.effectiveMonthlyTotal).toBe(7500);
  });
  it("computes savings vs monthly and vs standard", () => {
    const q = quote(2, 12);
    expect(q.savingVsMonthly).toBe(3900 * 12 * 2 - 60000); // 33,600p
    expect(q.savingVsStandard).toBe((36000 - 30000) * 2);
  });
  it("monthly has no saving vs monthly", () => {
    expect(quote(5, 1).savingVsMonthly).toBe(0);
  });
});

describe("quote (standard)", () => {
  it("uses standard prices and has no promo saving", () => {
    const q = quote(1, 12, "standard");
    expect(q.total).toBe(36000);
    expect(q.savingVsStandard).toBe(0);
  });
});

describe("quote validation", () => {
  it("rejects bad input", () => {
    expect(() => quote(0, 1)).toThrow(RangeError);
    expect(() => quote(1.5, 1)).toThrow(RangeError);
    expect(() => quote(1001, 1)).toThrow(RangeError);
    // @ts-expect-error invalid duration on purpose
    expect(() => quote(1, 2)).toThrow(RangeError);
  });
});

describe("prorateAdditionalBrands", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");
  const periodEnd = new Date("2027-01-01T00:00:00Z");
  it("charges half price at mid-term", () => {
    const mid = new Date((periodStart.getTime() + periodEnd.getTime()) / 2);
    const r = prorateAdditionalBrands({
      contractPricePerBrand: 30000,
      periodStart,
      periodEnd,
      now: mid,
      additionalBrands: 2,
    });
    expect(r.pricePerBrand).toBe(15000);
    expect(r.total).toBe(30000);
  });
  it("charges full price at term start and zero at term end", () => {
    const base = { contractPricePerBrand: 30000, periodStart, periodEnd, additionalBrands: 1 };
    expect(prorateAdditionalBrands({ ...base, now: periodStart }).total).toBe(30000);
    expect(prorateAdditionalBrands({ ...base, now: periodEnd }).total).toBe(0);
  });
  it("uses the contract price, not the current price", () => {
    const r = prorateAdditionalBrands({
      contractPricePerBrand: 30000,
      periodStart,
      periodEnd,
      now: periodStart,
      additionalBrands: 1,
    });
    expect(r.pricePerBrand).toBe(30000);
  });
});
