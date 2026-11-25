import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell, Field } from "@/components/AuthShell";
import { supabaseServer } from "@/lib/supabase/server";
import { updatePassword } from "../actions";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/forgot-password?error=${encodeURIComponent("That reset link has expired. Request a new one.")}`);
  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed out of your other devices." error={one(sp.error)}>
      <form action={updatePassword} className="space-y-4">
        <Field label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="-mt-2 text-xs text-ink-2">At least 8 characters.</p>
        <button className="btn btn-primary btn-lg w-full">Update password</button>
      </form>
    </AuthShell>
  );
}

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
