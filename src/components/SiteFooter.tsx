import Link from "next/link";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

const cols = [
  { title: "Product", links: [["What we check", "/#checks"], ["How it works", "/#how-it-works"], ["Methodology", "/methodology"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["KlyrooBot", "/bot"]] },
  { title: "Company", links: [["Contact", "/contact"], ["Log in", "/login"], ["Sign up", "/signup"]] },
  { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["Refunds", "/refunds"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-2">{SITE.tagline}</p>
          <p className="mt-6 max-w-xs text-xs text-ink-2">
            Klyroo measures technical readiness. It does not measure or guarantee AI recommendations, citations or rankings.
          </p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="eyebrow">{c.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:underline underline-offset-4">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-ink-2 sm:flex-row sm:justify-between">
          <span>© Klyroo. All rights reserved.</span>
          <span>Prices in GBP.</span>
        </div>
      </div>
    </footer>
  );
}
