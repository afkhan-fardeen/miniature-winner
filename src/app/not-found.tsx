import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="container-x py-24 text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-3">That page isn&apos;t here.</h1>
        <p className="lead mx-auto mt-5 max-w-md">It may have moved, or the link may be wrong.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary btn-lg">Go home</Link>
          <Link href="/pricing" className="btn btn-outline btn-lg">See pricing</Link>
        </div>
      </section>
    </PageShell>
  );
}
