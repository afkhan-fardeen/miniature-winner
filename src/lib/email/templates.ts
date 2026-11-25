import { appUrl } from "@/lib/app-url";
import { formatGBP } from "@/lib/pricing";

/* Brand tokens (match the site). Email clients need inline styles and tables. */
const INK = "#0C0A08", MUTED = "#6B6B6B", ACID = "#E4F222", LINE = "#E5E7EB", SURFACE = "#F6F6F4";

export interface Rendered { subject: string; html: string; text: string; attachments?: { filename: string; content: string }[] }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0"><tr><td style="background:${ACID};border-radius:6px"><a href="${esc(href)}" style="display:inline-block;padding:14px 24px;font:500 16px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${INK};text-decoration:none">${esc(label)}</a></td></tr></table>`;
}

function layout(opts: { preheader: string; title: string; bodyHtml: string; footerNote?: string }) {
  const settings = `${appUrl()}/app/settings`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>${esc(opts.title)}</title></head>
<body style="margin:0;background:${SURFACE};padding:24px 12px">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid ${LINE};border-radius:16px">
<tr><td style="padding:28px 32px 0"><span style="font:400 26px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:-0.05em;color:${INK}">klyr</span><span style="display:inline-block;vertical-align:baseline;width:11px;height:11px;border:2px solid ${INK};border-radius:50%;margin-left:1px"></span><span style="display:inline-block;vertical-align:baseline;width:11px;height:11px;border:2px solid ${INK};background:${ACID};border-radius:50%;margin-left:-4px"></span></td></tr>
<tr><td style="padding:24px 32px 32px;font:400 16px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${INK}">
<h1 style="margin:0 0 16px;font:400 26px/1.15 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:-0.02em">${esc(opts.title)}</h1>
${opts.bodyHtml}
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font:400 12px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED}">${opts.footerNote ?? `You're receiving this because you have a Klyroo account. <a href="${settings}" style="color:${MUTED}">Manage email settings</a>.`}<br>Klyroo · AEO and GEO monitoring for e-commerce</p>
</td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`;
const muted = (s: string) => `<p style="margin:0 0 14px;font-size:14px;color:${MUTED}">${s}</p>`;
const link = (url: string) => muted(`If the button doesn't work, copy this link into your browser:<br><a href="${esc(url)}" style="color:${MUTED};word-break:break-all">${esc(url)}</a>`);

/* ------------------------------------------------------------------ auth */

export function confirmEmail(a: { firstName: string; url: string }): Rendered {
  return {
    subject: "Confirm your email to start your free trial",
    html: layout({
      preheader: "One click to confirm your email and start your free trial.",
      title: `Welcome, ${a.firstName}`,
      bodyHtml: p("Confirm your email address to finish creating your Klyroo account. You'll get one free trial brand, no card needed.") + button(a.url, "Confirm email") + muted("This link works once and expires soon. If it has, you can request a new one.") + link(a.url) + muted("If you didn't sign up, you can ignore this email."),
      footerNote: "You're receiving this because someone used this address to sign up to Klyroo.",
    }),
    text: `Welcome, ${a.firstName}\n\nConfirm your email to finish creating your Klyroo account and start your free trial:\n${a.url}\n\nThis link works once and expires soon. If you didn't sign up, ignore this email.`,
  };
}

export function resetPassword(a: { firstName?: string; url: string }): Rendered {
  const hi = a.firstName ? `Hi ${a.firstName},` : "Hi,";
  return {
    subject: "Reset your Klyroo password",
    html: layout({
      preheader: "Use this link to choose a new password.",
      title: "Reset your password",
      bodyHtml: p(`${esc(hi)} we got a request to reset your password. Choose a new one with the button below.`) + button(a.url, "Choose a new password") + muted("This link works once and expires in 1 hour.") + link(a.url) + muted("If you didn't ask for this, you can ignore this email. Your password won't change."),
      footerNote: "You're receiving this because a password reset was requested for your Klyroo account.",
    }),
    text: `${hi} we got a request to reset your Klyroo password.\n\nChoose a new one: ${a.url}\n\nThis link works once and expires in 1 hour. If you didn't ask for this, ignore this email.`,
  };
}

