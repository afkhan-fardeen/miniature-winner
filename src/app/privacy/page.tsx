import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="25 November 2026">
      <p>{SITE.company} (&quot;Klyroo&quot;) is the controller of your personal data. This policy explains what we collect and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address, organisation name and team membership.</li>
        <li><strong>Brand data:</strong> the website addresses you add and the public technical data we collect from them (robots.txt, sitemaps, page metadata, structured data, status codes).</li>
        <li><strong>Billing data:</strong> subscription details. Card details are handled by our payment provider and never reach our servers.</li>
        <li><strong>Usage data:</strong> basic logs for security and reliability.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide monitoring, alerts and reports; to process payments; to secure the service; and to communicate with you about your account. We do not sell personal data and do not use your data to train AI models.</p>
      <h2>Who processes it</h2>
      <p>We use trusted processors: Supabase (database and authentication), Polar (payments and invoicing), our email delivery provider, and our hosting providers. Each processes data only on our instructions.</p>
      <h2>Retention</h2>
      <p>Detailed monitoring history is kept for 90 days. Reports are retained for the period set out in your account. When an account closes we delete or anonymise its data within a documented period, except where the law requires us to keep records such as invoices.</p>
      <h2>Your rights</h2>
      <p>Under UK GDPR you can request access to, correction or deletion of your data, object to or restrict processing, and ask for a portable copy. You can complain to the Information Commissioner&apos;s Office. Contact us at <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.</p>
      <h2>Cookies</h2>
      <p>We use only essential cookies to keep you signed in. We do not use advertising cookies.</p>
    </LegalPage>
  );
}
