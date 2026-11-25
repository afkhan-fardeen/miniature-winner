import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="25 November 2026">
      <p>These terms govern your use of Klyroo, provided by {SITE.company}, {SITE.companyAddress} (&quot;Klyroo&quot;, &quot;we&quot;). By creating an account you agree to them.</p>
      <h2>1. The service</h2>
      <p>Klyroo monitors the technical readiness of websites for AI-powered discovery and provides alerts and reports. It measures technical conditions only. We do not measure, predict or guarantee AI recommendations, citations, rankings or traffic.</p>
      <h2>2. Accounts and brands</h2>
      <p>You must provide accurate information and keep your login secure. You may only add websites you own or are authorised to monitor, and you must verify ownership of each domain. The number of brands you monitor cannot exceed the licences you have purchased.</p>
      <h2>3. Subscriptions and payment</h2>
      <ul>
        <li>Each account may start one free trial brand for 14 days. A website can only start one free trial.</li>
        <li>Prices are per brand, in GBP, for the term you choose (1, 3, 6 or 12 months) and are paid upfront.</li>
        <li>The price you paid and the price your renewal will charge are shown before checkout and recorded on your subscription.</li>
        <li>Subscriptions renew automatically at the disclosed renewal price unless you cancel before the renewal date.</li>
        <li>Brands added mid-term are charged pro rata and renew with the rest of your subscription.</li>
        <li>Payments are processed by our payment provider, Polar, which acts as merchant of record and issues invoices.</li>
      </ul>
      <h2>4. Cancellation and refunds</h2>
      <p>You can cancel at any time to stop the next renewal; access continues to the end of the term you paid for. Refunds are covered by our <a href="/refunds">refund policy</a>.</p>
      <h2>5. Acceptable use</h2>
      <p>You must not use Klyroo to monitor sites without authority, attempt to access private networks, circumvent rate limits, or interfere with the service. Klyroo&apos;s crawler respects robots.txt and applies rate limits.</p>
      <h2>6. Availability and changes</h2>
      <p>We aim for reliable monitoring but do not guarantee uninterrupted service or that every issue will be detected. Checks that could not be completed are shown as unavailable. We may improve or change features over time.</p>
      <h2>7. Liability</h2>
      <p>Nothing limits liability that cannot be limited by law. Subject to that, we are not liable for indirect or consequential loss, or for loss of revenue or search or AI visibility, and our total liability is limited to the fees you paid in the 12 months before the claim.</p>
      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction, unless mandatory consumer law gives you other rights.</p>
      <h2>9. Contact</h2>
      <p><a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
    </LegalPage>
  );
}