export function passwordChanged(a: { firstName: string; when: Date }): Rendered {
  const login = `${appUrl()}/forgot-password`;
  return {
    subject: "Your Klyroo password was changed",
    html: layout({
      preheader: "Your password was just changed.",
      title: "Your password was changed",
      bodyHtml: p(`Hi ${esc(a.firstName)}, the password for your Klyroo account was changed on ${fmtDate(a.when)}.`) + p("If this was you, there's nothing to do.") + p(`If it wasn't, <a href="${login}" style="color:${INK}">reset your password now</a> and contact us straight away.`),
      footerNote: "This is a security notice, so you'll always receive it.",
    }),
    text: `Hi ${a.firstName}, your Klyroo password was changed on ${fmtDate(a.when)}.\n\nIf this was you, there's nothing to do. If not, reset it now: ${login} and contact us.`,
  };
}

/* ------------------------------------------------------------- lifecycle */

export function welcome(a: { firstName: string; trialEndsAt: Date }): Rendered {
  const url = `${appUrl()}/app`;
  return {
    subject: "Your free trial has started",
    html: layout({
      preheader: "Add your store and get your first report in minutes.",
      title: `You're in, ${a.firstName}`,
      bodyHtml: p(`You have <strong>one free trial brand</strong> until <strong>${fmtDate(a.trialEndsAt)}</strong>. No card needed.`) +
        `<ol style="margin:0 0 14px;padding-left:20px"><li style="margin-bottom:6px"><strong>Add your store.</strong> Your first report is ready within minutes.</li><li style="margin-bottom:6px"><strong>Verify you own it</strong> with a meta tag or a DNS record. This turns on daily monitoring, alerts and reports.</li><li><strong>Fix what we find.</strong> Every issue comes with the fix.</li></ol>` + button(url, "Add your store"),
    }),
    text: `You're in, ${a.firstName}.\n\nYou have one free trial brand until ${fmtDate(a.trialEndsAt)}. No card needed.\n\n1. Add your store: your first report is ready within minutes.\n2. Verify you own it with a meta tag or a DNS record to turn on daily monitoring, alerts and reports.\n3. Fix what we find. Every issue comes with the fix.\n\n${url}`,
  };
}

export interface TrialSummary { brandName: string; domain: string; score: number | null; critical: number; warnings: number }

export function trialEnding(a: { firstName: string; endsAt: Date; hoursLeft: number; summary?: TrialSummary }): Rendered {
  const url = `${appUrl()}/pricing`;
  const when = a.hoursLeft <= 18 ? "today" : "tomorrow";
  const sm = a.summary;
  const found = sm && sm.score !== null
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:8px"><tr><td style="padding:16px"><div style="font-size:13px;color:${MUTED}">What we found on ${esc(sm.domain)}</div><div style="margin:6px 0;font-size:34px;letter-spacing:-0.02em">${sm.score}<span style="font-size:14px;color:${MUTED}"> / 100</span></div><div style="font-size:14px">${sm.critical} critical · ${sm.warnings} other issue${sm.warnings === 1 ? "" : "s"} still open</div></td></tr></table>`
    : "";
  const foundText = sm && sm.score !== null ? `\nWhat we found on ${sm.domain}: ${sm.score}/100, ${sm.critical} critical, ${sm.warnings} other open issues.\n` : "";
  return {
    subject: `Your free trial ends ${when}`,
    html: layout({
      preheader: sm && sm.score !== null ? `${sm.domain} scored ${sm.score}/100. Keep monitoring it.` : "Keep monitoring your brand with a licence.",
      title: `Your trial ends ${when}`,
      bodyHtml: p(`Hi ${esc(a.firstName)}, your free trial brand stops being monitored on <strong>${fmtDate(a.endsAt)}</strong>. Your brand and its reports stay in your account.`) + found +
        p("Keep going and Klyroo keeps scanning every day, emails you the moment something critical breaks, and sends weekly and monthly reports.") + button(url, "Keep monitoring"),
    }),
    text: `Hi ${a.firstName}, your free trial brand stops being monitored on ${fmtDate(a.endsAt)}. Your brand and reports stay in your account.\n${foundText}\nKeep monitoring: ${url}`,
  };
}

