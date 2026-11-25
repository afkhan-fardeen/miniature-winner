import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Refund policy" };

export default function Refunds() {
  return (
    <LegalPage title="Refund policy" updated="26 November 2026">
      <h2>First purchase: {SITE.refundDays}-day refund</h2>
      <p>If Klyroo isn&apos;t right for you, email us within {SITE.refundDays} days of your first purchase and we&apos;ll refund it in full. We&apos;ll ask for your organisation name only.</p>
      <h2>After {SITE.refundDays} days</h2>
      <p>Because terms are paid upfront, we don&apos;t refund the remainder of a term once the {SITE.refundDays} days have passed. You can cancel at any time to stop the next renewal, and you keep access until your paid term ends.</p>
      <h2>Renewals</h2>
      <p>We show your renewal price at checkout and in the account. We recommend cancelling before the renewal date if you don&apos;t want to continue. If you were charged for a renewal you didn&apos;t intend, contact us within {SITE.refundDays} days and we&apos;ll look at it fairly.</p>
      <h2>Additional brands</h2>
      <p>Brands added mid-term are charged pro rata. The {SITE.refundDays}-day period applies to your first purchase only.</p>
      <h2>Your statutory rights</h2>
      <p>This policy doesn&apos;t affect any rights you have under consumer law.</p>
      <h2>How to ask</h2>
      <p>Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> from the address on your account.</p>
    </LegalPage>
  );
}
