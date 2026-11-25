import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { IssueLite, ReportData } from "./data";

const INK = rgb(0.047, 0.039, 0.031), MUTED = rgb(0.42, 0.42, 0.42), LINE = rgb(0.9, 0.91, 0.92), ACID = rgb(0.894, 0.949, 0.133), RED = rgb(0.85, 0.176, 0.125);
const W = 595.28, H = 841.89, M = 48;

/** Standard PDF fonts only cover Latin-1, so map anything else to plain characters. */
const clean = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x20-\x7E£]/g, "");
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export async function renderReportPdf(r: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Klyroo ${r.kind} report: ${r.brand.name}`);
  doc.setProducer("Klyroo");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const ensure = (h: number) => { if (y - h < M + 20) { page = doc.addPage([W, H]); y = H - M; } };
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const words = clean(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) > width && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const text = (t: string, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) => {
    const size = o.size ?? 10, f = o.f ?? font, x = o.x ?? M, width = o.width ?? W - M - x;
    for (const line of wrap(t, f, size, width)) { ensure(size + 4); page.drawText(line, { x, y: y - size, size, font: f, color: o.color ?? INK }); y -= size + 4; }
    y -= o.gap ?? 0;
  };
  const h2 = (t: string) => { ensure(40); y -= 14; text(t, { size: 14, f: bold, gap: 4 }); page.drawLine({ start: { x: M, y: y + 2 }, end: { x: W - M, y: y + 2 }, thickness: 0.5, color: LINE }); y -= 8; };

  // Header
  page.drawText("klyr", { x: M, y: y - 18, size: 20, font: bold, color: INK });
  const lx = M + bold.widthOfTextAtSize("klyr", 20) + 3;
  page.drawCircle({ x: lx, y: y - 13, size: 5, borderWidth: 1.6, borderColor: INK, color: rgb(1, 1, 1) });
  page.drawCircle({ x: lx + 8, y: y - 13, size: 5, borderWidth: 1.6, borderColor: INK, color: ACID });
  y -= 36;
  text(`${r.kind === "weekly" ? "Weekly" : "Monthly"} report`, { size: 22, f: bold, gap: 2 });
  text(`${r.brand.name} (${r.brand.domain})`, { size: 12, color: MUTED });
  text(`${fmt(r.period.start)} to ${fmt(r.period.end)}  |  ${r.scans} scan${r.scans === 1 ? "" : "s"}  |  Generated ${fmt(r.generatedAt)}`, { size: 9, color: MUTED, gap: 6 });

  // Score
  h2("Technical readiness score");
  if (r.score.end === null) {
    text("No completed scans in this period, so there is no score to report.", { color: MUTED });
  } else {
    ensure(56);
    page.drawText(String(r.score.end), { x: M, y: y - 40, size: 44, font: bold, color: INK });
    const delta = r.score.delta;
    const dText = delta === null ? "" : delta === 0 ? "No change over the period" : `${delta > 0 ? "+" : ""}${delta} points over the period (from ${r.score.start})`;
    page.drawText("/ 100", { x: M + 66, y: y - 40, size: 12, font, color: MUTED });
    page.drawText(clean(dText), { x: M + 130, y: y - 30, size: 11, font: bold, color: delta !== null && delta < 0 ? RED : INK });
    if (r.coverage !== null && r.coverage < 100) page.drawText(clean(`Based on ${r.coverage}% of checks we could run`), { x: M + 130, y: y - 45, size: 9, font, color: MUTED });
    y -= 58;
    for (const c of r.categories) {
      ensure(20);
      page.drawText(clean(c.label), { x: M, y: y - 10, size: 10, font, color: INK });
      page.drawRectangle({ x: M + 170, y: y - 10, width: 250, height: 6, color: LINE });
      if (c.score !== null) page.drawRectangle({ x: M + 170, y: y - 10, width: Math.max(2.5, 2.5 * c.score), height: 6, color: c.score >= 75 ? INK : ACID });
      page.drawText(c.score === null ? "Not tested" : String(c.score), { x: M + 432, y: y - 10, size: 10, font, color: c.score === null ? MUTED : INK });
      y -= 20;
    }
  }

  // Issues
  const list = (title: string, items: IssueLite[], empty: string, limit = 10) => {
    h2(`${title} (${items.length})`);
    if (!items.length) return text(empty, { color: MUTED });
    for (const it of items.slice(0, limit)) {
      text(`${it.severity === "critical" ? "[Critical] " : "[Warning] "}${it.title}`, { f: bold, color: it.severity === "critical" ? RED : INK });
      text(it.detail ?? "", { size: 9, color: MUTED, x: M + 10 });
      if (it.url) text(it.url, { size: 8, color: MUTED, x: M + 10 });
      if (it.recommendation) text(`Fix: ${it.recommendation}`, { size: 9, x: M + 10 });
      y -= 4;
    }
    if (items.length > limit) text(`...and ${items.length - limit} more. See all in Klyroo.`, { size: 9, color: MUTED });
  };
  list("New issues", r.newIssues, "No new issues were found in this period.");
  list("Resolved issues", r.resolved, "No issues were resolved in this period.");
  list("Outstanding issues", r.outstanding, "Nothing is outstanding.", 15);

  if (r.changes.length) {
    h2("Changes since the last scan");
    for (const c of r.changes) text(`${c.direction === "worse" ? "Worse" : c.direction === "better" ? "Better" : "Changed"}: ${c.title} (${c.from} to ${c.to})`, { size: 10 });
  }
  if (r.kind === "monthly" && r.topUrls.length) {
    h2("Most affected URLs");
    for (const u of r.topUrls) text(`${u.url}  (${u.count} issue${u.count > 1 ? "s" : ""})`, { size: 9 });
  }
  h2("Recommended actions");
  if (r.priorities.length) r.priorities.forEach((p, i) => text(`${i + 1}. ${p}`, { gap: 2 }));
  else text("No actions needed right now.", { color: MUTED });
  if (r.untested.length) { y -= 6; text(`Not tested this period (not counted as passed): ${r.untested.join(", ")}.`, { size: 9, color: MUTED }); }

  y -= 14;
  text("This is a technical readiness report built from public pages. It is not an AI visibility or ranking score, and does not predict or guarantee AI recommendations or citations.", { size: 8, color: MUTED });
  return doc.save();
}