export function trialExpired(a: { firstName: string }): Rendered {
  const url = `${appUrl()}/pricing`;
  return {
    subject: "Your free trial has ended",
    html: layout({
      preheader: "Add a licence to start monitoring again.",
      title: "Your free trial has ended",
      bodyHtml: p(`Hi ${esc(a.firstName)}, your free trial has ended, so we've paused monitoring. Your brand, scans and reports are still in your account.`) + p("Add a brand licence and monitoring resumes straight away.") + button(url, "Add a licence"),
    }),
    text: `Hi ${a.firstName}, your free trial has ended and monitoring is paused. Your brand, scans and reports are still in your account.\n\nAdd a licence to resume: ${url}`,
  };
}

/* --------------------------------------------------------------- billing */

export function subscriptionActive(a: { firstName: string; brands: number; months: number; expiresAt: Date | null; total: number }): Rendered {
  const url = `${appUrl()}/app`;
  const term = a.months === 1 ? "1 month" : `${a.months} months`;
  return {
    subject: "Your Klyroo licences are active",
    html: layout({
      preheader: `${a.brands} brand licence${a.brands > 1 ? "s" : ""} for ${term}.`,
      title: "Payment received, thank you",
      bodyHtml: p(`Hi ${esc(a.firstName)}, your licences are active.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:8px"><tr><td style="padding:14px 16px;font-size:15px">` +
        `<strong>${a.brands}</strong> brand licence${a.brands > 1 ? "s" : ""}<br>Term: ${term}<br>Paid: ${formatGBP(a.total)}${a.expiresAt ? `<br>Renews or ends: ${fmtDate(a.expiresAt)}` : ""}</td></tr></table>` +
        p("You'll get your invoice from Polar, our payment provider. We'll remind you before your renewal date.") + button(url, "Go to your dashboard"),
      footerNote: "This is a receipt for your purchase, so you'll always receive it.",
    }),
    text: `Hi ${a.firstName}, your licences are active.\n\n${a.brands} brand licence(s), ${term}, paid ${formatGBP(a.total)}${a.expiresAt ? `, renews or ends ${fmtDate(a.expiresAt)}` : ""}.\n\nInvoice comes from Polar. Dashboard: ${url}`,
  };
}

export function renewalReminder(a: { firstName: string; brands: number; renewsAt: Date; amount: number }): Rendered {
  const url = `${appUrl()}/app`;
  return {
    subject: `Your Klyroo subscription renews on ${fmtDate(a.renewsAt)}`,
    html: layout({
      preheader: "Your renewal is coming up.",
      title: "Your renewal is coming up",
      bodyHtml: p(`Hi ${esc(a.firstName)}, your subscription for <strong>${a.brands}</strong> brand${a.brands > 1 ? "s" : ""} renews on <strong>${fmtDate(a.renewsAt)}</strong> for <strong>${formatGBP(a.amount)}</strong>.`) + p("Nothing to do if you want to continue. If not, cancel before that date and you'll keep access until your paid term ends.") + button(url, "Manage subscription"),
      footerNote: "This is a renewal notice, so you'll always receive it.",
    }),
    text: `Hi ${a.firstName}, your subscription for ${a.brands} brand(s) renews on ${fmtDate(a.renewsAt)} for ${formatGBP(a.amount)}.\n\nCancel before that date to stop the renewal; you keep access until your paid term ends.\n${url}`,
  };
}

export function subscriptionCancelled(a: { firstName: string; accessUntil: Date | null }): Rendered {
  const url = `${appUrl()}/pricing`;
  return {
    subject: "Your Klyroo renewal is cancelled",
    html: layout({
      preheader: "You keep access until your paid term ends.",
      title: "Your renewal is cancelled",
      bodyHtml: p(`Hi ${esc(a.firstName)}, we've cancelled your next renewal.${a.accessUntil ? ` You keep full access until <strong>${fmtDate(a.accessUntil)}</strong>.` : ""}`) + p("Changed your mind? You can add licences again any time.") + button(url, "See pricing"),
      footerNote: "This is a confirmation of a change to your subscription, so you'll always receive it.",
    }),
    text: `Hi ${a.firstName}, we've cancelled your next renewal.${a.accessUntil ? ` You keep access until ${fmtDate(a.accessUntil)}.` : ""}\n\nAdd licences again any time: ${url}`,
  };
}

export function refundProcessed(a: { firstName: string }): Rendered {
  return {
    subject: "Your refund has been processed",
    html: layout({
      preheader: "Your refund is on its way.",
      title: "Your refund has been processed",
      bodyHtml: p(`Hi ${esc(a.firstName)}, your refund has been issued by our payment provider and the licences from that purchase have been ended. It can take a few days to appear on your statement.`),
      footerNote: "This is a billing notice, so you'll always receive it.",
    }),
    text: `Hi ${a.firstName}, your refund has been issued and the licences from that purchase have ended. It can take a few days to appear on your statement.`,
  };
}

/* ---------------------------------------------------------------- alerts */

export interface AlertIssue { title: string; severity: "critical" | "warning"; url: string; detail: string; previous: string; recommendation?: string }

export function issueAlert(a: { firstName: string; brandName: string; domain: string; issues: AlertIssue[]; detectedAt: Date; brandId: string }): Rendered {
  const link = `${appUrl()}/app/brands/${a.brandId}`;
  const n = a.issues.length;
  const subject = n === 1 ? `Critical: ${a.issues[0].title} on ${a.domain}` : `${n} critical issues on ${a.domain}`;
  const card = (i: AlertIssue) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:8px"><tr><td style="padding:16px">` +
    `<span style="display:inline-block;padding:3px 8px;border-radius:999px;background:#fde7e4;color:#d92d20;font-size:12px">Critical</span>` +
    `<div style="margin:10px 0 4px;font-size:18px">${esc(i.title)}</div>` +
    `<div style="font-size:14px;color:${MUTED}">${esc(i.detail)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px">` +
    `<tr><td style="padding:3px 0;color:${MUTED};width:110px">Affected URL</td><td style="padding:3px 0;word-break:break-all">${esc(i.url || a.domain)}</td></tr>` +
    `<tr><td style="padding:3px 0;color:${MUTED}">Detected</td><td style="padding:3px 0">${fmtDate(a.detectedAt)}</td></tr>` +
    `<tr><td style="padding:3px 0;color:${MUTED}">Before</td><td style="padding:3px 0">${esc(i.previous)}</td></tr>` +
    `<tr><td style="padding:3px 0;color:${MUTED}">Now</td><td style="padding:3px 0">${esc(i.detail)}</td></tr>` +
    (i.recommendation ? `<tr><td style="padding:3px 0;color:${MUTED}">What to do</td><td style="padding:3px 0">${esc(i.recommendation)}</td></tr>` : "") +
    `</table></td></tr></table>`;
  const textIssue = (i: AlertIssue) => `CRITICAL: ${i.title}
Affected URL: ${i.url || a.domain}
Detected: ${fmtDate(a.detectedAt)}
Before: ${i.previous}
Now: ${i.detail}${i.recommendation ? `
What to do: ${i.recommendation}` : ""}`;
  return {
    subject,
    html: layout({
      preheader: n === 1 ? a.issues[0].detail : `${n} new critical issues were found on ${a.brandName}.`,
      title: n === 1 ? "A critical issue was found" : `${n} critical issues were found`,
      bodyHtml: p(`Hi ${esc(a.firstName)}, Klyroo's latest scan of <strong>${esc(a.brandName)}</strong> (${esc(a.domain)}) found ${n === 1 ? "a new critical issue" : "new critical issues"}.`) + a.issues.map(card).join("") + button(link, "View in Klyroo") + muted("We confirmed each issue with a second check before alerting you. You can turn critical alert emails off in your settings."),
    }),
    text: `Hi ${a.firstName}, Klyroo's latest scan of ${a.brandName} (${a.domain}) found ${n === 1 ? "a new critical issue" : "new critical issues"}.\n\n${a.issues.map(textIssue).join("\n\n")}\n\nView in Klyroo: ${link}`,
  };
}

/* --------------------------------------------------------------- reports */

import type { ReportData } from "@/lib/reports/data";

const sev = (s: "critical" | "warning") => `<span style="color:${s === "critical" ? "#d92d20" : "#8a5a00"}">${s === "critical" ? "Critical" : "Warning"}</span>`;

function reportBlock(r: ReportData) {
  const url = `${appUrl()}/app/brands/${r.brand.id}`;
  const d = r.score.delta;
  const delta = d === null ? "" : d === 0 ? "no change" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d)} vs the start of the period`;
  const cats = r.categories.map((c) => `<tr><td style="padding:3px 0;font-size:14px">${esc(c.label)}</td><td align="right" style="padding:3px 0;font-size:14px;color:${c.score === null ? MUTED : INK}">${c.score === null ? "Not tested" : c.score}</td></tr>`).join("");
  const list = (title: string, items: ReportData["newIssues"], n = 4) =>
    items.length ? `<p style="margin:14px 0 6px;font-size:14px;color:${MUTED}">${title} (${items.length})</p>${items.slice(0, n).map((i) => `<div style="font-size:14px;margin:0 0 4px">${sev(i.severity)} · ${esc(i.title)}</div>`).join("")}${items.length > n ? `<div style="font-size:13px;color:${MUTED}">and ${items.length - n} more</div>` : ""}` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${LINE};border-radius:8px"><tr><td style="padding:18px">` +
    `<div style="font-size:18px"><a href="${url}" style="color:${INK};text-decoration:none">${esc(r.brand.name)}</a> <span style="font-size:13px;color:${MUTED}">${esc(r.brand.domain)}</span></div>` +
    (r.score.end === null ? `<p style="margin:10px 0;font-size:14px;color:${MUTED}">No completed scans in this period.</p>` :
      `<div style="margin:10px 0 2px;font-size:34px;letter-spacing:-0.02em">${r.score.end}<span style="font-size:14px;color:${MUTED}"> / 100</span></div><div style="font-size:13px;color:${MUTED}">${delta}${r.coverage !== null && r.coverage < 100 ? ` · based on ${r.coverage}% of checks` : ""}</div>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-top:1px solid ${LINE}">${cats}</table>`) +
    `<p style="margin:12px 0 0;font-size:14px"><strong>${r.newIssues.length}</strong> new · <strong>${r.resolved.length}</strong> resolved · <strong>${r.outstanding.length}</strong> outstanding</p>` +
    list("New issues", r.newIssues) + list("Resolved", r.resolved, 3) +
    (r.priorities.length ? `<p style="margin:14px 0 6px;font-size:14px;color:${MUTED}">Recommended actions</p><ol style="margin:0;padding-left:18px;font-size:14px">${r.priorities.slice(0, 3).map((x) => `<li style="margin-bottom:3px">${esc(x)}</li>`).join("")}</ol>` : "") +
    (r.untested.length ? `<p style="margin:12px 0 0;font-size:12px;color:${MUTED}">Not tested (not counted as passed): ${esc(r.untested.join(", "))}</p>` : "") +
    `</td></tr></table>`;
}

