import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PricingCalculator } from "@/components/PricingCalculator";
import type { PriceMode } from "@/lib/pricing";

export const metadata: Metadata = { title: "Pricing", description: "One platform, all your brands. Per-brand pricing with 1, 3, 6 and 12-month terms." };

export default function PricingPage() {
  const mode: PriceMode = process.env.PRICE_MODE === "standard" ? "standard" : "launch";
  return (
    <PageShell>
      <section className="container-x py-16 sm:py-20">
        <p className="eyebrow">Pricing</p>
        <h1 className="display mt-3 max-w-[760px]">One platform. All your brands.</h1>
        <p className="lead mt-5 max-w-[620px]">
          Monitor every brand&apos;s AEO/GEO technical readiness from one place with automated alerts, continuous checks and actionable reports.
        </p>
        <div className="mt-12"><PricingCalculator mode={mode} /></div>
        <ul className="mt-12 grid gap-4 text-sm text-ink-2 sm:grid-cols-3">
          <li className="card">Every plan includes every feature. Only brands and term change.</li>
          <li className="card">Add brands any time. You pay pro rata and they renew with the rest.</li>
          <li className="card">One organisation, one invoice, however many brands you monitor.</li>
        </ul>
      </section>
    </PageShell>
  );
}
