import { emailOnce, getPerson, notify } from "@/lib/account";
import { renewalReminder, trialEnding, trialExpired } from "@/lib/email/templates";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Daily job (Vercel Cron, 08:00 UTC). Sends trial and renewal reminders once each.
 * Vercel calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });

  const db = supabaseAdmin();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const out = { trialEnding: 0, trialExpired: 0, renewals: 0 };

  // Trial ends within 3 days.
  const { data: ending } = await db.from("brand_licenses").select("id, granted_to, organization_id, expires_at")
    .eq("kind", "trial").eq("status", "active").gt("expires_at", iso(now)).lte("expires_at", iso(now + 3 * 864e5));
  for (const l of ending ?? []) {
    const person = l.granted_to ? await getPerson(db, l.granted_to) : null;
    if (!person) continue;
    const endsAt = new Date(l.expires_at!);
    const daysLeft = Math.max(1, Math.ceil((endsAt.getTime() - now) / 864e5));
    if (await emailOnce(db, person, "trial_ending", l.id, () => trialEnding({ firstName: person.firstName, daysLeft, endsAt }), { respectPreference: true })) {
      out.trialEnding++;
      await notify(db, { userId: person.userId, orgId: l.organization_id, kind: "trial_ending", title: `Your free trial ends in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`, href: "/pricing" });
    }
  }

  // Trial ended in the last 3 days.
  const { data: ended } = await db.from("brand_licenses").select("id, granted_to, organization_id")
    .eq("kind", "trial").eq("status", "active").lte("expires_at", iso(now)).gt("expires_at", iso(now - 3 * 864e5));
  for (const l of ended ?? []) {
    const person = l.granted_to ? await getPerson(db, l.granted_to) : null;
    if (!person) continue;
    if (await emailOnce(db, person, "trial_expired", l.id, () => trialExpired({ firstName: person.firstName }), { respectPreference: true })) {
      out.trialExpired++;
      await notify(db, { userId: person.userId, orgId: l.organization_id, kind: "trial_expired", title: "Your free trial has ended", body: "Monitoring is paused. Add a licence to resume.", href: "/pricing" });
    }
  }

  // Renewals in the next 14 days (auto-renewing subscriptions only). Always sent.
  const { data: renewing } = await db.from("subscriptions").select("id, organization_id, quantity, renewal_price_per_brand, expiry_date")
    .eq("status", "active").eq("renewal_status", "auto").gt("expiry_date", iso(now)).lte("expiry_date", iso(now + 14 * 864e5));
  for (const s of renewing ?? []) {
    const { data: members } = await db.from("organization_members").select("user_id").eq("organization_id", s.organization_id).in("role", ["owner", "admin"]);
    for (const m of members ?? []) {
      const person = await getPerson(db, m.user_id);
      if (!person) continue;
      const renewsAt = new Date(s.expiry_date!);
      if (await emailOnce(db, person, "renewal_reminder", `${s.id}:${s.expiry_date}`, () => renewalReminder({ firstName: person.firstName, brands: s.quantity, renewsAt, amount: s.renewal_price_per_brand * s.quantity }))) {
        out.renewals++;
        await notify(db, { userId: person.userId, orgId: s.organization_id, kind: "renewal_reminder", title: "Your subscription renews soon", href: "/app" });
      }
    }
  }
  return Response.json({ ok: true, ...out });
}
