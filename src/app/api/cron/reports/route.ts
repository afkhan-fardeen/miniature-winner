import { generateReports } from "@/lib/reports/generate";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Daily job. Mondays build last week's report; the 1st builds last month's.
 * Reports and emails are created once per period, so re-running is safe.
 * `?kind=weekly|monthly&date=YYYY-MM-DD` runs a specific one (testing).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const today = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T08:00:00Z`) : new Date();
  const kinds = (["weekly", "monthly"] as const).filter((k) => {
    const forced = url.searchParams.get("kind");
    if (forced) return forced === k;
    return k === "weekly" ? today.getUTCDay() === 1 : today.getUTCDate() === 1;
  });
  const db = supabaseAdmin();
  const out: Record<string, unknown> = {};
  for (const k of kinds) out[k] = await generateReports(db, k, today);
  return Response.json({ ok: true, ran: kinds, ...out });
}
