import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, Field } from "@/components/AuthShell";
import { login } from "../actions";

export const metadata: Metadata = { title: "Log in" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = one(sp.next) ?? "";
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Klyroo account." error={one(sp.error)} message={one(sp.message)}
      footer={{ text: "New to Klyroo?", href: next ? `/signup?next=${encodeURIComponent(next)}` : "/signup", cta: "Create an account" }}>
      <form action={login} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required minLength={8} autoComplete="current-password" />
        <div className="flex justify-end"><Link href="/forgot-password" className="text-sm underline underline-offset-4">Forgot password?</Link></div>
        <button className="btn btn-primary btn-lg w-full">Log in</button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
