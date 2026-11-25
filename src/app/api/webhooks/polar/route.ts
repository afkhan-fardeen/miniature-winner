import { verifyWebhook } from "@/lib/billing/webhook";
import { DURATIONS, STANDARD_PRICES, LAUNCH_PRICES, isDuration } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/server";

// Payload shape follows Polar's subscription events; confirm in sandbox (scripts/polar-sandbox-check.md).
interface PolarSub {
  id: string;
  status?: string;
  seats?: number | null;
  customer_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
}

export async function POST(req: Request) {
  const body = await req.text();
  const ok = verifyWebhook(
    body,
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    process.env.POLAR_WEBHOOK_SECRET ?? "",
  );
  if (!ok) return new Response("invalid signature", { status: 401 });

  const event = JSON.parse(body) as { type: string; data: PolarSub };
  if (!event.type.startsWith("subscription.")) return new Response("ignored", { status: 202 });

  const sub = event.data;
  const db = supabaseAdmin();
  const meta = sub.metadata ?? {};
  const orgId = meta.organization_id;
  const months = Number(meta.duration_months);
  if (!orgId || !isDuration(months) || !DURATIONS.includes(months)) {
    return new Response("missing or invalid metadata", { status: 400 });
  }
  const mode = meta.price_mode === "standard" ? "standard" : "launch";
  const fromMeta = Number.parseInt(meta.brands ?? "", 10);
  const quantity = Math.max(1, Math.min(1000, sub.seats ?? (Number.isFinite(fromMeta) ? fromMeta : 1)));
  const pricePer = (mode === "standard" ? STANDARD_PRICES : LAUNCH_PRICES)[months];

  const ended = event.type === "subscription.revoked";
  // "canceled" in Polar means no next renewal; access continues until revoked / period end.
  const status = ended ? "expired" : sub.status === "past_due" ? "past_due" : ["active", "trialing", "canceled"].includes(sub.status ?? "") ? "active" : "pending";
  const canceling = event.type === "subscription.canceled" || sub.cancel_at_period_end === true;

  const { data: row, error } = await db.from("subscriptions").upsert(
    {
      organization_id: orgId,
      billing_provider: "polar",
      provider_subscription_id: sub.id,
      provider_customer_id: sub.customer_id,
      duration_months: months,
      quantity,
      price_mode: mode,
      price_per_brand: pricePer,
      renewal_price_per_brand: STANDARD_PRICES[months],
      total_amount: pricePer * quantity,
      start_date: sub.current_period_start,
      expiry_date: sub.current_period_end,
      renewal_status: canceling ? "canceled" : "auto",
      status,
    },
    { onConflict: "provider_subscription_id" },
  ).select("id").single();
  if (error || !row) return new Response("db error", { status: 500 });

  // Sync licence rows to the purchased quantity.
  const { data: lic } = await db.from("brand_licenses").select("id, brand_id, status").eq("subscription_id", row.id);
  const active = (lic ?? []).filter((l) => l.status === "active");
  if (ended) {
    await db.from("brand_licenses").update({ status: "expired" }).eq("subscription_id", row.id);
  } else if (active.length < quantity) {
    await db.from("brand_licenses").insert(
      Array.from({ length: quantity - active.length }, () => ({ organization_id: orgId, subscription_id: row.id })),
    );
  } else if (active.length > quantity) {
    const spare = active.filter((l) => !l.brand_id).slice(0, active.length - quantity).map((l) => l.id);
    if (spare.length) await db.from("brand_licenses").delete().in("id", spare);
  }
  await db.from("audit_log").insert({ organization_id: orgId, action: event.type, detail: { subscription: sub.id, quantity } });
  return new Response("ok");
}
