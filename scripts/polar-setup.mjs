// Creates the 8 Klyroo products in Polar and writes their IDs to .env.local. Safe to re-run:
// products already tagged with our metadata key are reused, not duplicated.
// Usage: npm run polar:setup
import { readFileSync, writeFileSync } from "node:fs";

const file = ".env.local";
let text = readFileSync(file, "utf8");
const env = Object.fromEntries(text.split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!env.POLAR_ACCESS_TOKEN) throw new Error("POLAR_ACCESS_TOKEN missing in .env.local");
const server = env.POLAR_SERVER === "production" ? "production" : "sandbox";
const api = server === "production" ? "https://api.polar.sh/v1" : "https://sandbox-api.polar.sh/v1";
const headers = { Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}`, "Content-Type": "application/json" };

// pence per brand for the whole term
const PRICES = { LAUNCH: { 1: 3900, 3: 10500, 6: 19500, 12: 30000 }, STANDARD: { 1: 4900, 3: 13500, 6: 24000, 12: 36000 } };
const TAX = process.env.POLAR_TAX_BEHAVIOR ?? "inclusive"; // price shown = price paid

const call = async (path, init = {}) => {
  const r = await fetch(api + path, { ...init, headers });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${r.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
};

console.log(`Polar ${server}, tax behaviour: ${TAX}`);
const existing = (await call("/products/?limit=100&is_archived=false")).items;
const byKey = new Map(existing.filter((p) => p.metadata?.klyroo_key).map((p) => [p.metadata.klyroo_key, p]));
const ids = {};

for (const mode of ["LAUNCH", "STANDARD"]) for (const m of [1, 3, 6, 12]) {
  const key = `${mode}_${m}M`;
  if (byKey.has(key)) { ids[key] = byKey.get(key).id; console.log("exists ", key); continue; }
  const label = mode === "LAUNCH" ? "" : " (standard)";
  const p = await call("/products/", {
    method: "POST",
    body: JSON.stringify({
      name: `Klyroo ${m === 1 ? "1 month" : `${m} months`}${label}`,
      description: `Klyroo AEO/GEO monitoring. Price per brand for ${m === 1 ? "one month" : `${m} months`}, paid upfront.`,
      recurring_interval: "month",
      recurring_interval_count: m,
      metadata: { klyroo_key: key, price_mode: mode.toLowerCase(), duration_months: String(m) },
      prices: [{
        amount_type: "seat_based",
        price_currency: "gbp",
        tax_behavior: TAX,
        seat_tiers: { seat_tier_type: "volume", tiers: [{ min_seats: 1, max_seats: 1000, price_per_seat: PRICES[mode][m] }] },
      }],
    }),
  });
  ids[key] = p.id;
  console.log("created", key);
}

const set = (k, v) => { text = new RegExp(`^${k}=`, "m").test(text) ? text.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`) : text.replace(/\n*$/, `\n${k}=${v}\n`); };
for (const [key, id] of Object.entries(ids)) set(`POLAR_PRODUCT_${key}`, id);
set("POLAR_SERVER", server);
writeFileSync(file, text);
console.log("IDs written to .env.local (no secrets printed). Next: npm run polar:check");
