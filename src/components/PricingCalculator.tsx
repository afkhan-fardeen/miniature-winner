"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DURATIONS, MAX_BRANDS, MIN_BRANDS, STANDARD_PRICES, formatGBP, quote,
  type DurationMonths, type PriceMode,
} from "@/lib/pricing";

const LABEL: Record<DurationMonths, string> = { 1: "Monthly", 3: "3 months", 6: "6 months", 12: "12 months" };

export function PricingCalculator({ mode }: { mode: PriceMode }) {
  const [brands, setBrands] = useState(1);
  const [months, setMonths] = useState<DurationMonths>(12);
  const clamp = (n: number) => Math.min(MAX_BRANDS, Math.max(MIN_BRANDS, Number.isFinite(n) ? Math.floor(n) : MIN_BRANDS));
  const q = quote(brands, months, mode);
  const term = q.durationMonths === 1 ? "month" : `${q.durationMonths} months`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <fieldset>
          <legend className="h3">How many brands?</legend>
          <p className="mt-1 text-sm text-ink-2">Each brand is a separate website with its own monitoring, score, alerts and reports.</p>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" aria-label="Fewer brands" className="btn btn-outline btn-lg w-11 px-0" onClick={() => setBrands((b) => clamp(b - 1))}>−</button>
            <input
              aria-label="Number of brands" inputMode="numeric" value={brands}
              onChange={(e) => setBrands(clamp(parseInt(e.target.value || "1", 10)))}
              className="input w-24 text-center text-lg tabular-nums"
            />
            <button type="button" aria-label="More brands" className="btn btn-outline btn-lg w-11 px-0" onClick={() => setBrands((b) => clamp(b + 1))}>+</button>
          </div>
          <input
            aria-label="Brands slider" type="range" min={1} max={25} value={Math.min(brands, 25)}
            onChange={(e) => setBrands(clamp(Number(e.target.value)))}
            className="mt-5 w-full max-w-md accent-ink"
          />
        </fieldset>

        <fieldset>
          <legend className="h3">Choose your term</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DURATIONS.map((d) => {
              const per = quote(1, d, mode);
              const selected = d === months;
              return (
                <button
                  key={d} type="button" onClick={() => setMonths(d)} aria-pressed={selected}
                  className={`relative rounded-xl border bg-paper p-5 text-left transition-colors ${
                    selected ? "border-ink outline outline-1 outline-ink" : "border-line hover:border-ink-2"
                  }`}
                >
                  {d === 12 && <span className="chip chip-acid absolute right-4 top-4">Best value</span>}
                  <div className="text-sm text-ink-2">{LABEL[d]}</div>
                  <div className="mt-2 text-3xl tracking-tight tabular-nums">
                    {formatGBP(per.effectiveMonthlyPerBrand)}
                    <span className="text-sm text-ink-2"> /brand /month</span>
                  </div>
                  <div className="mt-2 text-sm text-ink-2">
                    {d === 1 ? "Billed monthly" : `${formatGBP(per.pricePerBrand)} per brand, paid upfront`}
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <aside className="card-surface lg:sticky lg:top-24">
        <h3 className="h3">Your plan</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Brands" v={String(q.brands)} />
          <Row k="Term" v={LABEL[q.durationMonths]} />
          <Row k="Per brand" v={formatGBP(q.pricePerBrand)} />
          <Row k="Effective monthly" v={`${formatGBP(q.effectiveMonthlyTotal)} /month`} />
          {q.savingVsMonthly > 0 && <Row k="Saving vs monthly" v={formatGBP(q.savingVsMonthly)} ok />}
          {q.savingVsStandard > 0 && <Row k="Discount" v={formatGBP(q.savingVsStandard)} ok />}
        </dl>
        <div className="mt-5 border-t border-line pt-5">
          <div className="text-sm text-ink-2">Total paid upfront</div>
          <div className="text-5xl tracking-tight tabular-nums" data-testid="total">{formatGBP(q.total)}</div>
          <p className="mt-1 text-xs text-ink-2">GBP. One invoice for all brands.</p>
        </div>
        <Link href={`/app/checkout?brands=${q.brands}&months=${q.durationMonths}`} className="btn btn-accent btn-lg mt-5 w-full">
          Continue to checkout
        </Link>
        <p className="mt-4 text-xs text-ink-2">
          Renews at {formatGBP(STANDARD_PRICES[q.durationMonths])} per brand every {term} unless you cancel. Cancel any time to stop the next renewal; access continues to the end of your paid term.{" "}
          <Link href="/refunds" className="underline underline-offset-2">Refund policy</Link>
        </p>
      </aside>
    </div>
  );
}

function Row({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-2">{k}</dt>
      <dd className={`tabular-nums ${ok ? "text-ok" : ""}`}>{v}</dd>
    </div>
  );
}
