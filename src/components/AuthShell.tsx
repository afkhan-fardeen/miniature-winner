import { Check } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";

const points = [
  "One free trial brand for 14 days, no card needed",
  "Crawler access, structured data and sitemaps checked for you",
  "Every issue comes with the fix",
];

export function AuthShell({
  title, subtitle, error, message, children, footer,
}: {
  title: string; subtitle?: string; error?: string; message?: string;
  children: React.ReactNode; footer?: { text: string; href: string; cta: string };
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto my-auto w-full max-w-[400px] py-12">
          <h1 className="text-[32px] leading-9 tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-2">{subtitle}</p>}
          {error && <p role="alert" className="alert-error mt-6">{error}</p>}
          {message && <p role="status" className="alert-ok mt-6">{message}</p>}
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-6 text-sm text-ink-2">
              {footer.text} <Link href={footer.href} className="text-ink underline underline-offset-4">{footer.cta}</Link>
            </p>
          )}
        </div>
        <p className="text-xs text-ink-2">
          <Link href="/terms" className="hover:underline">Terms</Link> · <Link href="/privacy" className="hover:underline">Privacy</Link>
        </p>
      </main>
      <aside className="hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-end">
        <p className="text-3xl leading-9 tracking-[-0.02em]">Know if AI can find, read and trust your store.</p>
        <ul className="mt-8 space-y-3 text-[#c9c9c4]">
          {points.map((p) => (
            <li key={p} className="flex gap-3"><Check size={18} className="mt-1 shrink-0 text-acid" aria-hidden />{p}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, ...rest } = props;
  const fid = id ?? props.name;
  return (
    <div>
      <label htmlFor={fid} className="label">{label}</label>
      <input id={fid} className="input" {...rest} />
    </div>
  );
}
