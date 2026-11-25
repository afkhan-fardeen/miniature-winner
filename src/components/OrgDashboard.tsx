import { CheckCircle2, ChevronRight, Layers, Ticket } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { VERIFY_TXT_PREFIX, verificationRecordName } from "@/lib/domain";
import { addBrand, createOrganization, removeBrand, verifyBrand } from "@/app/app/actions";

export interface DashBrand {
  id: string; brand_name: string; website_url: string; domain: string;
  verification_status: string; verification_token: string; score?: number | null;
}
export interface DashSub { id: string; quantity: number; duration_months: number; status: string; expiry_date: string | null; renewal_status: string }
export interface OrgDashboardProps {
  email?: string | null;
  orgs: { id: string; name: string }[];
  active?: { id: string; name: string };
  brands: DashBrand[];
  total: number; used: number; free: number;
  subs: DashSub[];
  error?: string; ok?: string; prefillSite?: string;
  linkBrands?: boolean;
}

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "n/a");

export function OrgDashboard({ email, orgs, active, brands, total, used, free, subs, error, ok, prefillSite = "", linkBrands = true }: OrgDashboardProps) {
  const anyVerified = brands.some((b) => b.verification_status === "verified");
  const steps = [
    { done: !!active, label: "Create your organisation" },
    { done: total > 0, label: "Choose a plan and buy brand licences", href: "/pricing" },
    { done: brands.length > 0, label: "Add your first brand" },
    { done: anyVerified, label: "Verify your domain with a DNS record" },
  ];
  const onboardingDone = steps.every((s) => s.done);

  return (
    <>
      <AppHeader email={email} />
      <main className="container-x py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Organisation</p>
            <h1 className="mt-1 text-[32px] leading-9 tracking-[-0.02em]">{active ? active.name : "Welcome to Klyroo"}</h1>
          </div>
          {orgs.length > 1 && (
            <nav aria-label="Organisations" className="flex flex-wrap gap-2">
              {orgs.map((o) => (
                <Link key={o.id} href={`/app?org=${o.id}`} className={`btn ${o.id === active?.id ? "btn-primary" : "btn-outline"}`}>{o.name}</Link>
              ))}
            </nav>
          )}
        </div>

        <div className="mt-6 space-y-3" aria-live="polite">
          {error && <p role="alert" className="alert-error">{error}</p>}
          {ok && <p role="status" className="alert-ok">{ok}</p>}
        </div>

        {!active && (
          <form action={createOrganization} className="card mt-8 max-w-md space-y-4">
            <h2 className="h3">Name your organisation</h2>
            <p className="text-sm text-ink-2">This is your company or agency. You can add several brands to it.</p>
            <div>
              <label htmlFor="org-name" className="label">Organisation name</label>
              <input id="org-name" name="name" required maxLength={120} className="input" />
            </div>
            <button className="btn btn-primary btn-lg">Create organisation</button>
          </form>
        )}

        {active && (
          <>
            {!onboardingDone && (
              <section className="card-surface mt-8" aria-labelledby="start">
                <h2 id="start" className="h3">Get started</h2>
                <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                  {steps.map((s, i) => (
                    <li key={s.label} className="flex items-center gap-3 text-sm">
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${s.done ? "bg-ink text-paper" : "border border-ink-2"}`}>{s.done ? "✓" : i + 1}</span>
                      {s.href && !s.done ? <Link href={s.href} className="underline underline-offset-4">{s.label}</Link> : <span className={s.done ? "text-ink-2 line-through" : ""}>{s.label}</span>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Licence usage">
              <Stat label="Brand licences" value={total} Icon={Layers} />
              <Stat label="In use" value={used} Icon={CheckCircle2} />
              <Stat label="Remaining" value={free} Icon={Ticket} />
            </section>

            <section className="mt-12">
              <div className="flex items-center justify-between">
                <h2 className="h3">Brands</h2>
                <Link href="/pricing" className="btn btn-ghost text-sm">Buy more licences</Link>
              </div>
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                {brands.length === 0 && <li className="p-6 text-sm text-ink-2">No brands yet. Add your first one below.</li>}
                {brands.map((b) => (
                  <li key={b.id} className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div>{b.brand_name}</div>
                        <div className="truncate text-sm text-ink-2">{b.website_url}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        {typeof b.score === "number" && <span className="chip tabular-nums">Score {b.score}</span>}
                        <span className={`chip ${b.verification_status === "verified" ? "chip-ok" : "chip-warn"}`}>
                          {b.verification_status === "verified" ? "Verified" : "Not verified"}
                        </span>
                        {linkBrands && b.verification_status === "verified" && (
                          <Link href={`/app/brands/${b.id}`} className="btn btn-outline">Report <ChevronRight size={16} aria-hidden /></Link>
                        )}
                        <form action={removeBrand}>
                          <input type="hidden" name="org" value={active.id} /><input type="hidden" name="brand" value={b.id} />
                          <button className="text-sm text-danger underline underline-offset-4">Remove</button>
                        </form>
                      </div>
                    </div>
                    {b.verification_status !== "verified" && (
                      <div className="card-surface text-sm">
                        <p>Add this DNS TXT record at your domain provider, then check it. DNS changes can take a few minutes.</p>
                        <dl className="mt-3 grid gap-2 sm:grid-cols-[80px_1fr]">
                          <dt className="text-ink-2">Name</dt><dd className="break-all font-mono text-xs">{verificationRecordName(b.domain)}</dd>
                          <dt className="text-ink-2">Value</dt><dd className="break-all font-mono text-xs">{VERIFY_TXT_PREFIX}{b.verification_token}</dd>
                        </dl>
                        <form action={verifyBrand} className="mt-4">
                          <input type="hidden" name="org" value={active.id} /><input type="hidden" name="brand" value={b.id} />
                          <button className="btn btn-outline">Check record</button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <form action={addBrand} className="card mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="org" value={active.id} />
                <div><label htmlFor="brand-name" className="label">Brand name</label><input id="brand-name" name="name" required maxLength={120} className="input" /></div>
                <div><label htmlFor="brand-site" className="label">Website</label><input id="brand-site" name="site" required defaultValue={prefillSite} placeholder="yourstore.com" className="input" /></div>
                <button disabled={free < 1} className="btn btn-primary btn-lg">{free < 1 ? "No free licences" : "Add brand"}</button>
              </form>
              {free < 1 && <p className="mt-2 text-sm text-ink-2"><Link href="/pricing" className="underline underline-offset-4">Buy a licence</Link> to add another brand.</p>}
            </section>

            <section className="mt-12">
              <h2 className="h3">Subscription</h2>
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
                {subs.length === 0 && <li className="p-5 text-ink-2">No subscription yet. <Link className="underline underline-offset-4" href="/pricing">See pricing</Link></li>}
                {subs.map((s) => (
                  <li key={s.id} className="flex flex-wrap justify-between gap-2 p-5">
                    <span>{s.quantity} brand{s.quantity > 1 ? "s" : ""} · {s.duration_months === 1 ? "monthly" : `${s.duration_months} months`} · <span className="chip">{s.status}</span></span>
                    <span className="text-ink-2">Expires {date(s.expiry_date)} · renewal {s.renewal_status === "auto" ? "on" : "cancelled"}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, Icon }: { label: string; value: number; Icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between text-sm text-ink-2">{label}<Icon size={18} className="text-ink" /></div>
      <div className="mt-1 text-5xl tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
