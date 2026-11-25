import * as cheerio from "cheerio";
import { CRAWLERS, isAllowed, parseRobots, type ParsedRobots } from "./robots";
import { BOT_UA, safeFetch, type FetchResult } from "./safe-fetch";
import { CATEGORIES, type Check, type CategoryScore, type ScanResult } from "./types";

export * from "./types";

const AVAIL = /^(https?:\/\/schema\.org\/)?(InStock|OutOfStock|PreOrder|PreSale|BackOrder|SoldOut|OnlineOnly|InStoreOnly|LimitedAvailability|Discontinued)$/;
const CURRENCY = /^[A-Z]{3}$/;

type Json = Record<string, unknown>;

function flattenLd(blocks: string[]): { nodes: Json[]; invalid: number } {
  const nodes: Json[] = [];
  let invalid = 0;
  const push = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(push);
    if (n && typeof n === "object") {
      const o = n as Json;
      nodes.push(o);
      if (o["@graph"]) push(o["@graph"]);
    }
  };
  for (const b of blocks) {
    try { push(JSON.parse(b)); } catch { invalid++; }
  }
  return { nodes, invalid };
}
const typesOf = (n: Json): string[] => [n["@type"]].flat().filter((t): t is string => typeof t === "string");
const hasType = (n: Json, t: string) => typesOf(n).includes(t);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const nameOf = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "object" && v ? str((v as Json).name) : "");

/** A ProductGroup keeps price, image and SKU on its variants, so inspect the node and every variant. */
export function productSources(p: Json): Json[] {
  const variants = ([p.hasVariant].flat().filter((v) => v && typeof v === "object") as Json[]).slice(0, 50);
  return [p, ...variants];
}
export function productFacts(p: Json) {
  const sources = productSources(p);
  return {
    offers: sources.flatMap(offersOf),
    hasImage: sources.some((x) => !!x.image),
    hasId: sources.some((x) => ["sku", "gtin", "gtin8", "gtin12", "gtin13", "gtin14", "mpn"].some((k) => str(x[k]) || typeof x[k] === "number")),
    brand: nameOf(p.brand) || sources.map((x) => nameOf(x.brand)).find(Boolean) || "",
  };
}

function offersOf(p: Json): Json[] {
  const raw = p.offers;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Json[];
  const out: Json[] = [];
  for (const o of list) {
    if (o && Array.isArray(o.offers)) out.push(...(o.offers as Json[])); else out.push(o);
  }
  return out;
}

