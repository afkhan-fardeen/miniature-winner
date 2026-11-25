import { runDueScans } from "@/lib/monitor/schedule";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Hourly job. Scans the next batch of verified, licensed brands that are due (about once a day each),
 * keeps their issues up to date and sends critical alerts.
 * `?brand=<id>&force=1` scans one brand now (testing).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const url = new URL(req.url);
  const out = await runDueScans(supabaseAdmin(), { onlyBrand: url.searchParams.get("brand") ?? undefined, force: url.searchParams.get("force") === "1" });
  return Response.json({ ok: true, ...out });
}
