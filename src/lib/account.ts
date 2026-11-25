import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, type Email } from "@/lib/email/send";
import { welcome, type Rendered } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";

/** Server-only helpers. Every function here expects the service-role client. */
type Admin = SupabaseClient;

export interface Person { userId: string; email: string; firstName: string; emailNotifications: boolean }

export async function getPerson(admin: Admin, userId: string): Promise<Person | null> {
  const { data: u } = await admin.auth.admin.getUserById(userId);
  if (!u?.user?.email) return null;
  const { data: p } = await admin.from("profiles").select("first_name, email_notifications").eq("user_id", userId).maybeSingle();
  return { userId, email: u.user.email, firstName: p?.first_name ?? u.user.email.split("@")[0], emailNotifications: p?.email_notifications ?? true };
}

/** Owners and admins of an organisation. */
export async function orgPeople(admin: Admin, orgId: string): Promise<Person[]> {
  const { data } = await admin.from("organization_members").select("user_id, role").eq("organization_id", orgId).in("role", ["owner", "admin"]);
  const people = await Promise.all((data ?? []).map((m) => getPerson(admin, m.user_id)));
  return people.filter((x): x is Person => !!x);
}

export async function notify(admin: Admin, n: { userId: string; orgId?: string | null; kind: string; title: string; body?: string; href?: string }) {
  const { error } = await admin.from("notifications").insert({
    user_id: n.userId, organization_id: n.orgId ?? null, kind: n.kind, title: n.title, body: n.body ?? null, href: n.href ?? null,
  });
  if (error) console.error("[notify] insert failed:", error.message);
}

/**
 * Sends an email at most once per (person, kind, ref). If sending fails the marker is removed
 * so the next run can retry.
 */
export async function emailOnce(admin: Admin, person: Person, kind: string, ref: string, render: () => Rendered, opts: { respectPreference?: boolean } = {}): Promise<boolean> {
  if (opts.respectPreference && !person.emailNotifications) return false;
  const { error } = await admin.from("email_events").insert({ user_id: person.userId, kind, ref });
  if (error) return false; // unique violation: already sent
  const r = render();
  const email: Email = { to: person.email, subject: r.subject, html: r.html, text: r.text, idempotencyKey: `${kind}:${person.userId}:${ref}`.slice(0, 250), tags: [{ name: "kind", value: kind }] };
  const res = await sendEmail(email);
  if (!res.ok) await admin.from("email_events").delete().eq("user_id", person.userId).eq("kind", kind).eq("ref", ref);
  return res.ok;
}

export const TRIAL_DAYS = 14;

/**
 * Idempotent. Run after a person confirms their email: makes sure they have an organisation and
 * their one free trial licence, and welcomes them the first time.
 */
export async function ensureAccountSetup(admin: Admin, userId: string): Promise<{ orgId: string | null; ready: boolean }> {
  const { data: profile } = await admin.from("profiles").select("first_name, last_name, account_type, company_name").eq("user_id", userId).maybeSingle();
  if (!profile) return { orgId: null, ready: false };

  const { data: existing } = await admin.from("organization_members").select("organization_id").eq("user_id", userId).eq("role", "owner").limit(1).maybeSingle();
  let orgId = existing?.organization_id ?? null;
  if (!orgId) {
    const name = profile.account_type === "work" && profile.company_name ? profile.company_name : `${profile.first_name} ${profile.last_name}`;
    const { data: org, error } = await admin.from("organizations").insert({ name }).select("id").single();
    if (error || !org) { console.error("[account] org create failed:", error?.message); return { orgId: null, ready: false }; }
    await admin.from("organization_members").insert({ organization_id: org.id, user_id: userId, role: "owner" });
    await admin.from("audit_log").insert({ organization_id: org.id, actor_id: userId, action: "organization.created" });
    orgId = org.id;
  }

  const { data: granted } = await admin.rpc("grant_trial", { org: orgId, person: userId, days: TRIAL_DAYS });
  if (granted === true) {
    const person = await getPerson(admin, userId);
    const endsAt = new Date(Date.now() + TRIAL_DAYS * 864e5);
    if (person) await emailOnce(admin, person, "welcome", userId, () => welcome({ firstName: person.firstName, trialEndsAt: endsAt }));
    await notify(admin, { userId, orgId, kind: "trial_started", title: "Your free trial has started", body: `You have one free trial brand for ${TRIAL_DAYS} days.`, href: "/app" });
  }
  return { orgId, ready: true };
}

export function confirmUrl(tokenHash: string, type: "signup" | "magiclink" | "recovery", next = "/app") {
  return `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=${encodeURIComponent(next)}`;
}
