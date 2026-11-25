"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { afterPasswordChange, currentPasswordIsValid } from "@/app/(auth)/actions";
import { ensureAccountSetup } from "@/lib/account";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const enc = encodeURIComponent;
const back = (key: "ok" | "error", msg: string, anchor = ""): never => redirect(`/app/settings?${key}=${enc(msg)}${anchor}`);

async function currentUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  accountType: z.enum(["work", "personal"]),
  companyName: z.string().trim().max(120).optional(),
}).refine((v) => v.accountType !== "work" || !!v.companyName, { message: "Enter your company name", path: ["companyName"] });

export async function saveProfile(formData: FormData) {
  const { user } = await currentUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("error", parsed.error.issues[0].message);
  const v = parsed.data!;
  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").upsert({
    user_id: user.id, first_name: v.firstName, last_name: v.lastName, account_type: v.accountType,
    company_name: v.accountType === "work" ? v.companyName : null,
  });
  if (error) back("error", "We couldn't save your details. Please try again.");
  await ensureAccountSetup(admin, user.id); // covers accounts created before profiles existed
  back("ok", "Your details have been saved.");
}

export async function saveNotifications(formData: FormData) {
  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("profiles").update({
    email_notifications: formData.get("emailNotifications") === "on",
    alert_emails: formData.get("alertEmails") === "on",
  }).eq("user_id", user.id);
  if (error) back("error", "We couldn't save that. Please try again.");
  back("ok", "Your email preferences have been saved.");
}

export async function changePassword(formData: FormData) {
  const { supabase, user } = await currentUser();
  const parsed = z.object({ current: z.string().min(1, "Enter your current password"), next: z.string().min(8, "Use a new password of 8 or more characters").max(200) }).safeParse({ current: formData.get("current"), next: formData.get("next") });
  if (!parsed.success) back("error", parsed.error.issues[0].message);
  if (parsed.data!.current === parsed.data!.next) back("error", "Choose a password you haven't used before.");
  if (!(await currentPasswordIsValid(user.email!, parsed.data!.current))) back("error", "Your current password is incorrect.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data!.next });
  if (error) back("error", "We couldn't update your password. Please try again.");
  await supabase.auth.signOut({ scope: "others" });
  await afterPasswordChange(user.id);
  back("ok", "Password updated. You've been signed out of your other devices.");
}
