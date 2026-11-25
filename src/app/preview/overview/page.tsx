import { notFound } from "next/navigation";
import { OrgDashboard } from "@/components/OrgDashboard";
import { DEMO_ORG } from "@/lib/demo-data";

export const metadata = { robots: { index: false } };

/** Sample-data render of the real organisation dashboard, used to capture product screenshots. Off in production. */
export default function PreviewOverview() {
  if (process.env.ENABLE_PREVIEW !== "1") notFound();
  return <OrgDashboard email="you@yourcompany.com" orgs={[DEMO_ORG.org]} active={DEMO_ORG.org} brands={DEMO_ORG.brands} total={DEMO_ORG.total} used={DEMO_ORG.used} free={DEMO_ORG.free} subs={DEMO_ORG.subs} linkBrands={false} />;
}
