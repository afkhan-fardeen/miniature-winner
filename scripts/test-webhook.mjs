// Sends signed fake Polar events to the local webhook and checks the DB. Cleans up after itself.
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const base = process.argv[2] ?? "http://localhost:3000";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let fails = 0;
const check = (n, ok, x = "") => { console.log(ok ? "PASS" : "FAIL", n, ok ? "" : x); if (!ok) fails++; };

async function send(type, data, { sign = true, secret = env.POLAR_WEBHOOK_SECRET } = {}) {
  const body = JSON.stringify({ type, data });
  const id = "msg_" + randomUUID();
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret, "utf8")).update(`${id}.${ts}.${body}`).digest("base64");
  const res = await fetch(`${base}/api/webhooks/polar`, {
    method: "POST",
    headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": ts, ...(sign ? { "webhook-signature": "v1," + sig } : {}) },
    body,
  });
  return res.status;
}

const { data: org } = await admin.from("organizations").insert({ name: "Webhook test org" }).select("id").single();
const subId = "sub_test_" + randomUUID();
const now = Date.now();
const sub = (over = {}) => ({
  id: subId, status: "active", seats: 2, customer_id: "cus_test",
  current_period_start: new Date(now).toISOString(), current_period_end: new Date(now + 365 * 864e5).toISOString(),
  cancel_at_period_end: false,
  metadata: { organization_id: org.id, brands: "2", duration_months: "12", price_mode: "launch" }, ...over,
});
const licences = async () => (await admin.from("brand_licenses").select("id, status").eq("subscription_id", (await row()).id)).data ?? [];
const row = async () => (await admin.from("subscriptions").select("*").eq("provider_subscription_id", subId).single()).data;

try {
  check("rejects unsigned event", (await send("subscription.active", sub(), { sign: false })) === 401);
  check("rejects wrong secret", (await send("subscription.active", sub(), { secret: "whsec_wrong" })) === 401);
  check("ignores non-subscription events", (await send("order.paid", { id: "x" })) === 202);

  check("subscription.active accepted", (await send("subscription.active", sub())) === 200);
  let r = await row();
  check("subscription stored with price contract", r?.quantity === 2 && r.price_per_brand === 30000 && r.renewal_price_per_brand === 36000 && r.total_amount === 60000 && r.status === "active", JSON.stringify(r));
  check("2 licences created", (await licences()).filter((l) => l.status === "active").length === 2);

  await send("subscription.active", sub());
  check("replayed event is idempotent", (await licences()).length === 2);

  await send("subscription.updated", sub({ seats: 3 }));
  check("seat increase adds a licence", (await licences()).filter((l) => l.status === "active").length === 3);

  await send("subscription.canceled", sub({ seats: 3, status: "canceled", cancel_at_period_end: true }));
  r = await row();
  check("cancel stops renewal but keeps access", r.renewal_status === "canceled" && r.status === "active", JSON.stringify(r));

  await send("subscription.revoked", sub({ seats: 3, status: "canceled" }));
  r = await row();
  check("revoke expires subscription and licences", r.status === "expired" && (await licences()).every((l) => l.status === "expired"));

  check("bad metadata rejected", (await send("subscription.active", sub({ id: "sub_bad", metadata: {} }))) === 400);
} catch (e) { console.log("ERROR", e.message); fails++; }
finally {
  await admin.from("organizations").delete().eq("id", org.id);
  console.log(fails ? `\n${fails} FAILED` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
}
