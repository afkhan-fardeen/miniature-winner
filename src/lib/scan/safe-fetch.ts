import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { isBlockedIp } from "./ssrf";

export const BOT_UA = "KlyrooBot/1.0 (+https://useklyroo.com/bot)";

/**
 * Every TCP connection goes through this lookup, so the IP we validate is the IP we connect to.
 * That closes the DNS-rebinding gap that a separate "resolve then fetch" check leaves open.
 */
const agent = new Agent({
  connect: {
    timeout: 8000,
    lookup(hostname, options, callback) {
      dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, "", 4);
        const list = addresses as dns.LookupAddress[];
        if (list.length === 0 || list.some((a) => isBlockedIp(a.address))) {
          return callback(new Error("blocked_address"), "", 4);
        }
        if ((options as { all?: boolean }).all) {
          return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
        }
        return callback(null, list[0].address, list[0].family);
      });
    },
  },
});

export interface FetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  redirects: string[];
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
  ms: number;
  error?: string;
}

function assertPublicUrl(u: URL) {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("unsupported_scheme");
  if (u.username || u.password) throw new Error("credentials_in_url");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("unsupported_port");
  const h = u.hostname.replace(/^\[|\]$/g, "");
  if (isBlockedIpLiteral(h)) throw new Error("blocked_address");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) throw new Error("blocked_address");
}
function isBlockedIpLiteral(h: string) {
  return /^[\d.]+$/.test(h) || h.includes(":") ? isBlockedIp(h) : false;
}

export async function safeFetch(
  url: string,
  opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number; accept?: string } = {},
): Promise<FetchResult> {
  const { maxBytes = 1_500_000, timeoutMs = 9000, maxRedirects = 5, accept = "*/*" } = opts;
  const started = Date.now();
  const redirects: string[] = [];
  let current = url;
  try {
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const u = new URL(current);
      assertPublicUrl(u);
      const res = await undiciFetch(u, {
        method: "GET",
        redirect: "manual",
        dispatcher: agent,
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": BOT_UA, accept, "accept-language": "en" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        redirects.push(current);
        current = new URL(res.headers.get("location")!, u).toString();
        await res.body?.cancel();
        continue;
      }
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      let body = "";
      let truncated = false;
      if (res.body) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { truncated = true; await reader.cancel(); break; }
          chunks.push(value);
        }
        body = Buffer.concat(chunks).toString("utf8");
      }
      return { ok: res.status >= 200 && res.status < 300, status: res.status, finalUrl: current, redirects, headers, body, truncated, ms: Date.now() - started };
    }
    return { ok: false, status: 0, finalUrl: current, redirects, headers: {}, body: "", truncated: false, ms: Date.now() - started, error: "too_many_redirects" };
  } catch (e) {
    const cause = (e as { cause?: { message?: string } }).cause?.message;
    return { ok: false, status: 0, finalUrl: current, redirects, headers: {}, body: "", truncated: false, ms: Date.now() - started, error: cause ?? (e as Error).message };
  }
}
