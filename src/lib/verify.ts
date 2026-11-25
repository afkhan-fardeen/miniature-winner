import * as cheerio from "cheerio";
import { VERIFY_META_NAME } from "./domain";
import { safeFetch } from "./scan/safe-fetch";

/** True when the page's <head> carries the Klyroo verification meta tag with this exact token. */
export function hasVerificationMeta(html: string, token: string): boolean {
  const $ = cheerio.load(html);
  return $(`head meta[name="${VERIFY_META_NAME}"]`).toArray().some((el) => ($(el).attr("content") ?? "").trim() === token);
}

/** Fetches the homepage (SSRF-guarded) and looks for the meta tag. */
export async function verifyViaMeta(siteUrl: string, token: string): Promise<boolean> {
  const res = await safeFetch(siteUrl, { accept: "text/html", maxBytes: 600_000 });
  return res.ok && hasVerificationMeta(res.body, token);
}