export async function runScan(site: string, domain: string): Promise<ScanResult> {
  const t0 = Date.now();
  const origin = new URL(site).origin;
  const checks: Check[] = [];
  const pages: string[] = [];
  const add = (c: Check) => checks.push(c);

  const [home, robotsRes, llms] = await Promise.all([
    safeFetch(site, { accept: "text/html" }),
    safeFetch(`${origin}/robots.txt`, { maxBytes: 500_000, accept: "text/plain" }),
    safeFetch(`${origin}/llms.txt`, { maxBytes: 200_000, accept: "text/plain" }),
  ]);
  pages.push(site, `${origin}/robots.txt`, `${origin}/llms.txt`);

  if (!home.ok) {
    return {
      site, domain, scannedAt: new Date().toISOString(), durationMs: Date.now() - t0, pagesFetched: pages, checks, categories: [], score: null, coverage: 0,
      fatal: [401, 403, 429, 503].includes(home.status)
        ? `The site refused our scanner (HTTP ${home.status}). Firewalls and bot protection often block unknown crawlers. Allow the KlyrooBot user agent and try again.`
        : home.status
          ? `The homepage returned HTTP ${home.status}.`
          : home.error === "blocked_address"
            ? "That address isn't a public website."
            : "We couldn't reach this website. Check the address and try again.",
    };
  }

  /* ---------------- robots.txt and AI crawlers ---------------- */
  let robots: ParsedRobots | null = null;
  let robotsState: "found" | "missing" | "unavailable" = "unavailable";
  if (robotsRes.ok && robotsRes.body.trim() && !/^\s*</.test(robotsRes.body)) { robots = parseRobots(robotsRes.body); robotsState = "found"; }
  else if (robotsRes.status === 404 || robotsRes.status === 410 || (robotsRes.ok && /^\s*</.test(robotsRes.body))) robotsState = "missing";

  add({
    id: "robots-file", category: "technical", title: "robots.txt", severity: "info",
    status: robotsState === "found" ? "pass" : robotsState === "missing" ? "info" : "unavailable",
    detail: robotsState === "found" ? `Found with ${robots!.groups.length} rule group(s).`
      : robotsState === "missing" ? "No robots.txt. Crawlers are allowed everywhere by default."
      : "We couldn't read robots.txt, so crawler access couldn't be fully tested.",
    url: `${origin}/robots.txt`,
  });

  for (const c of CRAWLERS) {
    if (robotsState === "unavailable") {
      add({ id: `crawler-${c.token}`, category: "crawlers", title: `${c.token} (${c.vendor})`, status: "unavailable", severity: "info", detail: "robots.txt could not be read." });
      continue;
    }
    const allowed = robots ? isAllowed(robots, c.token, "/") : true;
    const training = c.purpose === "training";
    add({
      id: `crawler-${c.token}`, category: "crawlers", title: `${c.token} (${c.vendor})`,
      status: allowed ? "pass" : training ? "info" : "fail",
      severity: allowed || training ? "info" : "critical",
      detail: allowed
        ? `Allowed. ${c.note}.`
        : training
          ? `Blocked. ${c.note}. Blocking training crawlers is a common, valid choice and does not affect your score.`
          : `Blocked by robots.txt. ${c.note}.`,
      url: `${origin}/robots.txt`,
      recommendation: !allowed && !training ? `Remove the rule that disallows ${c.token} if you want to be reachable by ${c.vendor}'s ${c.purpose === "fetch" ? "assistant" : "search"} product.` : undefined,
    });
  }

  /* ---------------- homepage ---------------- */
  const botAllowed = (path: string) => (robots ? isAllowed(robots, "KlyrooBot", path || "/") : true);
  if (!botAllowed(new URL(home.finalUrl).pathname)) {
    return {
      site, domain, scannedAt: new Date().toISOString(), durationMs: Date.now() - t0, pagesFetched: pages, checks, categories: [], score: null, coverage: 0,
      fatal: "Your robots.txt asks KlyrooBot not to read this page, and we respect that. Allow KlyrooBot (see /bot) and scan again.",
    };
  }
  const $ = cheerio.load(home.body);
  const finalHttps = home.finalUrl.startsWith("https://");
  add({ id: "https", category: "technical", title: "HTTPS", status: finalHttps ? "pass" : "fail", severity: finalHttps ? "info" : "critical", detail: finalHttps ? "Site is served over HTTPS." : "The site is served over plain HTTP.", recommendation: finalHttps ? undefined : "Serve every page over HTTPS and redirect HTTP to it." });
  add({ id: "redirects", category: "technical", title: "Redirects to homepage", status: home.redirects.length <= 2 ? "pass" : "warn", severity: home.redirects.length <= 2 ? "info" : "warning", detail: home.redirects.length === 0 ? "No redirects." : `${home.redirects.length} redirect(s) before the page loads.`, recommendation: home.redirects.length > 2 ? "Shorten the redirect chain to one hop." : undefined });
  add({ id: "speed", category: "technical", title: "Response time", status: home.ms < 2500 ? "pass" : "warn", severity: home.ms < 2500 ? "info" : "warning", detail: `Homepage responded in ${(home.ms / 1000).toFixed(1)}s (from our scanner).` });

  const robotsMeta = ($('meta[name="robots"]').attr("content") ?? "").toLowerCase();
  const xRobots = (home.headers["x-robots-tag"] ?? "").toLowerCase();
  const noindex = robotsMeta.includes("noindex") || xRobots.includes("noindex");
  add({ id: "noindex", category: "technical", title: "Indexing directives", status: noindex ? "fail" : "pass", severity: noindex ? "critical" : "info", detail: noindex ? "The homepage is marked noindex." : "No noindex directive on the homepage.", recommendation: noindex ? "Remove the noindex directive from the homepage unless it is intentional." : undefined });

  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) add({ id: "canonical", category: "technical", title: "Canonical URL", status: "warn", severity: "warning", detail: "No canonical link on the homepage.", recommendation: "Add a self-referencing rel=canonical link." });
  else {
    let same = true;
    try { const c = new URL(canonical, home.finalUrl); same = c.hostname.replace(/^www\./, "") === domain; } catch { same = false; }
    add({ id: "canonical", category: "technical", title: "Canonical URL", status: same ? "pass" : "warn", severity: same ? "info" : "warning", detail: same ? "Canonical points at this domain." : `Canonical points elsewhere (${canonical}).`, recommendation: same ? undefined : "Make sure the canonical URL is the page you want discovered." });
  }

  /* ---------------- content readiness ---------------- */
  const title = $("title").first().text().trim();
  add({ id: "title", category: "content", title: "Page title", status: !title ? "fail" : title.length < 15 || title.length > 70 ? "warn" : "pass", severity: !title ? "warning" : title.length < 15 || title.length > 70 ? "warning" : "info", detail: !title ? "No <title>." : `“${title.slice(0, 90)}” (${title.length} characters).`, recommendation: !title ? "Add a descriptive title." : title.length < 15 || title.length > 70 ? "Aim for 15 to 70 characters." : undefined });
  const desc = ($('meta[name="description"]').attr("content") ?? "").trim();
  add({ id: "meta-desc", category: "content", title: "Meta description", status: !desc ? "warn" : "pass", severity: !desc ? "warning" : "info", detail: !desc ? "No meta description." : `${desc.length} characters.`, recommendation: !desc ? "Add a clear one-sentence description of the store." : undefined });
  const h1s = $("h1").length;
  add({ id: "h1", category: "content", title: "Main heading (H1)", status: h1s === 1 ? "pass" : "warn", severity: h1s === 1 ? "info" : "warning", detail: h1s === 0 ? "No H1 found in the server-rendered HTML." : h1s === 1 ? "Exactly one H1." : `${h1s} H1 headings.`, recommendation: h1s === 1 ? undefined : "Use one H1 that says what the page is about." });
  const cleaned = cheerio.load(home.body);
  cleaned("script,style,noscript,template,svg").remove();
  const text = cleaned("body").text().replace(/\s+/g, " ").trim();
  add({ id: "ssr-text", category: "content", title: "Content in server-rendered HTML", status: text.length >= 400 ? "pass" : "warn", severity: text.length >= 400 ? "info" : "warning", detail: `${text.length.toLocaleString("en-GB")} characters of readable text before any JavaScript runs.`, recommendation: text.length >= 400 ? undefined : "Machines that don't run JavaScript see almost nothing. Render key content on the server." });
  const links = new Set<string>();
  $("a[href]").each((_, el) => { try { const u = new URL($(el).attr("href")!, home.finalUrl); if (u.hostname.replace(/^www\./, "") === domain) links.add(u.pathname); } catch { /* ignore */ } });
  add({ id: "internal-links", category: "content", title: "Internal links", status: links.size >= 10 ? "pass" : "warn", severity: links.size >= 10 ? "info" : "warning", detail: `${links.size} unique internal link(s) on the homepage.` });

  /* ---------------- structured data (homepage) ---------------- */
  const homeLd = flattenLd($('script[type="application/ld+json"]').map((_, e) => $(e).text()).get());
  add({ id: "ld-valid", category: "structured", title: "JSON-LD validity (homepage)", status: homeLd.invalid > 0 ? "fail" : homeLd.nodes.length ? "pass" : "warn", severity: homeLd.invalid > 0 ? "warning" : homeLd.nodes.length ? "info" : "warning", detail: homeLd.invalid > 0 ? `${homeLd.invalid} JSON-LD block(s) contain invalid JSON.` : homeLd.nodes.length ? `${homeLd.nodes.length} structured-data item(s): ${[...new Set(homeLd.nodes.flatMap(typesOf))].slice(0, 6).join(", ")}.` : "No JSON-LD structured data on the homepage.", recommendation: homeLd.nodes.length ? undefined : "Add Organization and WebSite structured data." });

  /* ---------------- brand ---------------- */
  const org = homeLd.nodes.find((n) => hasType(n, "Organization") || hasType(n, "Corporation") || hasType(n, "OnlineStore"));
  add({ id: "org-schema", category: "brand", title: "Organization schema", status: org ? "pass" : "warn", severity: org ? "info" : "warning", detail: org ? `Found${nameOf(org.name) ? `: ${nameOf(org.name)}` : ""}.` : "No Organization schema on the homepage.", recommendation: org ? undefined : "Add Organization schema with name, url, logo and social profiles." });
  if (org) {
    add({ id: "org-logo", category: "brand", title: "Organization logo", status: org.logo ? "pass" : "warn", severity: org.logo ? "info" : "warning", detail: org.logo ? "Logo declared." : "Organization has no logo." });
    const sameAs = ([org.sameAs].flat().filter(Boolean) as unknown[]);
    add({ id: "org-sameas", category: "brand", title: "Social profile links (sameAs)", status: sameAs.length ? "pass" : "warn", severity: sameAs.length ? "info" : "warning", detail: sameAs.length ? `${sameAs.length} profile link(s).` : "No sameAs links to social profiles." });
    const nm = nameOf(org.name).toLowerCase();
    const siteName = ($('meta[property="og:site_name"]').attr("content") ?? "").toLowerCase();
    if (nm) {
      const consistent = (siteName && (siteName.includes(nm) || nm.includes(siteName))) || title.toLowerCase().includes(nm);
      add({ id: "name-consistency", category: "brand", title: "Brand name consistency", status: consistent ? "pass" : "warn", severity: consistent ? "info" : "warning", detail: consistent ? "Organization name matches the page title or site name." : "Organization name doesn't appear in the page title or og:site_name." });
    }
  }

  /* ---------------- sitemap ---------------- */
  const sitemapCandidates = [...(robots?.sitemaps ?? []), `${origin}/sitemap.xml`];
  let sitemapUrls: string[] = [];
  let sitemapOk = false;
  let sitemapUrl = "";
  for (const s of [...new Set(sitemapCandidates)].slice(0, 3)) {
    const r = await safeFetch(s, { maxBytes: 3_000_000, accept: "application/xml,text/xml" });
    pages.push(s);
    if (!r.ok || !/<(urlset|sitemapindex)[\s>]/i.test(r.body)) continue;
    const x = cheerio.load(r.body, { xmlMode: true });
    let locs = x("loc").map((_, e) => x(e).text().trim()).get();
    if (/<sitemapindex/i.test(r.body)) {
      const child = locs.find((l) => /product/i.test(l)) ?? locs[0];
      if (child) {
        const cr = await safeFetch(child, { maxBytes: 3_000_000, accept: "application/xml,text/xml" });
        pages.push(child);
        if (cr.ok) { const cx = cheerio.load(cr.body, { xmlMode: true }); locs = cx("loc").map((_, e) => cx(e).text().trim()).get(); }
      }
    }
    sitemapUrls = locs; sitemapOk = true; sitemapUrl = s; break;
  }
  add({ id: "sitemap", category: "technical", title: "XML sitemap", status: sitemapOk ? "pass" : "fail", severity: sitemapOk ? "info" : "critical", detail: sitemapOk ? `Valid sitemap with ${sitemapUrls.length.toLocaleString("en-GB")} URL(s) in the part we read.` : "No valid sitemap found at the robots.txt location or /sitemap.xml.", url: sitemapUrl || `${origin}/sitemap.xml`, recommendation: sitemapOk ? undefined : "Publish an XML sitemap and reference it in robots.txt." });
  const dupes = sitemapUrls.length - new Set(sitemapUrls).size;
  if (sitemapOk && dupes > 0) add({ id: "sitemap-dupes", category: "technical", title: "Sitemap duplicates", status: "warn", severity: "warning", detail: `${dupes} duplicate URL(s) in the sitemap.` });

  /* ---------------- llms.txt ---------------- */
  const llmsOk = llms.ok && llms.body.trim().length > 0 && !/^\s*</.test(llms.body);
  add({ id: "llms", category: "technical", title: "llms.txt", status: "info", severity: "info", detail: llmsOk ? `Present (${llms.body.length.toLocaleString("en-GB")} characters).` : "Not present. It is optional and not a confirmed ranking factor.", url: `${origin}/llms.txt` });

  /* ---------------- a product page ---------------- */
  const homeProductLink = [...links].find((p) => /\/products?\//.test(p));
  const productUrl = sitemapUrls.find((u) => /\/products?\//.test(u)) ?? (homeProductLink ? `${origin}${homeProductLink}` : undefined);
  if (productUrl && !botAllowed(new URL(productUrl).pathname)) {
    add({ id: "product-schema", category: "structured", title: "Product schema", status: "unavailable", severity: "info", detail: "Your robots.txt asks KlyrooBot not to read product pages, so we skipped them.", url: productUrl });
  } else if (!productUrl) {
    for (const id of ["product-schema"]) add({ id, category: "structured", title: "Product schema", status: "unavailable", severity: "info", detail: "We couldn't find a product page to test." });
  } else {
    const pr = await safeFetch(productUrl, { accept: "text/html" });
    pages.push(productUrl);
    if (!pr.ok) {
      add({ id: "product-schema", category: "structured", title: "Product schema", status: "unavailable", severity: "info", detail: `The product page returned ${pr.status || "an error"}.`, url: productUrl });
    } else {
      const p$ = cheerio.load(pr.body);
      const ld = flattenLd(p$('script[type="application/ld+json"]').map((_, e) => p$(e).text()).get());
      const product = ld.nodes.find((n) => hasType(n, "Product")) ?? ld.nodes.find((n) => hasType(n, "ProductGroup"));
      const u = productUrl;
      if (!product) {
        add({ id: "product-schema", category: "structured", title: "Product schema", status: "fail", severity: "critical", detail: "No Product structured data on a product page.", url: u, recommendation: "Add Product JSON-LD with name, image, brand, price, currency and availability." });
      } else {
        add({ id: "product-schema", category: "structured", title: "Product schema", status: "pass", severity: "info", detail: `Found on ${new URL(u).pathname}.`, url: u });
        add({ id: "p-name", category: "structured", title: "Product name", status: str(product.name) ? "pass" : "fail", severity: str(product.name) ? "info" : "critical", detail: str(product.name) ? `“${str(product.name).slice(0, 80)}”` : "Product has no name.", url: u });
        const facts = productFacts(product);
        add({ id: "p-image", category: "structured", title: "Product image", status: facts.hasImage ? "pass" : "warn", severity: facts.hasImage ? "info" : "warning", detail: facts.hasImage ? "Image declared." : "No image in Product schema.", url: u });
        add({ id: "p-brand", category: "structured", title: "Brand association", status: facts.brand ? "pass" : "warn", severity: facts.brand ? "info" : "warning", detail: facts.brand ? `Brand: ${facts.brand}.` : "No brand on the product.", url: u });
        add({ id: "p-sku", category: "structured", title: "SKU or GTIN", status: facts.hasId ? "pass" : "warn", severity: facts.hasId ? "info" : "warning", detail: facts.hasId ? "Product identifier present." : "No SKU, GTIN or MPN.", url: u });
        const offers = facts.offers;
        const priceOf = (o: Json) => Number(o.price ?? (o.priceSpecification as Json | undefined)?.price ?? o.lowPrice);
        const priced = offers.filter((o) => Number.isFinite(priceOf(o)) && priceOf(o) > 0);
        add({ id: "p-price", category: "structured", title: "Offer price", status: priced.length ? "pass" : "fail", severity: priced.length ? "info" : "critical", detail: priced.length ? `Price ${priceOf(priced[0])}${offers.length > 1 ? ` (${offers.length} offers)` : ""}.` : offers.length ? "Offer has no valid price." : "No offer on the product.", url: u, recommendation: priced.length ? undefined : "Add offers.price as a number." });
        const cur = priced.map((o) => str(o.priceCurrency) || str((o.priceSpecification as Json | undefined)?.priceCurrency));
        add({ id: "p-currency", category: "structured", title: "Price currency", status: cur.length && cur.every((c) => CURRENCY.test(c)) ? "pass" : "fail", severity: cur.length && cur.every((c) => CURRENCY.test(c)) ? "info" : "critical", detail: cur[0] ? `Currency ${cur[0]}.` : "Missing or invalid priceCurrency.", url: u, recommendation: "Use a 3-letter ISO 4217 code such as GBP." });
        const av = offers.map((o) => str(o.availability));
        add({ id: "p-availability", category: "structured", title: "Availability", status: av.length && av.every((a) => AVAIL.test(a)) ? "pass" : "fail", severity: av.length && av.every((a) => AVAIL.test(a)) ? "info" : "critical", detail: av[0] ? `Availability: ${av[0].replace("https://schema.org/", "")}.` : "Availability missing or not a schema.org value.", url: u, recommendation: "Use a schema.org URL such as https://schema.org/InStock." });
        add({ id: "p-rating", category: "structured", title: "Ratings", status: "info", severity: "info", detail: product.aggregateRating ? "AggregateRating present." : "No AggregateRating (optional).", url: u });
      }
      const crumbs = ld.nodes.some((n) => hasType(n, "BreadcrumbList"));
      add({ id: "breadcrumbs", category: "structured", title: "BreadcrumbList", status: "info", severity: "info", detail: crumbs ? "Present on the product page." : "Not present on the product page (optional).", url: u });
    }
  }

  const { categories, score, coverage } = scoreChecks(checks);
  return { site, domain, scannedAt: new Date().toISOString(), durationMs: Date.now() - t0, pagesFetched: [...new Set(pages)], checks, categories, score, coverage };
}

const POINTS: Record<string, number> = { pass: 1, warn: 0.5, fail: 0 };

/** Categories with no testable checks are reported as unavailable, never as passed. */
export function scoreChecks(checks: Check[]): { categories: CategoryScore[]; score: number | null; coverage: number } {
  const categories: CategoryScore[] = CATEGORIES.map((c) => {
    const scored = checks.filter((k) => k.category === c.id && k.status in POINTS);
    const score = scored.length ? Math.round((scored.reduce((s, k) => s + POINTS[k.status], 0) / scored.length) * 100) : null;
    return { ...c, score, checked: scored.length };
  });
  const tested = categories.filter((c) => c.score !== null);
  const weight = tested.reduce((s, c) => s + c.weight, 0);
  const score = weight ? Math.round(tested.reduce((s, c) => s + c.score! * c.weight, 0) / weight) : null;
  return { categories, score, coverage: weight };
}

export function bandFor(score: number): { label: string; tone: "ok" | "warn" | "crit" } {
  if (score >= 90) return { label: "Excellent technical readiness", tone: "ok" };
  if (score >= 75) return { label: "Good, with improvements recommended", tone: "ok" };
  if (score >= 60) return { label: "Issues require attention", tone: "warn" };
  if (score >= 40) return { label: "Significant technical problems", tone: "crit" };
  return { label: "Critical technical problems", tone: "crit" };
}
export { BOT_UA };
export type { FetchResult };
