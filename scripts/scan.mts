// CLI: npx tsx scripts/scan.mts example.com   (prints a readable summary)
import { parseSite } from "../src/lib/domain";
import { runScan } from "../src/lib/scan";

const site = parseSite(process.argv[2] ?? "");
if (!site) { console.error("Give a public website, e.g. npx tsx scripts/scan.mts example.com"); process.exit(1); }
const r = await runScan(site.url, site.domain);
if (r.fatal) { console.log("FATAL:", r.fatal); process.exit(1); }
console.log(`\n${r.domain}: score ${r.score}/100 (coverage ${r.coverage}%), ${r.durationMs}ms, ${r.pagesFetched.length} pages`);
for (const c of r.categories) console.log(`  ${c.label.padEnd(22)} ${c.score ?? "n/a"} (${c.checked} checks)`);
for (const c of r.checks.filter((k) => k.status === "fail" || k.status === "warn")) console.log(`  ${c.status.toUpperCase().padEnd(5)} ${c.title}: ${c.detail}`);
