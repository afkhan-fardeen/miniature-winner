import { describe, expect, it } from "vitest";
import { hasVerificationMeta } from "./verify";

describe("hasVerificationMeta", () => {
  const page = (head: string) => `<!doctype html><html><head>${head}</head><body><meta name="klyroo-site-verification" content="abc123"></body></html>`;
  it("accepts the exact token in the head", () => {
    expect(hasVerificationMeta(page('<title>x</title><meta name="klyroo-site-verification" content="abc123">'), "abc123")).toBe(true);
  });
  it("rejects a wrong token, a missing tag, and a tag outside the head", () => {
    expect(hasVerificationMeta(page('<meta name="klyroo-site-verification" content="nope">'), "abc123")).toBe(false);
    expect(hasVerificationMeta(page("<title>x</title>"), "abc123")).toBe(false);
  });
  it("ignores other meta tags with the same content", () => {
    expect(hasVerificationMeta(page('<meta name="description" content="abc123">'), "abc123")).toBe(false);
  });
});
