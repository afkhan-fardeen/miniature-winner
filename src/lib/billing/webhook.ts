import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Standard Webhooks verification (used by Polar). Fails closed:
 * any missing header, stale timestamp or bad signature returns false.
 * Mirrors the Polar SDK: the signing key may be the UTF-8 bytes of the whole secret
 * or the base64-decoded remainder after "whsec_". Both are tried.
 */
function candidateKeys(secret: string): Buffer[] {
  const utf8 = Buffer.from(secret, "utf8");
  const keys = [utf8];
  const rest = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(rest)) {
    const decoded = Buffer.from(rest, "base64");
    if (decoded.length > 0 && !decoded.equals(utf8)) keys.push(decoded);
  }
  return keys;
}

export function verifyWebhook(
  body: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds) return false;

  const signed = `${id}.${timestamp}.${body}`;
  const expected = candidateKeys(secret).map((key) => createHmac("sha256", key).update(signed).digest());

  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return expected.some((e) => given.length === e.length && timingSafeEqual(given, e));
  });
}
