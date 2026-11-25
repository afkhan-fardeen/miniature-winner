import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { confirmToken } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Confirm", robots: { index: false } };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/auth/confirm">["searchParams"] }) {
  const sp = await searchParams;
  const type = one(sp.type);
  const token = one(sp.token_hash);
  const valid = !!token && (type === "signup" || type === "magiclink" || type === "recovery");
  const recovery = type === "recovery";
  return (
    <AuthShell
      title={recovery ? "Reset your password" : "Confirm your email"}
      subtitle={recovery ? "Continue to choose a new password." : "One more click and your account is ready."}
      error={valid ? undefined : "That link is invalid or has expired."}
      footer={valid ? undefined : { text: "Need a new link?", href: recovery ? "/forgot-password" : "/login", cta: recovery ? "Reset password" : "Log in" }}
    >
      {valid && (
        <form action={confirmToken}>
          <input type="hidden" name="token_hash" value={token} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={one(sp.next) ?? "/app"} />
          <button className="btn btn-accent btn-lg w-full">{recovery ? "Continue" : "Confirm email"}</button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
