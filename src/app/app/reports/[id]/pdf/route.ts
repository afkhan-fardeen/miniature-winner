import type { ReportData } from "@/lib/reports/data";
import { renderReportPdf } from "@/lib/reports/pdf";
import { supabaseServer } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Row-level security means a report is only returned to members of its organisation. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Unauthorised", { status: 401 });
  const { data: row } = await supabase.from("reports").select("kind, period_start, data").eq("id", id).maybeSingle();
  if (!row) return new Response("Not found", { status: 404 });
  const r = row.data as ReportData;
  const pdf = await renderReportPdf(r);
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="klyroo-${r.brand.domain}-${row.kind}-${row.period_start}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
