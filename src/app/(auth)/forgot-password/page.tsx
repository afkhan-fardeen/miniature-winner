import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, Field } from "@/components/AuthShell";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Reset your password" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/forgot-password">["searchParams"] }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one." error={one(sp.error)} message={one(sp.message)}
      footer={{ text: "Remembered it?", href: "/login", cta: "Back to log in" }}>
      <form action={requestPasswordReset} className="space-y-4">
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <button className="btn btn-primary btn-lg w-full">Send reset link</button>
      </form>
    </AuthShell>
  );
}

export default function Page({ searchParams }: PageProps<"/forgot-password">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
