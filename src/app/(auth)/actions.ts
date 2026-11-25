"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const creds = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const enc = encodeURIComponent;

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
}

export async function login(formData: FormData) {
  const parsed = creds.safeParse(Object.fromEntries(formData));
  const next = safeNext(formData.get("next"));
  if (!parsed.success) redirect(`/login?error=${enc("Enter a valid email and password")}&next=${enc(next)}`);
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(`/login?error=${enc("Incorrect email or password")}&next=${enc(next)}`);
  redirect(next);
}

export async function signup(formData: FormData) {
  const parsed = creds.safeParse(Object.fromEntries(formData));
  const next = safeNext(formData.get("next"));
  if (!parsed.success) redirect(`/signup?error=${enc("Use a valid email and a password of 8 or more characters")}&next=${enc(next)}`);
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${appUrl()}/auth/callback?next=${enc(next)}` },
  });
  if (error) redirect(`/signup?error=${enc(error.message)}&next=${enc(next)}`);
  if (!data.session) redirect(`/login?message=${enc("Check your email to confirm your account, then log in.")}&next=${enc(next)}`);
  redirect(next);
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect(`/forgot-password?error=${enc("Enter a valid email address")}`);
  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${appUrl()}/auth/callback?next=${enc("/reset-password")}`,
  });
  // Same message whether or not the account exists, so emails can't be enumerated.
  redirect(`/forgot-password?message=${enc("If an account exists for that email, a reset link is on its way.")}`);
}

export async function updatePassword(formData: FormData) {
  const pw = z.string().min(8).max(200).safeParse(formData.get("password"));
  if (!pw.success) redirect(`/reset-password?error=${enc("Use a password of 8 or more characters")}`);
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) redirect(`/reset-password?error=${enc("That reset link has expired. Request a new one.")}`);
  redirect("/app");
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
