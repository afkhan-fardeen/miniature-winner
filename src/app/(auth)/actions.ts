"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { confirmUrl, emailOnce, ensureAccountSetup, getPerson, notify } from "@/lib/account";
import { sendEmail } from "@/lib/email/send";
import { confirmEmail, passwordChanged, resetPassword } from "@/lib/email/templates";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const enc = encodeURIComponent;
const bucket = (minutes: number) => String(Math.floor(Date.now() / (minutes * 60_000)));

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
}

/* ---------------------------------------------------------------- sign up */

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  accountType: z.enum(["work", "personal"], { message: "Choose work or personal" }),
  companyName: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Use a password of 8 or more characters").max(200),
  terms: z.literal("on", { message: "Please accept the Terms and Privacy Policy" }),
}).refine((v) => v.accountType !== "work" || !!v.companyName, { message: "Enter your company name", path: ["companyName"] });

export async function signup(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/signup?error=${enc(parsed.error.issues[0].message)}&next=${enc(next)}`);
  const v = parsed.data;

  const admin = supabaseAdmin();
  // Creates the (unconfirmed) user without Supabase sending its own email; we send ours through Resend.
  const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email: v.email, password: v.password, options: { data: { first_name: v.firstName, last_name: v.lastName } } });
  if (error || !data?.user || !data.properties?.hashed_token) {
    const exists = /already|exists|registered/i.test(error?.message ?? "");
    redirect(`/signup?error=${enc(exists ? "An account with this email already exists. Log in, or reset your password." : "We couldn't create your account. Please try again.")}&next=${enc(next)}`);
  }

  await admin.from("profiles").upsert({
    user_id: data.user.id, first_name: v.firstName, last_name: v.lastName, account_type: v.accountType,
    company_name: v.accountType === "work" ? v.companyName : null,
  });

  const mail = confirmEmail({ firstName: v.firstName, url: confirmUrl(data.properties.hashed_token, "signup", next) });
  const sent = await sendEmail({ to: v.email, ...mail, tags: [{ name: "kind", value: "confirm" }] });
  if (!sent.ok) redirect(`/signup/check-email?email=${enc(v.email)}&problem=1`);
  redirect(`/signup/check-email?email=${enc(v.email)}`);
}

export async function resendConfirmation(formData: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) redirect("/login?error=" + enc("Enter a valid email address"));
  const admin = supabaseAdmin();
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email: email.data });
  if (data?.user && !data.user.email_confirmed_at && data.properties?.hashed_token) {
    const person = await getPerson(admin, data.user.id);
    if (person) {
      await emailOnce(admin, person, "confirm_resend", bucket(2), () => confirmEmail({ firstName: person.firstName, url: confirmUrl(data.properties.hashed_token, "magiclink") }));
    }
  }
  // Same answer whether or not the address has an unconfirmed account.
  redirect(`/signup/check-email?email=${enc(email.data)}&resent=1`);
}

/* ------------------------------------------------------------------ log in */

export async function login(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/login?error=${enc("Enter your email and password")}&next=${enc(next)}`);
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") redirect(`/login?error=unconfirmed&email=${enc(parsed.data.email)}&next=${enc(next)}`);
    redirect(`/login?error=${enc("Incorrect email or password")}&next=${enc(next)}`);
  }
  await ensureAccountSetup(supabaseAdmin(), data.user.id); // idempotent safety net
  redirect(next);
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}

/* ----------------------------------------------- email links (confirm/reset) */

/** The emailed link opens a page with a button, so mail scanners that pre-open links can't use up the token. */
export async function confirmToken(formData: FormData) {
  const parsed = z.object({ token_hash: z.string().min(10).max(500), type: z.enum(["signup", "magiclink", "recovery"]) }).safeParse(Object.fromEntries(formData));
  const next = safeNext(formData.get("next"));
  if (!parsed.success) redirect("/login?error=" + enc("That link is invalid or has expired."));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ type: parsed.data.type, token_hash: parsed.data.token_hash });
  if (error || !data.user) {
    redirect(`/login?error=${enc("That link is invalid or has expired. Request a new one.")}`);
  }
  if (parsed.data.type === "recovery") redirect("/reset-password");
  await ensureAccountSetup(supabaseAdmin(), data.user.id);
  redirect(next === "/app" ? "/app?welcome=1" : next);
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) redirect(`/forgot-password?error=${enc("Enter a valid email address")}`);
  const admin = supabaseAdmin();
  const { data } = await admin.auth.admin.generateLink({ type: "recovery", email: email.data });
  if (data?.user && data.properties?.hashed_token) {
    const person = await getPerson(admin, data.user.id);
    if (person) await emailOnce(admin, person, "password_reset", bucket(2), () => resetPassword({ firstName: person.firstName, url: confirmUrl(data.properties.hashed_token, "recovery", "/reset-password") }));
  }
  // Same message whether or not the account exists, so addresses can't be probed.
  redirect(`/forgot-password?message=${enc("If an account exists for that email, a reset link is on its way. It expires in 1 hour.")}`);
}

const newPassword = z.string().min(8, "Use a password of 8 or more characters").max(200);

export async function updatePassword(formData: FormData) {
  const pw = newPassword.safeParse(formData.get("password"));
  if (!pw.success) redirect(`/reset-password?error=${enc(pw.error.issues[0].message)}`);
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/forgot-password?error=${enc("That reset link has expired. Request a new one.")}`);
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) redirect(`/reset-password?error=${enc(error.message.includes("different") ? "Choose a password you haven't used before." : "We couldn't update your password. Request a new link.")}`);
  await supabase.auth.signOut({ scope: "others" });
  await afterPasswordChange(auth.user.id);
  redirect(`/app?ok=${enc("Your password has been updated.")}`);
}

/** Security notice by email plus an in-app notification. Always sent. */
export async function afterPasswordChange(userId: string) {
  const admin = supabaseAdmin();
  const person = await getPerson(admin, userId);
  if (!person) return;
  const mail = passwordChanged({ firstName: person.firstName, when: new Date() });
  await sendEmail({ to: person.email, ...mail, tags: [{ name: "kind", value: "password_changed" }] });
  await notify(admin, { userId, kind: "password_changed", title: "Your password was changed", href: "/app/settings" });
}

/** Verifies the current password without touching the signed-in session. */
export async function currentPasswordIsValid(email: string, password: string): Promise<boolean> {
  const probe = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}
