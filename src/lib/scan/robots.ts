/** Configurable registry. Search, fetch and training crawlers are NOT equivalent. */
export type CrawlerPurpose = "search" | "fetch" | "training";
export interface Crawler { token: string; vendor: string; purpose: CrawlerPurpose; note: string }

export const CRAWLERS: Crawler[] = [
  { token: "OAI-SearchBot", vendor: "OpenAI", purpose: "search", note: "Surfaces your pages in ChatGPT search results" },
  { token: "ChatGPT-User", vendor: "OpenAI", purpose: "fetch", note: "Fetches a page when a ChatGPT user asks about it" },
  { token: "GPTBot", vendor: "OpenAI", purpose: "training", note: "Collects content for training OpenAI models" },
  { token: "Claude-SearchBot", vendor: "Anthropic", purpose: "search", note: "Surfaces your pages in Claude search results" },
  { token: "ClaudeBot", vendor: "Anthropic", purpose: "training", note: "Collects content for training Anthropic models" },
  { token: "PerplexityBot", vendor: "Perplexity", purpose: "search", note: "Indexes pages for Perplexity answers" },
  { token: "Googlebot", vendor: "Google", purpose: "search", note: "Google Search crawler" },
  { token: "Google-Extended", vendor: "Google", purpose: "training", note: "Controls use of your content for Gemini training" },
  { token: "Applebot", vendor: "Apple", purpose: "search", note: "Apple Search and Siri suggestions" },
];

interface Rule { allow: boolean; pattern: string }
interface Group { agents: string[]; rules: Rule[] }
export interface ParsedRobots { groups: Group[]; sitemaps: string[] }

export function parseRobots(text: string): ParsedRobots {
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  let cur: Group | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      if (cur) cur.rules.push({ allow: key === "allow", pattern: val });
    } else if (key === "sitemap") {
      sitemaps.push(val);
    } else {
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

function patternToRegex(p: string): RegExp {
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

/** RFC 9309: most specific group for the agent, else "*"; longest matching rule wins, Allow wins ties. */
export function isAllowed(robots: ParsedRobots, userAgent: string, path: string): boolean {
  const ua = userAgent.toLowerCase();
  let group = robots.groups.find((g) => g.agents.includes(ua));
  if (!group) {
    // product-token prefix match (e.g. "googlebot" group for "googlebot-image")
    group = robots.groups.find((g) => g.agents.some((a) => a !== "*" && ua.startsWith(a)));
  }
  group ??= robots.groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  let best: { len: number; allow: boolean } | null = null;
  for (const r of group.rules) {
    if (r.pattern === "") { continue; } // empty Disallow = allow all
    if (!patternToRegex(r.pattern).test(path)) continue;
    const len = r.pattern.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow };
  }
  return best ? best.allow : true;
}
