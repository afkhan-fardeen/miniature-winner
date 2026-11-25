import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Deployment self-check. Protected by CRON_SECRET or the service-role key (Authorization: Bearer ...).
 * Reports only whether settings are present, never their values.
 */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL",
  "POLAR_ACCESS_TOKEN", "POLAR_WEBHOOK_SECRET", "POLAR_ORGANIZATION_ID",
  ...["LAUNCH", "STANDARD"].flatMap((m) => [1, 3, 6, 12].map((t) => `POLAR_PRODUCT_${m}_${t}M`)),
  "RESEND_API_KEY", "EMAIL_FROM", "CRON_SECRET",
];

export async function GET(req: Request) {
  const given = req.headers.get("authorization");
  const allowed = [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY].filter((x): x is string => !!x);
  if (!given || !allowed.some((k) => given === `Bearer ${k}`)) return new Response("unauthorized", { status: 401 });
  const missing = REQUIRED.filter((k) => !process.env[k]);
  let db = false;
  try { db = !(await supabaseAdmin().from("organizations").select("id").limit(1)).error; } catch { /* reported below */ }
  return Response.json({ ok: missing.length === 0 && db, missing, database: db, polarServer: process.env.POLAR_SERVER ?? "sandbox", appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null });
}
