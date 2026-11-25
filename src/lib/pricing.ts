/**
 * Klyroo pricing engine. Server-side source of truth.
 * All money is integer pence (GBP). Never trust client-supplied totals.
 */

export const DURATIONS = [1, 3, 6, 12] as const;
export type DurationMonths = (typeof DURATIONS)[number];

export const MIN_BRANDS = 1;
export const MAX_BRANDS = 1000; // Polar seat cap per subscription

export type PriceTable = Record<DurationMonths, number>;

/** Launch offer, per brand, paid upfront for the whole term (pence). */
export const LAUNCH_PRICES: PriceTable = {
  1: 3900,
  3: 10500,
  6: 19500,
  12: 30000,
};

/** Standard prices, per brand (pence). Must be prices Klyroo genuinely charges. */
export const STANDARD_PRICES: PriceTable = {
  1: 4900,
  3: 13500,
  6: 24000,
  12: 36000,
};

export type PriceMode = "launch" | "standard";

export function priceTable(mode: PriceMode): PriceTable {
  return mode === "launch" ? LAUNCH_PRICES : STANDARD_PRICES;
}

export function isDuration(n: unknown): n is DurationMonths {
  return typeof n === "number" && (DURATIONS as readonly number[]).includes(n);
}

export function isValidBrandCount(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= MIN_BRANDS && (n as number) <= MAX_BRANDS;
}

export interface Quote {
  mode: PriceMode;
  brands: number;
  durationMonths: DurationMonths;
  currency: "GBP";
  pricePerBrand: number; // pence, whole term
  total: number; // pence, charged upfront
  effectiveMonthlyPerBrand: number; // pence, rounded
  effectiveMonthlyTotal: number; // pence, rounded
  /** Saving vs buying the same months at the monthly price in the same table. */
  savingVsMonthly: number;
  /** Saving vs the standard price for the same term (0 in standard mode). */
  savingVsStandard: number;
}

export function quote(
  brands: number,
  durationMonths: DurationMonths,
  mode: PriceMode = "launch",
): Quote {
  if (!isValidBrandCount(brands)) {
    throw new RangeError(`brands must be an integer between ${MIN_BRANDS} and ${MAX_BRANDS}`);
  }
  if (!isDuration(durationMonths)) {
    throw new RangeError("durationMonths must be 1, 3, 6 or 12");
  }
  const table = priceTable(mode);
  const pricePerBrand = table[durationMonths];
  const total = pricePerBrand * brands;
  const monthlyEquivalent = table[1] * durationMonths * brands;
  const standardTotal = STANDARD_PRICES[durationMonths] * brands;
  return {
    mode,
    brands,
    durationMonths,
    currency: "GBP",
    pricePerBrand,
    total,
    effectiveMonthlyPerBrand: Math.round(pricePerBrand / durationMonths),
    effectiveMonthlyTotal: Math.round(total / durationMonths),
    savingVsMonthly: Math.max(0, monthlyEquivalent - total),
    savingVsStandard: Math.max(0, standardTotal - total),
  };
}

export interface ProrationInput {
  /** Per-brand price the customer paid for the current term (from the subscription contract). */
  contractPricePerBrand: number;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
  additionalBrands: number;
}

export interface ProrationResult {
  additionalBrands: number;
  remainingFraction: number;
  pricePerBrand: number; // pence, prorated, rounded
  total: number; // pence
}

/** Cost to add brands mid-term so they expire with the existing term. Per-second, like Polar. */
export function prorateAdditionalBrands(input: ProrationInput): ProrationResult {
  const { contractPricePerBrand, periodStart, periodEnd, now, additionalBrands } = input;
  if (!isValidBrandCount(additionalBrands)) {
    throw new RangeError("additionalBrands must be a positive integer within limits");
  }
  const start = periodStart.getTime();
  const end = periodEnd.getTime();
  if (!(end > start)) throw new RangeError("periodEnd must be after periodStart");
  const remaining = Math.min(Math.max(end - now.getTime(), 0), end - start);
  const remainingFraction = remaining / (end - start);
  const pricePerBrand = Math.round(contractPricePerBrand * remainingFraction);
  return {
    additionalBrands,
    remainingFraction,
    pricePerBrand,
    total: pricePerBrand * additionalBrands,
  };
}

export function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(pounds) ? 0 : 2,
  }).format(pounds);
}
