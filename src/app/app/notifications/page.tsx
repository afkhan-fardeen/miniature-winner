import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabaseServer } from "@/lib/supabase/server";
import { markAllRead } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

async function Content() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: items } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  const unread = (items ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <AppHeader email={auth.user.email} />
      <main className="container-x max-w-[720px] py-10">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-[32px] leading-9 tracking-[-0.02em]">Notifications</h1>
          {unread > 0 && <form action={markAllRead}><button className="btn btn-outline">Mark all read</button></form>}
        </div>
        {(items ?? []).length === 0 ? (
          <div className="card-surface mt-8 flex flex-col items-center py-14 text-center">
            <BellOff size={28} className="text-ink-2" aria-hidden />
            <p className="mt-3">Nothing here yet.</p>
            <p className="text-sm text-ink-2">We&apos;ll tell you about trials, billing and your scans.</p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-line rounded-xl border border-line">
            {items!.map((n) => {
              const body = (
                <div className="flex gap-3 p-5">
                  <span className={`mt-2 size-2 shrink-0 rounded-full ${n.read_at ? "bg-line" : "bg-ink"}`} aria-label={n.read_at ? "Read" : "Unread"} />
                  <div className="min-w-0">
                    <div>{n.title}</div>
                    {n.body && <p className="text-sm text-ink-2">{n.body}</p>}
                    <p className="mt-1 text-xs text-ink-2">{new Date(n.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</p>
                  </div>
                </div>
              );
              return <li key={n.id}>{n.href ? <Link href={n.href} className="block hover:bg-surface">{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </main>
    </>
  );
}

export default function NotificationsPage() {
  return <Suspense fallback={<div className="p-10 text-sm text-ink-2">Loading…</div>}><Content /></Suspense>;
}