export function periodicReport(a: { firstName: string; kind: "weekly" | "monthly"; orgName: string; start: string; end: string; reports: ReportData[] }): Rendered {
  const label = a.kind === "weekly" ? "weekly" : "monthly";
  const range = `${fmtDate(a.start)} to ${fmtDate(a.end)}`;
  const link = `${appUrl()}/app/reports`;
  return {
    subject: `Your ${label} Klyroo report: ${range}`,
    html: layout({
      preheader: `${a.reports.length} brand${a.reports.length > 1 ? "s" : ""}, ${range}.`,
      title: `Your ${label} report`,
      bodyHtml: p(`Hi ${esc(a.firstName)}, here's how ${a.reports.length > 1 ? "your brands" : "your brand"} did from <strong>${range}</strong>.`) + a.reports.map(reportBlock).join("") +
        button(link, "Open full reports") + muted(a.kind === "monthly" ? "A PDF of each brand's report is attached." : "This is a technical readiness report. It is not an AI visibility or ranking score.") ,
    }),
    text: `Hi ${a.firstName}, your ${label} Klyroo report (${range}).\n\n` + a.reports.map((r) => `${r.brand.name} (${r.brand.domain}): ${r.score.end === null ? "no completed scans" : `${r.score.end}/100${r.score.delta ? ` (${r.score.delta > 0 ? "+" : ""}${r.score.delta})` : ""}`}; ${r.newIssues.length} new, ${r.resolved.length} resolved, ${r.outstanding.length} outstanding.`).join("\n") + `\n\nOpen full reports: ${link}`,
  };
}
