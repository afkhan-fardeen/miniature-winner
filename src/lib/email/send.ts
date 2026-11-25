export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Resend de-duplicates sends that share a key for 24h. */
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}

export interface SendResult { ok: boolean; id?: string; error?: string }

const FROM = () => process.env.EMAIL_FROM ?? "Klyroo <hello@useklyroo.com>";
const REPLY_TO = () => process.env.EMAIL_REPLY_TO ?? "support@useklyroo.com";

/** Sends through Resend. Never throws: callers decide whether a failure matters. */
export async function sendEmail(e: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set; skipped "${e.subject}"`);
    return { ok: false, error: "email_not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(e.idempotencyKey ? { "Idempotency-Key": e.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: FROM(), to: [e.to], reply_to: REPLY_TO(), subject: e.subject, html: e.html, text: e.text, tags: e.tags }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.error(`[email] Resend ${res.status} for "${e.subject}": ${body.message ?? "unknown error"}`);
      return { ok: false, error: body.message ?? `http_${res.status}` };
    }
    return { ok: true, id: body.id };
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "network_error" };
  }
}
