import { Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <div><Logo /></div>
        <nav aria-label="Main" className="hidden items-center gap-8 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-ink-2 transition-colors hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        <div className="col-start-3 flex items-center justify-end gap-5">
          <Link href="/login" className="hidden text-sm hover:underline underline-offset-4 md:inline">Log in</Link>
          <Link href="/signup" className="btn btn-accent hidden md:inline-flex">Get started</Link>
          <details className="group relative md:hidden">
            <summary className="btn btn-outline cursor-pointer list-none gap-2" aria-label="Menu">
              <Menu size={16} aria-hidden /> Menu
            </summary>
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-line bg-paper p-2">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-md px-3 py-2.5 text-sm hover:bg-muted">{n.label}</Link>
              ))}
              <Link href="/login" className="block rounded-md px-3 py-2.5 text-sm hover:bg-muted">Log in</Link>
              <Link href="/signup" className="btn btn-accent mt-1 w-full">Get started</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
