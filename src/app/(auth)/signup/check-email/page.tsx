import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { resendConfirmation } from "../../actions";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/signup/check-email">["searchParams"] }) {
  const sp = await searchParams;
  const email = one(sp.email)?.slice(0, 254) ?? "";
  return (
    <AuthShell
      title="Check your email"
      subtitle={email ? `We sent a confirmation link to ${email}.` : "We sent you a confirmation link."}
      error={one(sp.problem) ? "We couldn't send the email just now. Use the button below to try again." : undefined}
      message={one(sp.resent) ? "If that address has an unconfirmed account, a new link is on its way." : undefined}
      footer={{ text: "Wrong address?", href: "/signup", cta: "Start again" }}
    >
      <div className="card-surface flex gap-3 text-sm text-ink-2">
        <Mail size={20} className="mt-0.5 shrink-0 text-ink" aria-hidden />
        <p>Click the link in the email to confirm your account and start your free trial. It can take a minute to arrive. Check your spam folder too.</p>
      </div>
      <form action={resendConfirmation} className="mt-6">
        <input type="hidden" name="email" value={email} />
        <button className="btn btn-outline btn-lg w-full" disabled={!email}>Resend email</button>
      </form>
    </AuthShell>
  );
}

export default function Page({ searchParams }: PageProps<"/signup/check-email">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
