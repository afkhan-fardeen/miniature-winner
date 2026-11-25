import { describe, expect, it } from "vitest";
import { isAllowed, parseRobots } from "./robots";
import { productFacts, scoreChecks, type Check } from "./index";
import { isBlockedIp } from "./ssrf";

describe("isBlockedIp", () => {
  it("blocks private, loopback, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.9", "172.31.255.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a9fe:a9fe"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"]) expect(isBlockedIp(ip), ip).toBe(false);
  });
  it("refuses non-IP input", () => expect(isBlockedIp("example.com")).toBe(true));
});

describe("robots", () => {
  const r = parseRobots(`
User-agent: *
Disallow: /cart
Disallow: /admin
Allow: /admin/public

User-agent: GPTBot
Disallow: /

User-agent: Googlebot
User-agent: Applebot
Disallow: /private$
Sitemap: https://x.com/sitemap.xml
`);
  it("blocks GPTBot entirely but not others", () => {
    expect(isAllowed(r, "GPTBot", "/")).toBe(false);
    expect(isAllowed(r, "ClaudeBot", "/")).toBe(true);
  });
  it("applies the * group and longest match", () => {
    expect(isAllowed(r, "PerplexityBot", "/cart")).toBe(false);
    expect(isAllowed(r, "PerplexityBot", "/admin/secret")).toBe(false);
    expect(isAllowed(r, "PerplexityBot", "/admin/public/x")).toBe(true);
  });
  it("handles grouped agents and $ anchors", () => {
    expect(isAllowed(r, "Googlebot", "/private")).toBe(false);
    expect(isAllowed(r, "Applebot", "/private/more")).toBe(true);
  });
  it("collects sitemaps and allows everything with no groups", () => {
    expect(r.sitemaps).toEqual(["https://x.com/sitemap.xml"]);
    expect(isAllowed(parseRobots(""), "GPTBot", "/")).toBe(true);
  });
  it("treats empty Disallow as allow-all", () => {
    expect(isAllowed(parseRobots("User-agent: *\nDisallow:"), "GPTBot", "/")).toBe(true);
  });
});

describe("scoreChecks", () => {
  const c = (category: Check["category"], status: Check["status"]): Check => ({ id: Math.random().toString(), category, title: "t", status, severity: "info", detail: "" });
  it("excludes unavailable and info checks and reports coverage", () => {
    const s = scoreChecks([c("crawlers", "pass"), c("crawlers", "fail"), c("structured", "unavailable"), c("technical", "info")]);
    expect(s.categories.find((x) => x.id === "crawlers")!.score).toBe(50);
    expect(s.categories.find((x) => x.id === "structured")!.score).toBeNull();
    expect(s.coverage).toBe(20);
    expect(s.score).toBe(50);
  });
  it("returns null when nothing could be tested", () => {
    expect(scoreChecks([c("crawlers", "unavailable")]).score).toBeNull();
  });
});

describe("productFacts", () => {
  it("reads offers, image and sku from ProductGroup variants", () => {
    const f = productFacts({ "@type": "ProductGroup", name: "Jacket", brand: { name: "Acme" }, hasVariant: [
      { "@type": "Product", sku: "A1", image: "x.jpg", offers: { "@type": "Offer", price: "41.99", priceCurrency: "GBP", availability: "http://schema.org/InStock" } },
      { "@type": "Product", sku: "A2", offers: { "@type": "Offer", price: "41.99", priceCurrency: "GBP", availability: "http://schema.org/OutOfStock" } },
    ] });
    expect(f.offers).toHaveLength(2);
    expect(f.hasImage).toBe(true);
    expect(f.hasId).toBe(true);
    expect(f.brand).toBe("Acme");
  });
  it("flattens AggregateOffer and plain offers", () => {
    expect(productFacts({ offers: { "@type": "AggregateOffer", offers: [{ price: 1 }, { price: 2 }] } }).offers).toHaveLength(2);
    expect(productFacts({ name: "x" }).offers).toHaveLength(0);
  });
});
