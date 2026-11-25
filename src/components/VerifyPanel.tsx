import { VERIFY_TXT_PREFIX, verificationMetaTag, verificationRecordName } from "@/lib/domain";
import { verifyBrand } from "@/app/app/actions";

/** Two ways to prove ownership. Either one is enough, and "Check now" tries both. */
export function VerifyPanel({ orgId, brandId, domain, token, from }: { orgId: string; brandId: string; domain: string; token: string; from: "dashboard" | "brand" }) {
  return (
    <div className="card-surface text-sm">
      <p className="text-base">Verify you own {domain}</p>
      <p className="mt-1 text-ink-2">This turns on daily monitoring, alerts and reports. Do either option, then press Check now.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-paper p-4">
          <div>Option 1: add a meta tag <span className="chip ml-1">Easiest</span></div>
          <p className="mt-1 text-ink-2">Paste this inside the <code>&lt;head&gt;</code> of your homepage. On Shopify: Online Store, Themes, Edit code, theme.liquid.</p>
          <code className="mt-2 block break-all rounded-md bg-muted p-2 text-xs">{verificationMetaTag(token)}</code>
        </div>
        <div className="rounded-lg border border-line bg-paper p-4">
          <div>Option 2: add a DNS record</div>
          <p className="mt-1 text-ink-2">At your domain provider, add a TXT record. Changes can take a few minutes.</p>
          <dl className="mt-2 grid gap-1 sm:grid-cols-[48px_1fr]">
            <dt className="text-ink-2">Name</dt><dd className="break-all font-mono text-xs">{verificationRecordName(domain)}</dd>
            <dt className="text-ink-2">Value</dt><dd className="break-all font-mono text-xs">{VERIFY_TXT_PREFIX}{token}</dd>
          </dl>
        </div>
      </div>
      <form action={verifyBrand} className="mt-4">
        <input type="hidden" name="org" value={orgId} /><input type="hidden" name="brand" value={brandId} /><input type="hidden" name="from" value={from} />
        <button className="btn btn-primary">Check now</button>
      </form>
    </div>
  );
}
