import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { BOT_UA } from "@/lib/scan/safe-fetch";

export const metadata: Metadata = { title: "KlyrooBot" };

export default function Bot() {
  return (
    <PageShell>
      <article className="container-x max-w-[760px] py-16 sm:py-20">
        <p className="eyebrow">Crawler</p>
        <h1 className="display mt-3">KlyrooBot</h1>
        <div className="mt-8 space-y-4 text-ink-2">
          <p>KlyrooBot reads the public pages of websites whose owners ask Klyroo to scan or monitor them. It identifies itself with this user agent:</p>
          <p><code className="break-all rounded-md bg-muted px-2 py-1 text-sm text-ink">{BOT_UA}</code></p>
          <h2 className="h3 pt-4 text-ink">How it behaves</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Reads only public pages: your homepage, robots.txt, sitemap, llms.txt and one product page.</li>
            <li>Respects robots.txt. Add a rule for <code>KlyrooBot</code> to restrict it, and we will stop and tell you.</li>
            <li>Sends about six requests per scan, one scan per day per site, and only for sites whose owners have signed up to Klyroo.</li>
            <li>Never logs in, submits forms or reaches private networks.</li>
          </ul>
          <h2 className="h3 pt-4 text-ink">If your firewall blocks it</h2>
          <p>Some bot protection services block unknown crawlers. If you monitor your own site with Klyroo, allow the user agent above for your domain.</p>
        </div>
      </article>
    </PageShell>
  );
}
