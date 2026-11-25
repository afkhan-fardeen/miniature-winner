import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "./webhook";

const secret = "test_secret";
const body = '{"type":"subscription.active"}';
const sign = (id: string, ts: string) =>
  "v1," + createHmac("sha256", Buffer.from(secret)).update(`${id}.${ts}.${body}`).digest("base64");

describe("verifyWebhook", () => {
  const now = 1_800_000_000;
  const ts = String(now);
  it("accepts a valid signature", () => {
    expect(verifyWebhook(body, { id: "m1", timestamp: ts, signature: sign("m1", ts) }, secret, now)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyWebhook(body + " ", { id: "m1", timestamp: ts, signature: sign("m1", ts) }, secret, now)).toBe(false);
  });
  it("rejects stale timestamps and missing headers", () => {
    expect(verifyWebhook(body, { id: "m1", timestamp: ts, signature: sign("m1", ts) }, secret, now + 1000)).toBe(false);
    expect(verifyWebhook(body, { id: null, timestamp: ts, signature: sign("m1", ts) }, secret, now)).toBe(false);
  });
  it("accepts a signature made with the base64-decoded whsec_ key", () => {
    const real = "whsec_" + Buffer.from("raw-key-bytes").toString("base64");
    const sig = "v1," + createHmac("sha256", Buffer.from("raw-key-bytes")).update(`m1.${ts}.${body}`).digest("base64");
    expect(verifyWebhook(body, { id: "m1", timestamp: ts, signature: sig }, real, now)).toBe(true);
  });
  it("rejects the wrong secret", () => {
    expect(verifyWebhook(body, { id: "m1", timestamp: ts, signature: sign("m1", ts) }, "other", now)).toBe(false);
  });
});
