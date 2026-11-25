import {
  ArrowRight, BellRing, Bot, Braces, CalendarCheck, Check, FileText, FileBarChart, Gauge, Globe, LayoutGrid, ListChecks, Map as MapIcon,
  Plus, ScanSearch, ShieldAlert, Tag, GitCompareArrows, TrendingUp, Unplug, Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { PricingCalculator } from "@/components/PricingCalculator";
import { ScanForm } from "@/components/ScanForm";
import { FAQ } from "@/lib/faq";
import type { PriceMode } from "@/lib/pricing";

const problems = [
  { Icon: Unplug, t: "Crawlers locked out", d: "One robots.txt rule can block OAI-SearchBot, Claude-SearchBot or PerplexityBot. It is easy to do by accident and hard to notice." },
  { Icon: ShieldAlert, t: "Product data machines can't read", d: "A missing price, a wrong currency or no availability in your Product schema leaves your catalogue unreadable." },
  { Icon: GitCompareArrows, t: "Silent changes after updates", d: "Theme edits and app installs change canonicals, sitemaps and markup overnight. You find out weeks later, if at all." },
];

const checks = [
  { Icon: Bot, t: "AI crawler access", d: "OAI-SearchBot, ChatGPT-User, Claude-SearchBot, PerplexityBot, Googlebot, Applebot and more. Search, fetch and training crawlers are judged separately." },
  { Icon: Braces, t: "Structured data", d: "Product, Offer, Organization, BreadcrumbList and FAQPage checked by our own rules and ranked critical, warning or info." },
  { Icon: MapIcon, t: "Sitemaps and robots.txt", d: "Availability, syntax, duplicate or invalid URLs and unexpected edits." },
  { Icon: Tag, t: "Price and availability", d: "Currency, price and stock status in your markup, on every product Klyroo can reach." },
  { Icon: GitCompareArrows, t: "Change detection", d: "Meaningful changes only. Timestamps, banners and tracking parameters are filtered out." },
  { Icon: FileText, t: "llms.txt and brand signals", d: "File health, plus consistency of your organisation name, logo and social links." },
];

const steps = [
  { Icon: Globe, t: "Add your store", d: "Enter your website and prove ownership with a DNS TXT record. No store admin access needed." },
  { Icon: ScanSearch, t: "We baseline it", d: "Klyroo crawls your site, finds your products and records how it looks today." },
  { Icon: BellRing, t: "Alerts and reports", d: "Critical issues reach you straight away. Weekly and monthly reports show your score and what to fix." },
];

const features = [
  { src: "/product/score.png", w: 960, h: 400, alt: "Klyroo report showing a readiness score of 86 out of 100 with scores for crawler access, structured data, content, technical health and brand consistency", Icon: Gauge, t: "Your readiness score, by area", d: "One number to track, with the five areas behind it: AI crawler access, structured data, content, technical health and brand consistency. Areas we couldn't test are shown as untested, never as passed." },
  { src: "/product/issues.png", w: 960, h: 500, alt: "Klyroo issue list with critical and warning items, each with an explanation and a recommended fix", Icon: ListChecks, t: "Every issue comes with the fix", d: "Critical problems first. Each one says what we found, where, and exactly what to change, so your developer or agency can act without a meeting." },
  { src: "/product/history.png", w: 960, h: 290, alt: "Klyroo score history chart across five weekly scans", Icon: TrendingUp, t: "See your score improve over time", d: "Every scan is saved, so you can see which fixes moved the needle and catch the week something slipped." },
  { src: "/product/brands.png", w: 1080, h: 790, alt: "Klyroo organisation dashboard listing three brands with scores, verification status and licence usage", Icon: LayoutGrid, t: "All your brands in one place", d: "Run several stores or manage client sites from one account. Each brand has its own verification, scans, issues and reports, and one invoice covers them all." },
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
        <h1 className="display mx-auto max-w-[860px]">Know if AI can find, read and trust your store.</h1>
        <p className="lead mx-auto mt-6 max-w-[620px]">
          Klyroo checks your website&apos;s technical readiness for AI-powered discovery, alerts you to problems and sends reports. Try it now: it reads your real site in about ten seconds.
        </p>
        <div className="mt-10 flex justify-center"><ScanForm /></div>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-2">
          {["Free, no sign-up", "Reads public pages only", "Shopify, WooCommerce, BigCommerce and custom"].map((t) => (
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
          <p className="eyebrow">Why it matters</p>
          <h2 className="h2 mt-3 max-w-[640px]">AI discovery starts with technical basics.</h2>
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
          <h2 className="h2 mt-3 max-w-[640px]">Everything a machine needs to understand your store.</h2>
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

      {/* How it works */}
      <section id="how-it-works" className="section scroll-mt-16 bg-ink text-paper">
        <div className="container-x">
          <p className="eyebrow text-[#a8a8a4]">How it works</p>
          <h2 className="h2 mt-3 max-w-[640px]">Set it up once. Klyroo does the watching.</h2>
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

      {/* Alerts and reports */}
      <section className="section">
        <div className="container-x">
          <p className="eyebrow">Alerts and reports</p>
          <h2 className="h2 mt-3 max-w-[640px]">Know the moment something breaks. Not weeks later.</h2>
          <p className="lead mt-5 max-w-[640px]">
            Every alert says what changed, where, what it was before and what to do. Critical issues are sent immediately. The rest roll into your reports.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { Icon: Zap, t: "Instant critical alerts", d: "Site down, crawlers blocked, product pages failing. Sent by email the moment we detect them." },
              { Icon: CalendarCheck, t: "Weekly report", d: "Your score, new and resolved issues, and what to fix first, in your inbox every week." },
              { Icon: FileBarChart, t: "Monthly PDF", d: "Score history, coverage and the most affected pages. Easy to forward to your team or client." },
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

      {/* Pricing */}
      <section id="pricing" className="section scroll-mt-16 bg-surface">
        <div className="container-x">
          <p className="eyebrow">Pricing</p>
          <h2 className="h2 mt-3 max-w-[640px]">One platform. All your brands.</h2>
          <p className="lead mt-4 max-w-[620px]">Each brand is one licence. Your first brand is free for 14 days, no card needed. After that, pick how many brands and for how long: the longer the term, the less you pay each month.</p>
          <div className="mt-10"><PricingCalculator mode={mode} /></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
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
      <section className="container-x pb-20">
        <div className="rounded-xl bg-acid px-6 py-14 text-center sm:py-20">
          <h2 className="h2 mx-auto max-w-[620px]">Find out what&apos;s holding your store back.</h2>
          <p className="mx-auto mt-4 max-w-[480px] text-ink/80">Run a free scan now, then let Klyroo watch your site every day.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/scan" className="btn btn-primary btn-lg"><ScanSearch size={18} aria-hidden /> Run a free scan</Link>
            <Link href="/signup" className="btn btn-outline btn-lg border-ink">Start free trial</Link>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </PageShell>
  );
}
