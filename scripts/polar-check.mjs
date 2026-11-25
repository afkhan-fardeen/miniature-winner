// Verifies the 8 Polar products referenced in .env.local exist and match our price table.
// Usage: npm run polar:check   (secrets are read from .env.local and never printed)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const api = env.POLAR_SERVER === "production" ? "https://api.polar.sh/v1" : "https://sandbox-api.polar.sh/v1";
const PRICES = { LAUNCH: { 1: 3900, 3: 10500, 6: 19500, 12: 30000 }, STANDARD: { 1: 4900, 3: 13500, 6: 24000, 12: 36000 } };

if (!env.POLAR_ACCESS_TOKEN) { console.log("POLAR_ACCESS_TOKEN missing"); process.exit(1); }
console.log("server:", env.POLAR_SERVER === "production" ? "PRODUCTION" : "sandbox");
let fails = 0;
const flat = (o) => JSON.stringify(o);

for (const mode of ["LAUNCH", "STANDARD"]) for (const m of [1, 3, 6, 12]) {
  const key = `POLAR_PRODUCT_${mode}_${m}M`;
  const id = env[key];
  if (!id) { console.log("MISSING", key); fails++; continue; }
  const res = await fetch(`${api}/products/${id}`, { headers: { Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}` } });
  if (!res.ok) { console.log("FAIL", key, "HTTP", res.status); fails++; continue; }
  const p = await res.json();
  const want = PRICES[mode][m];
  const problems = [];
  if (p.is_archived) problems.push("archived");
  if (!p.is_recurring) problems.push("not recurring");
  if (p.recurring_interval !== "month") problems.push(`interval=${p.recurring_interval}`);
  if ((p.recurring_interval_count ?? 1) !== m) problems.push(`interval_count=${p.recurring_interval_count}`);
  const seat = (p.prices ?? []).find((x) => x.amount_type === "seat_based");
  if (!seat) problems.push("no seat-based price");
  else {
    if (seat.price_currency !== "gbp") problems.push(`currency=${seat.price_currency}`);
    const tiers = seat.seat_tiers?.tiers ?? [];
    const amt = tiers.length === 1 ? tiers[0].price_per_seat : undefined;
    if (amt !== want) problems.push(`per-seat=${amt ?? flat(tiers)} want ${want}`);
  }
  console.log(problems.length ? "FAIL" : "PASS", key, problems.join("; "));
  if (problems.length) fails++;
}
console.log(fails ? `\n${fails} problem(s)` : "\nAll 8 products match");
process.exit(fails ? 1 : 0);
