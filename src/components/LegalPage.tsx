import { PageShell } from "./PageShell";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <PageShell>
      <article className="container-x max-w-[760px] py-16 sm:py-20">
        <h1 className="display">{title}</h1>
        <p className="mt-3 text-sm text-ink-2">Last updated {updated}</p>
        <div className="mt-10 space-y-4 text-ink-2 [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </PageShell>
  );
}
