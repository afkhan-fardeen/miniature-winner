"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  // The menu is "open" only for the page it was opened on, so navigating closes it without an effect.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenOn((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenOn(null); btn.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={btn} type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-md border border-line hover:border-ink"
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-paper px-5 pb-8 pt-4">
          <nav aria-label="Mobile" className="flex flex-col">
            {items.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-xl tracking-tight">{n.label}</Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/signup" onClick={() => setOpen(false)} className="btn btn-accent btn-lg w-full">Start free trial</Link>
            <Link href="/login" onClick={() => setOpen(false)} className="btn btn-outline btn-lg w-full">Log in</Link>
          </div>
        </div>
      )}
    </div>
  );
}
