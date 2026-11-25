import { Bell, Settings } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { supabaseServer } from "@/lib/supabase/server";
import { Logo } from "./Logo";

async function unreadCount(): Promise<number> {
  try {
    const supabase = await supabaseServer();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function UnreadCount() {
  const count = await unreadCount();
  if (!count) return null;
  return <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] leading-4 text-paper">{count > 9 ? "9+" : count}</span>;
}

export function AppHeader({ email }: { email?: string | null }) {
  const icon = "relative grid size-10 place-items-center rounded-md hover:bg-muted";
  return (
    <header className="border-b border-line bg-paper">
      <div className="container-x flex h-16 items-center justify-between">
        <Logo href="/app" />
        <div className="flex items-center gap-1 text-sm sm:gap-2">
          <Link href="/pricing" className="mr-2 hidden text-ink-2 hover:text-ink sm:inline">Add licences</Link>
          <Link href="/app/notifications" aria-label="Notifications" className={icon}>
            <Bell size={20} aria-hidden />
            <Suspense fallback={null}><UnreadCount /></Suspense>
          </Link>
          <Link href="/app/settings" aria-label="Settings" className={icon}><Settings size={20} aria-hidden /></Link>
          {email && <span className="mx-2 hidden max-w-[200px] truncate text-ink-2 lg:inline">{email}</span>}
          <form action={logout}><button className="btn btn-outline ml-1">Log out</button></form>
        </div>
      </div>
    </header>
  );
}
