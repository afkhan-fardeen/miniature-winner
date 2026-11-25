import { notFound } from "next/navigation";
import { BrandWorkspaceView } from "@/components/BrandWorkspaceView";
import { DEMO_HISTORY, DEMO_ORG, DEMO_SCAN } from "@/lib/demo-data";

export const metadata = { robots: { index: false } };

/** Sample-data render of the real brand workspace, used to capture product screenshots. Off in production. */
export default function PreviewBrand() {
  if (process.env.ENABLE_PREVIEW !== "1") notFound();
  return <BrandWorkspaceView email="you@yourcompany.com" orgId={DEMO_ORG.org.id} brand={{ id: "b1", name: "Northwind Outdoor", domain: DEMO_SCAN.domain, verified: true }} scan={DEMO_SCAN} history={DEMO_HISTORY} />;
}
