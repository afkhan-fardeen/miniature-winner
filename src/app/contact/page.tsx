import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <PageShell>
      <section className="container-x max-w-[760px] py-16 sm:py-20">
        <p className="eyebrow">Contact</p>
        <h1 className="display mt-3">Talk to a person.</h1>
        <p className="lead mt-5">Questions about the product, billing or your data? Email us and we&apos;ll reply as soon as we can.</p>
        <a href={`mailto:${SITE.supportEmail}`} className="btn btn-accent btn-lg mt-8">{SITE.supportEmail}</a>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="card"><h2 className="h3">Billing and refunds</h2><p className="mt-2 text-sm text-ink-2">Include your organisation name and the email on your account.</p></div>
          <div className="card"><h2 className="h3">Data and privacy</h2><p className="mt-2 text-sm text-ink-2">Ask to access, correct or delete your data any time.</p></div>
        </div>
      </section>
    </PageShell>
  );
}
