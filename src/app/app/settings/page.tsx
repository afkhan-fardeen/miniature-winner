import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { SettingsProfileFields } from "@/components/SettingsProfileFields";
import { supabaseServer } from "@/lib/supabase/server";
import { changePassword, saveNotifications, saveProfile } from "./actions";

export const metadata: Metadata = { title: "Settings" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/app/settings">["searchParams"] }) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
  const error = one(sp.error);
  const ok = one(sp.ok);

  return (
    <>
      <AppHeader email={auth.user.email} />
      <main className="container-x max-w-[720px] py-10">
        <h1 className="text-[32px] leading-9 tracking-[-0.02em]">Settings</h1>
        <div className="mt-6 space-y-3" aria-live="polite">
          {!profile && <p className="alert-error">Tell us a little about you to finish setting up your account and start your free trial.</p>}
          {error && <p role="alert" className="alert-error">{error}</p>}
          {ok && <p role="status" className="alert-ok">{ok}</p>}
        </div>

        <section className="card mt-8" aria-labelledby="profile">
          <h2 id="profile" className="h3">Your details</h2>
          <form action={saveProfile} className="mt-5 space-y-4">
            <SettingsProfileFields profile={profile ? { firstName: profile.first_name, lastName: profile.last_name, accountType: profile.account_type, companyName: profile.company_name ?? "" } : undefined} />
            <div>
              <label htmlFor="acct-email" className="label">Email</label>
              <input id="acct-email" className="input" value={auth.user.email ?? ""} readOnly disabled />
            </div>
            <button className="btn btn-primary btn-lg">Save details</button>
          </form>
        </section>

        <section className="card mt-6" aria-labelledby="notifs">
          <h2 id="notifs" className="h3">Email notifications</h2>
          <form action={saveNotifications} className="mt-5 space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="emailNotifications" defaultChecked={profile?.email_notifications ?? true} className="mt-1 size-4 accent-ink" />
              <span>Reminder emails<br /><span className="text-ink-2">Trial ending and similar nudges. Security, billing and renewal emails are always sent.</span></span>
            </label>
            <button className="btn btn-outline btn-lg">Save</button>
          </form>
        </section>

        <section id="password" className="card mt-6 scroll-mt-24" aria-labelledby="pw">
          <h2 id="pw" className="h3">Change password</h2>
          <form action={changePassword} className="mt-5 space-y-4">
            <div><label htmlFor="cur" className="label">Current password</label><input id="cur" name="current" type="password" required autoComplete="current-password" className="input" /></div>
            <div><label htmlFor="new" className="label">New password</label><input id="new" name="next" type="password" required minLength={8} autoComplete="new-password" className="input" /></div>
            <button className="btn btn-outline btn-lg">Update password</button>
          </form>
        </section>
      </main>
    </>
  );
}

export default function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  return <Suspense fallback={<div className="p-10 text-sm text-ink-2">Loading…</div>}><Content searchParams={searchParams} /></Suspense>;
}
