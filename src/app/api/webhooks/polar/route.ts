import { verifyWebhook } from "@/lib/billing/webhook";
import { DURATIONS, STANDARD_PRICES, LAUNCH_PRICES, isDuration } from "@/lib/pricing";
import { emailOnce, notify, orgPeople } from "@/lib/account";
import { refundProcessed, subscriptionActive, subscriptionCancelled } from "@/lib/email/templates";
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

  // A full refund ends access, as the refund policy promises.
  if (event.type === "order.refunded") {
    const order = event.data as unknown as { subscription_id?: string | null; status?: string };
    if (order.status === "refunded" && order.subscription_id) return handleRefund(order.subscription_id);
    return new Response("ignored", { status: 202 });
  }
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

  if (!ended) {
    // Attach new paid licences to brands whose trial has ended.
    await db.rpc("assign_free_licences", { org: orgId });
  }
  await sendBillingNotices({ type: event.type, subId: sub.id, orgId, status, quantity, months, total: pricePer * quantity, expiry: sub.current_period_end ?? null, canceling });
  return new Response("ok");
}

async function sendBillingNotices(a: { type: string; subId: string; orgId: string; status: string; quantity: number; months: number; total: number; expiry: string | null; canceling: boolean }) {
  const db = supabaseAdmin();
  try {
    const people = await orgPeople(db, a.orgId);
    if (a.status === "active" && !a.canceling && (a.type === "subscription.active" || a.type === "subscription.created" || a.type === "subscription.updated")) {
      for (const p of people) {
        const sent = await emailOnce(db, p, "sub_active", a.subId, () => subscriptionActive({ firstName: p.firstName, brands: a.quantity, months: a.months, expiresAt: a.expiry ? new Date(a.expiry) : null, total: a.total }));
        if (sent) await notify(db, { userId: p.userId, orgId: a.orgId, kind: "subscription_active", title: "Your licences are active", body: `${a.quantity} brand licence${a.quantity > 1 ? "s" : ""} added.`, href: "/app" });
      }
    }
    if (a.canceling && a.type === "subscription.canceled") {
      for (const p of people) {
        const sent = await emailOnce(db, p, "sub_cancel", `${a.subId}:${a.expiry ?? ""}`, () => subscriptionCancelled({ firstName: p.firstName, accessUntil: a.expiry ? new Date(a.expiry) : null }));
        if (sent) await notify(db, { userId: p.userId, orgId: a.orgId, kind: "subscription_cancelled", title: "Renewal cancelled", body: "You keep access until your paid term ends.", href: "/app" });
      }
    }
  } catch (e) {
    console.error("[webhook] billing notices failed:", e instanceof Error ? e.message : e);
  }
}

async function handleRefund(providerSubscriptionId: string) {
  const db = supabaseAdmin();
  const { data: row } = await db.from("subscriptions").select("id, organization_id").eq("provider_subscription_id", providerSubscriptionId).maybeSingle();
  if (!row) return new Response("unknown subscription", { status: 202 });
  await db.from("subscriptions").update({ status: "expired", renewal_status: "canceled" }).eq("id", row.id);
  await db.from("brand_licenses").update({ status: "expired" }).eq("subscription_id", row.id);
  await db.from("audit_log").insert({ organization_id: row.organization_id, action: "order.refunded", detail: { subscription: providerSubscriptionId } });
  try {
    for (const p of await orgPeople(db, row.organization_id)) {
      const sent = await emailOnce(db, p, "refund", providerSubscriptionId, () => refundProcessed({ firstName: p.firstName }));
      if (sent) await notify(db, { userId: p.userId, orgId: row.organization_id, kind: "refund", title: "Refund processed", body: "The licences from that purchase have ended.", href: "/app" });
    }
  } catch (e) {
    console.error("[webhook] refund notices failed:", e instanceof Error ? e.message : e);
  }
  return new Response("ok");
}
