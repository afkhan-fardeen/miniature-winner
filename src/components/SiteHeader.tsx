import Link from "next/link";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <div><Logo /></div>
        <nav aria-label="Main" className="hidden items-center gap-8 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-ink-2 transition-colors hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        <div className="col-start-3 flex items-center justify-end gap-5">
          <Link href="/login" className="hidden text-sm underline-offset-4 hover:underline md:inline">Log in</Link>
          <Link href="/signup" className="btn btn-accent hidden md:inline-flex">Start free trial</Link>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
