import {
  ArrowRight, BellRing, Bot, Braces, Briefcase, CalendarCheck, Check, FileBarChart, FileText, Gauge, Globe, LayoutGrid, ListChecks,
  Map as MapIcon, Plus, ScanSearch, ShieldAlert, Store, Tag, GitCompareArrows, TrendingUp, Unplug, Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { PricingCalculator } from "@/components/PricingCalculator";
import { StartForm } from "@/components/StartForm";
import { FAQ } from "@/lib/faq";
import type { PriceMode } from "@/lib/pricing";
import { SITE } from "@/lib/site";

const problems = [
  { Icon: Unplug, t: "A crawler you never meant to block", d: "One robots.txt rule, often added by a theme, an app or a developer, can shut out OpenAI's, Anthropic's or Perplexity's search crawlers. Nothing tells you." },
  { Icon: ShieldAlert, t: "Product data machines can't trust", d: "A missing price, a wrong currency or no availability in your Product markup leaves your catalogue unreadable, or misleading, to anything that isn't a person." },
  { Icon: GitCompareArrows, t: "Changes nobody told you about", d: "Theme edits and app installs quietly change canonicals, sitemaps and markup. Klyroo notices the day it happens, not three weeks later." },
];

const checks = [
  { Icon: Bot, t: "AI crawler access", d: "OAI-SearchBot, ChatGPT-User, Claude-SearchBot, PerplexityBot, Googlebot, Applebot and more. Search, assistant and training crawlers are judged separately." },
  { Icon: Braces, t: "Structured data", d: "Product, Offer and Organization markup checked against schema.org and Google's guidelines, ranked critical, warning or note." },
  { Icon: MapIcon, t: "Sitemaps and robots.txt", d: "Is it there, is it valid, does it list your products, and did it change since yesterday." },
  { Icon: Tag, t: "Price and availability", d: "Numeric price, currency code and stock status in your markup, on a sampled product page." },
  { Icon: GitCompareArrows, t: "Changes between scans", d: "What got better and what got worse since the last scan, on the checks that matter." },
  { Icon: FileText, t: "Content and brand signals", d: "Titles, headings, server-rendered text, and consistent organisation details across your pages." },
];

const features = [
  { src: "/product/score.png", w: 960, h: 400, alt: "Klyroo report showing a readiness score of 86 out of 100 with scores for crawler access, structured data, content, technical health and brand consistency", Icon: Gauge, t: "One score. Five areas behind it.", d: "Track a single number, and see exactly which of AI crawler access, structured data, content, technical health or brand consistency is holding it back. Anything we couldn't test is shown as untested, never as passed." },
  { src: "/product/issues.png", w: 960, h: 500, alt: "Klyroo issue list with critical and warning items, each with an explanation and a recommended fix", Icon: ListChecks, t: "Every issue comes with the fix.", d: "Critical problems first. Each one says what we found, where, and exactly what to change, so you can forward it to your developer without a meeting." },
  { src: "/product/history.png", w: 960, h: 290, alt: "Klyroo score history chart across five scans", Icon: TrendingUp, t: "See what your fixes achieved.", d: "Every scan is saved, so you can see which change moved the score, and which day something slipped." },
  { src: "/product/brands.png", w: 1080, h: 790, alt: "Klyroo dashboard listing three brands with scores, verification status and licence usage", Icon: LayoutGrid, t: "Every brand in one place.", d: "Run several stores or look after client sites from one account. Each brand has its own scans, issues and reports, and one invoice covers them all." },
];

const steps = [
  { Icon: Globe, t: "Start your free trial", d: "Create an account with your name and email. No card needed." },
  { Icon: ScanSearch, t: "Add your store", d: "Your first report appears within minutes. Prove you own the site with a meta tag or a DNS record to switch on daily monitoring." },
  { Icon: BellRing, t: "We watch. You get told.", d: "Daily checks, an email when something critical breaks, and a report every week and month." },
];

export default function Home() {
  const mode: PriceMode = process.env.PRICE_MODE === "standard" ? "standard" : "launch";
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <PageShell>
      {/* Hero */}
      <section className="container-x pb-12 pt-16 text-center sm:pt-24">
        <h1 className="display mx-auto max-w-[900px]">AI can&apos;t recommend what it can&apos;t read.</h1>
        <p className="lead mx-auto mt-6 max-w-[660px]">
          Klyroo checks your store every day for the technical problems that stop ChatGPT, Claude, Perplexity and Google&apos;s AI from crawling and understanding your products, and emails you when something breaks.
        </p>
        <div className="mt-10 flex justify-center"><StartForm /></div>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-2">
          {[`${SITE.trialDays} days free, no card needed`, "First report within minutes", "Shopify, WooCommerce, BigCommerce and custom stores"].map((t) => (
            <li key={t} className="flex items-center gap-1.5"><Check size={16} className="text-ok" aria-hidden />{t}</li>
          ))}
        </ul>
        <div className="relative mx-auto mt-14 max-w-[960px] text-left">
          <div className="max-h-[560px] overflow-hidden rounded-xl border border-line">
            <Image src="/product/report.png" width={960} height={1055} alt="Klyroo brand report with a readiness score, score by area and a prioritised list of issues" priority sizes="(min-width: 1024px) 960px, 100vw" className="h-auto w-full" />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-px bottom-px h-24 rounded-b-xl bg-gradient-to-t from-paper to-transparent" />
        </div>
      </section>

      {/* Problem */}
      <section className="section bg-surface">
        <div className="container-x">
          <p className="eyebrow">The problem</p>
          <h2 className="h2 mt-3 max-w-[720px]">Your store can look perfect to shoppers and still be unreadable to AI.</h2>
          <p className="lead mt-4 max-w-[640px]">When an assistant can&apos;t fetch a page or trust its product data, it simply leaves you out. There is no error message and no warning.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {problems.map(({ Icon, t, d }) => (
              <div key={t} className="card">
                <span className="grid size-10 place-items-center rounded-lg bg-muted"><Icon size={20} aria-hidden /></span>
                <h3 className="h3 mt-5">{t}</h3>
                <p className="mt-2 text-ink-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checks */}
      <section id="checks" className="section scroll-mt-16">
        <div className="container-x">
          <p className="eyebrow">What we check</p>
          <h2 className="h2 mt-3 max-w-[700px]">Every check is a plain, documented rule.</h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {checks.map(({ Icon, t, d }) => (
              <div key={t} className="border-t border-ink pt-5">
                <Icon size={24} aria-hidden />
                <h3 className="h3 mt-4">{t}</h3>
                <p className="mt-2 text-ink-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="section scroll-mt-16 bg-surface">
        <div className="container-x">
          <p className="eyebrow">The product</p>
          <h2 className="h2 mt-3 max-w-[640px]">Everything in one clear report.</h2>
          <div className="mt-14 space-y-20">
            {features.map(({ src, w, h, alt, Icon, t, d }, i) => (
              <div key={t} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className={i % 2 ? "lg:order-2" : ""}>
                  <span className="grid size-10 place-items-center rounded-lg bg-acid"><Icon size={20} aria-hidden /></span>
                  <h3 className="h2 mt-5 max-w-[440px]">{t}</h3>
                  <p className="lead mt-4 max-w-[480px]">{d}</p>
                </div>
                <div className="overflow-hidden rounded-xl border border-line bg-paper">
                  <Image src={src} width={w} height={h} alt={alt} sizes="(min-width: 1024px) 540px, 100vw" className="h-auto w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="section">
        <div className="container-x">
          <p className="eyebrow">Built for</p>
          <h2 className="h2 mt-3 max-w-[640px]">Brand owners and the agencies behind them.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              { Icon: Store, t: "Brand owners", h: "Know your store is AI-ready without becoming an SEO expert.", l: ["Daily automated checks", "An email only when something critical is confirmed", "Plain-English fixes you can pass to your developer"] },
              { Icon: Briefcase, t: "Agencies", h: "Look after every client site from one place.", l: ["One account, a separate workspace for each brand", "Weekly and monthly PDF reports to send to clients", "One invoice, and you pay per brand"] },
            ].map(({ Icon, t, h, l }) => (
              <div key={t} className="card flex flex-col p-7">
                <span className="grid size-10 place-items-center rounded-lg bg-acid"><Icon size={20} aria-hidden /></span>
                <div className="mt-5 text-sm text-ink-2">{t}</div>
                <h3 className="h3 mt-1 text-[22px] leading-7">{h}</h3>
                <ul className="mt-5 space-y-2.5">
                  {l.map((x) => <li key={x} className="flex gap-2.5 text-ink-2"><Check size={18} className="mt-1 shrink-0 text-ok" aria-hidden />{x}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="section scroll-mt-16 bg-ink text-paper">
        <div className="container-x">
          <p className="eyebrow text-[#a8a8a4]">How it works</p>
          <h2 className="h2 mt-3 max-w-[640px]">Set up in minutes. Then Klyroo does the watching.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(({ Icon, t, d }, i) => (
              <li key={t}>
                <span className="grid size-11 place-items-center rounded-full bg-acid text-ink"><Icon size={20} aria-hidden /></span>
                <div className="mt-5 text-sm text-[#a8a8a4]">Step {i + 1}</div>
                <h3 className="h3 mt-1">{t}</h3>
                <p className="mt-2 text-[#c9c9c4]">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Alerts */}
      <section className="section">
        <div className="container-x">
          <p className="eyebrow">Alerts and reports</p>
          <h2 className="h2 mt-3 max-w-[700px]">Hear about a problem the day it happens.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { Icon: Zap, t: "Critical alerts", d: "Site down, a crawler blocked, product data broken. Emailed once a second check confirms it, so you don't get false alarms." },
              { Icon: CalendarCheck, t: "Weekly report", d: "Your score, what's new, what's fixed and what to do first, in your inbox every Monday." },
              { Icon: FileBarChart, t: "Monthly PDF", d: "Score history and the most affected pages, ready to forward to your team or your client." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="card">
                <span className="grid size-10 place-items-center rounded-lg bg-acid"><Icon size={20} aria-hidden /></span>
                <h3 className="h3 mt-5">{t}</h3>
                <p className="mt-2 text-ink-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No black box */}
      <section className="section bg-surface">
        <div className="container-x grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">No black box</p>
            <h2 className="h2 mt-3">We show our working.</h2>
            <p className="lead mt-4 max-w-[560px]">Scores come from documented rules based on public standards, not an AI model&apos;s opinion. And we tell you what we don&apos;t measure: where AI mentions you. No honest tool can promise that.</p>
            <Link href="/methodology" className="btn btn-outline btn-lg mt-6">Read the methodology <ArrowRight size={16} aria-hidden /></Link>
          </div>
          <ul className="card space-y-3 text-sm">
            {["Rules from RFC 9309, sitemaps.org, schema.org and vendor crawler documentation", "Weights published, and versioned when they change", "Untested checks are shown as untested, never as passed", "KlyrooBot respects robots.txt"].map((x) => (
              <li key={x} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden />{x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section scroll-mt-16">
        <div className="container-x">
          <p className="eyebrow">Pricing</p>
          <h2 className="h2 mt-3 max-w-[640px]">One licence per brand.</h2>
          <p className="lead mt-4 max-w-[640px]">Try one brand free for {SITE.trialDays} days, no card needed. Then pay per brand for 1, 3, 6 or 12 months. The longer the term, the less you pay each month.</p>
          <div className="mt-10"><PricingCalculator mode={mode} /></div>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-2">
            {[`${SITE.refundDays}-day refund on your first purchase`, "Cancel any time to stop the next renewal", "One invoice for all your brands"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check size={16} className="text-ok" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-surface">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="h2 mt-3">Questions, answered straight.</h2>
            <Link href="/faq" className="btn btn-ghost mt-4">See all questions <ArrowRight size={16} aria-hidden /></Link>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.slice(0, 5).map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg">
                  {f.q}<Plus aria-hidden size={22} className="shrink-0 transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-3 max-w-[60ch] text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-x pb-20 pt-4">
        <div className="rounded-xl bg-acid px-6 py-14 text-center sm:py-20">
          <h2 className="h2 mx-auto max-w-[680px]">Find out what&apos;s stopping AI from reading your store.</h2>
          <p className="mx-auto mt-4 max-w-[480px] text-ink/80">Start your {SITE.trialDays}-day free trial. No card needed.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn btn-primary btn-lg">Start free trial <ArrowRight size={16} aria-hidden /></Link>
            <Link href="/pricing" className="btn btn-outline btn-lg border-ink">See pricing</Link>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </PageShell>
  );
}
