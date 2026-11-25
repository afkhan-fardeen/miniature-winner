import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { SignupFields } from "@/components/SignupFields";
import { signup } from "../actions";

export const metadata: Metadata = { title: "Start your free trial" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const sp = await searchParams;
  const site = one(sp.site);
  // A store typed on the homepage carries through to the add-brand form after sign-up.
  const next = one(sp.next) ?? (site ? `/app?site=${encodeURIComponent(site.slice(0, 253))}` : "/app");
  return (
    <AuthShell
      title="Start your free trial"
      subtitle="One brand free for 14 days. No card needed."
      error={one(sp.error)}
      footer={{ text: "Already have an account?", href: "/login", cta: "Log in" }}
    >
      <form action={signup} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <SignupFields />
        <button className="btn btn-accent btn-lg w-full">Create account</button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
