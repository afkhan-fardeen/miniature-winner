import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, Field } from "@/components/AuthShell";
import { updatePassword } from "../actions";

export const metadata: Metadata = { title: "Choose a new password" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Choose a new password" error={one(sp.error)}>
      <form action={updatePassword} className="space-y-4">
        <Field label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <button className="btn btn-primary btn-lg w-full">Update password</button>
      </form>
    </AuthShell>
  );
}

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return <Suspense><Content searchParams={searchParams} /></Suspense>;
}
