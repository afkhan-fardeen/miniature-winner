/** Sample data for product previews. The brand is fictional (reserved .example domain). */
import { scoreChecks, type Check, type ScanResult } from "./scan";

const c = (id: string, category: Check["category"], title: string, status: Check["status"], severity: Check["severity"], detail: string, recommendation?: string): Check =>
  ({ id, category, title, status, severity, detail, recommendation });

const checks: Check[] = [
  c("k1", "crawlers", "OAI-SearchBot (OpenAI)", "pass", "info", "Allowed. Surfaces your pages in ChatGPT search results."),
  c("k2", "crawlers", "ChatGPT-User (OpenAI)", "pass", "info", "Allowed. Fetches a page when a ChatGPT user asks about it."),
  c("k3", "crawlers", "GPTBot (OpenAI)", "info", "info", "Blocked. Collects content for training OpenAI models. Blocking training crawlers is a common, valid choice and does not affect your score."),
  c("k4", "crawlers", "Claude-SearchBot (Anthropic)", "pass", "info", "Allowed. Surfaces your pages in Claude search results."),
  c("k5", "crawlers", "PerplexityBot (Perplexity)", "fail", "critical", "Blocked by robots.txt. Indexes pages for Perplexity answers.", "Remove the rule that disallows PerplexityBot if you want to be reachable by Perplexity's search product."),
  c("k6", "crawlers", "Googlebot (Google)", "pass", "info", "Allowed. Google Search crawler."),
  c("k7", "crawlers", "Applebot (Apple)", "pass", "info", "Allowed. Apple Search and Siri suggestions."),
  c("s1", "structured", "Product schema", "pass", "info", "Found on /products/trail-jacket."),
  c("s2", "structured", "Offer price", "pass", "info", "Price 129 (6 offers)."),
  c("s3", "structured", "Price currency", "pass", "info", "Currency GBP."),
  c("s4", "structured", "Availability", "fail", "critical", "Availability missing or not a schema.org value.", "Use a schema.org URL such as https://schema.org/InStock."),
  c("s5", "structured", "SKU or GTIN", "warn", "warning", "No SKU, GTIN or MPN.", undefined),
  c("s6", "structured", "Brand association", "pass", "info", "Brand: Northwind Outdoor."),
  c("c1", "content", "Page title", "pass", "info", "“Northwind Outdoor | Technical outerwear” (36 characters)."),
  c("c2", "content", "Meta description", "pass", "info", "148 characters."),
  c("c3", "content", "Main heading (H1)", "pass", "info", "Exactly one H1."),
  c("c4", "content", "Content in server-rendered HTML", "pass", "info", "2,914 characters of readable text before any JavaScript runs."),
  c("c5", "content", "Internal links", "warn", "warning", "7 unique internal link(s) on the homepage."),
  c("t1", "technical", "HTTPS", "pass", "info", "Site is served over HTTPS."),
  c("t2", "technical", "XML sitemap", "pass", "info", "Valid sitemap with 412 URL(s) in the part we read."),
  c("t3", "technical", "Canonical URL", "pass", "info", "Canonical points at this domain."),
  c("t4", "technical", "Response time", "pass", "info", "Homepage responded in 0.9s (from our scanner)."),
  c("b1", "brand", "Organization schema", "pass", "info", "Found: Northwind Outdoor."),
  c("b2", "brand", "Social profile links (sameAs)", "warn", "warning", "No sameAs links to social profiles."),
  c("b3", "brand", "Brand name consistency", "pass", "info", "Organization name matches the page title or site name."),
];

const { categories, score, coverage } = scoreChecks(checks);

export const DEMO_SCAN: ScanResult = {
  site: "https://northwind-outdoor.example",
  domain: "northwind-outdoor.example",
  scannedAt: "2026-11-24T06:00:00.000Z",
  durationMs: 4100,
  pagesFetched: ["https://northwind-outdoor.example", "https://northwind-outdoor.example/robots.txt", "https://northwind-outdoor.example/sitemap.xml", "https://northwind-outdoor.example/products/trail-jacket", "https://northwind-outdoor.example/llms.txt", "https://northwind-outdoor.example/sitemap_products_1.xml"],
  checks, categories, score, coverage,
};

export const DEMO_HISTORY = [
  { at: "2026-10-27T06:00:00.000Z", score: 68 },
  { at: "2026-11-03T06:00:00.000Z", score: 71 },
  { at: "2026-11-10T06:00:00.000Z", score: 71 },
  { at: "2026-11-17T06:00:00.000Z", score: 76 },
  { at: "2026-11-24T06:00:00.000Z", score: score ?? 0 },
];

export const DEMO_ORG = {
  org: { id: "00000000-0000-0000-0000-000000000000", name: "Northwind Holdings" },
  brands: [
    { id: "b1", brand_name: "Northwind Outdoor", website_url: "https://northwind-outdoor.example", domain: "northwind-outdoor.example", verification_status: "verified", verification_token: "x", score: score ?? 0 },
    { id: "b2", brand_name: "Northwind Kids", website_url: "https://northwind-kids.example", domain: "northwind-kids.example", verification_status: "verified", verification_token: "x", score: 91 },
    { id: "b3", brand_name: "Northwind Home", website_url: "https://northwind-home.example", domain: "northwind-home.example", verification_status: "pending", verification_token: "9f3ac2d1e47b", score: null },
  ],
  total: 3, used: 3, free: 0,
  subs: [{ id: "s1", quantity: 3, duration_months: 12, status: "active", expiry_date: "2027-09-14T00:00:00.000Z", renewal_status: "auto" }],
};
