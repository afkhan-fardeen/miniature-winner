import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ScanForm } from "@/components/ScanForm";
import { ScanResultView } from "@/components/ScanResultView";
import { parseSite } from "@/lib/domain";
import { runScan } from "@/lib/scan";
import { allowScan, getCached, putCached } from "@/lib/scan/limit";

export const metadata: Metadata = { title: "Free AI-readiness scan", robots: { index: false } };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Result({ site, expand }: { site: string; expand: boolean }) {
  const parsed = parseSite(site);
  if (!parsed) return <p role="alert" className="alert-error">Enter a public website address such as yourstore.com. IP addresses and local addresses can&apos;t be scanned.</p>;

  let result = getCached(parsed.domain);
  if (!result) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    if (!allowScan(ip)) return <p role="alert" className="alert-error">You&apos;ve run a lot of scans. Please try again in an hour, or create an account to monitor your sites.</p>;
    result = await runScan(parsed.url, parsed.domain);
    if (!result.fatal) putCached(parsed.domain, result);
  }
  return <ScanResultView r={result} expand={expand} />;
}

function Loading({ domain }: { domain: string }) {
  return (
    <div className="card-surface flex items-center gap-4" role="status" aria-live="polite">
      <span className="size-5 animate-spin rounded-full border-2 border-ink border-t-transparent" aria-hidden />
      <div>
        <div>Scanning {domain}…</div>
        <div className="text-sm text-ink-2">Reading robots.txt, sitemap, homepage and a product page. This takes about 5 to 10 seconds.</div>
      </div>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/scan">["searchParams"] }) {
  const sp = await searchParams;
  const site = one(sp.site)?.slice(0, 253) ?? "";
  const expand = one(sp.expand) === "1";
  const parsed = site ? parseSite(site) : null;
  return (
    <section className="container-x max-w-[960px] py-12 sm:py-16">
      <p className="eyebrow">Free scan</p>
      <h1 className="display mt-3">{parsed ? parsed.domain : "How ready is your store for AI discovery?"}</h1>
      {!site && <p className="lead mt-4 max-w-[600px]">Enter your website. We read its public pages and check crawler access, structured data, sitemaps and content. No sign-up.</p>}
      <div className="mt-8"><ScanForm defaultValue={site} size="lg" /></div>
      {site && (
        <div className="mt-10">
          <Suspense key={`${site}-${expand}`} fallback={<Loading domain={parsed?.domain ?? site} />}>
            <Result site={site} expand={expand} />
          </Suspense>
        </div>
      )}
    </section>
  );
}

export default function ScanPage({ searchParams }: PageProps<"/scan">) {
  return (
    <PageShell>
      <Suspense><Content searchParams={searchParams} /></Suspense>
    </PageShell>
  );
}
