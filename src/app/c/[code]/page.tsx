import type { Metadata } from "next";
import { Suspense } from "react";
import { confirmCode } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/AuthShell";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Continue", robots: { index: false } };

async function Content({ params }: { params: PageProps<"/c/[code]">["params"] }) {
  const { code } = await params;
  let link: { type: string } | null = null;
  if (/^[A-Za-z0-9_-]{16}$/.test(code)) {
    const { data } = await supabaseAdmin().from("auth_links").select("type").eq("code", code).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
    link = data;
  }
  const recovery = link?.type === "recovery";
  return (
    <AuthShell
      title={recovery ? "Reset your password" : "Confirm your email"}
      subtitle={link ? (recovery ? "Continue to choose a new password." : "One more click and your account is ready.") : undefined}
      error={link ? undefined : "That link is invalid, has expired, or was already used."}
      footer={link ? undefined : { text: "Need a new link?", href: "/login", cta: "Log in or reset your password" }}
    >
      {link && (
        <form action={confirmCode}>
          <input type="hidden" name="code" value={code} />
          <button className="btn btn-accent btn-lg w-full">{recovery ? "Continue" : "Confirm email"}</button>
        </form>
      )}
    </AuthShell>
  );
}

export default function Page({ params }: PageProps<"/c/[code]">) {
  return <Suspense><Content params={params} /></Suspense>;
}
