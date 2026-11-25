import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { FAQ } from "@/lib/faq";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <PageShell>
      <section className="container-x max-w-[820px] py-16 sm:py-20">
        <p className="eyebrow">FAQ</p>
        <h1 className="display mt-3">Questions, answered straight.</h1>
        <div className="mt-12 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg">
                {f.q}<span aria-hidden className="text-2xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-[62ch] text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-ink-2">Still unsure? <Link href="/contact" className="text-ink underline underline-offset-4">Contact us</Link>.</p>
      </section>
    </PageShell>
  );
}
