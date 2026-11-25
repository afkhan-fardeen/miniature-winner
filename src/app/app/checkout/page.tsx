import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { STANDARD_PRICES, formatGBP, isDuration, isValidBrandCount, quote, type PriceMode } from "@/lib/pricing";
import { supabaseServer } from "@/lib/supabase/server";
import { createOrganization, startCheckout } from "../actions";

export const metadata: Metadata = { title: "Checkout" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/app/checkout">["searchParams"] }) {
  const sp = await searchParams;
  const brands = Number(Array.isArray(sp.brands) ? sp.brands[0] : sp.brands);
  const months = Number(Array.isArray(sp.months) ? sp.months[0] : sp.months);
  if (!isValidBrandCount(brands) || !isDuration(months)) redirect("/pricing");

  const mode: PriceMode = process.env.PRICE_MODE === "standard" ? "standard" : "launch";
  const q = quote(brands, months, mode);
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const { data: orgs } = await supabase.from("organizations").select("id, name").order("created_at");
  const term = months === 1 ? "month" : `${months} months`;
  const renewal = STANDARD_PRICES[q.durationMonths] * q.brands;

  return (
    <>
      <AppHeader email={auth.user?.email} />
      <main className="container-x max-w-[640px] py-12">
        <Link href="/pricing" className="text-sm text-ink-2 hover:text-ink">← Change plan</Link>
        <h1 className="mt-3 text-[32px] leading-9 tracking-[-0.02em]">Review your order</h1>
        {one(sp.error) === "checkout_failed" && (
          <p role="alert" className="alert-error mt-6">We couldn&apos;t start your payment. Nothing was charged. Please try again, and if it keeps happening contact support.</p>
        )}

        <dl className="card mt-8 space-y-3 text-sm">
          <div className="flex justify-between"><dt>{q.brands} brand{q.brands > 1 ? "s" : ""} × {term} @ {formatGBP(q.pricePerBrand)}</dt><dd className="tabular-nums">{formatGBP(q.total)}</dd></div>
          {q.savingVsStandard > 0 && <div className="flex justify-between text-ok"><dt>Discount included</dt><dd className="tabular-nums">−{formatGBP(q.savingVsStandard)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-3 text-lg"><dt>Total today</dt><dd className="tabular-nums">{formatGBP(q.total)}</dd></div>
        </dl>
        <ul className="mt-4 space-y-1 text-sm text-ink-2">
          <li>Renews at {formatGBP(renewal)} every {term} unless you cancel before the renewal date.</li>
          <li>Cancelling stops the next renewal. Access continues to the end of your paid term.</li>
          <li>Refund within 14 days of your first purchase. <Link href="/refunds" className="underline underline-offset-2">Details</Link></li>
        </ul>

        {!orgs?.length ? (
          <form action={createOrganization} className="card mt-8 space-y-4">
            <h2 className="h3">First, name your organisation</h2>
            <div><label htmlFor="org" className="label">Organisation name</label><input id="org" name="name" required className="input" /></div>
            <button className="btn btn-outline btn-lg">Create organisation</button>
            <p className="text-xs text-ink-2">Then come back to <Link className="underline" href={`/app/checkout?brands=${q.brands}&months=${q.durationMonths}`}>checkout</Link>.</p>
          </form>
        ) : (
          <form action={startCheckout} className="mt-8 space-y-4">
            <input type="hidden" name="brands" value={q.brands} />
            <input type="hidden" name="months" value={q.durationMonths} />
            {orgs.length > 1 ? (
              <div>
                <label htmlFor="org" className="label">Organisation</label>
                <select id="org" name="org" className="input">{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
              </div>
            ) : (
              <input type="hidden" name="org" value={orgs[0].id} />
            )}
            <button className="btn btn-accent btn-lg w-full">Pay {formatGBP(q.total)} securely</button>
            <p className="text-center text-xs text-ink-2">Payment is handled by Polar. You&apos;ll receive one invoice for all brands.</p>
          </form>
        )}
      </main>
    </>
  );
}

export default function Checkout({ searchParams }: PageProps<"/app/checkout">) {
  return <Suspense fallback={<div className="p-10 text-sm text-ink-2">Loading…</div>}><Content searchParams={searchParams} /></Suspense>;
}
