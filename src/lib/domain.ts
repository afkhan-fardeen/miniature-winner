import { isIP } from "node:net";

export interface ParsedSite {
  url: string; // normalised origin, https
  domain: string; // lowercase hostname without www
}

/** Accepts "example.com", "https://www.Example.com/path". Rejects IPs, localhost, internal names. */
export function parseSite(input: string): ParsedSite | null {
  const raw = input.trim();
  if (!raw || raw.length > 253) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(host) || host.startsWith("[")) return null;
  if (host === "localhost" || /\.(local|localhost|internal|lan|home|corp|test|invalid)$/.test(host)) return null;
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return null;
  const domain = host.replace(/^www\./, "");
  return { url: `https://${host}`, domain };
}

export const VERIFY_TXT_PREFIX = "klyroo-verify=";
export function verificationRecordName(domain: string): string {
  return `_klyroo.${domain}`;
}
