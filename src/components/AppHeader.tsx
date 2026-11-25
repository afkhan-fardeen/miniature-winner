import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "./Logo";

export function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="container-x flex h-16 items-center justify-between">
        <Logo href="/app" />
        <div className="flex items-center gap-5 text-sm">
          <Link href="/pricing" className="hidden text-ink-2 hover:text-ink sm:inline">Buy licences</Link>
          {email && <span className="hidden text-ink-2 md:inline">{email}</span>}
          <form action={logout}><button className="btn btn-outline">Log out</button></form>
        </div>
      </div>
    </header>
  );
}
