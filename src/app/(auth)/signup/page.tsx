import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, Field } from "@/components/AuthShell";
import { signup } from "../actions";

export const metadata: Metadata = { title: "Create your account" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const sp = await searchParams;
  const site = one(sp.site);
  // A store typed on the homepage carries through to the add-brand form after signup.
  const next = one(sp.next) ?? (site ? `/app?site=${encodeURIComponent(site.slice(0, 253))}` : "/app");
  return (
    <AuthShell title="Create your account" subtitle="Free to sign up. You only pay when you add a brand." error={one(sp.error)}
      footer={{ text: "Already have an account?", href: "/login", cta: "Log in" }}>
      <form action={signup} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Work email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-ink-2">At least 8 characters.</p>
        <button className="btn btn-accent btn-lg w-full">Create account</button>
        <p className="text-xs text-ink-2">By creating an account you agree to our Terms and Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
