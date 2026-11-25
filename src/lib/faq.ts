import { SITE } from "./site";

export const FAQ = [
  {
    q: "How often is my site scanned, and when do I hear about problems?",
    a: "Every verified brand is scanned automatically about once a day, and you can run a scan yourself any time. If a scan finds a new critical issue, we scan again to confirm it before emailing you, so one-off blips don't raise false alarms. You also get a weekly report on Mondays and a monthly report with a PDF on the 1st.",
  },
  {
    q: "How does the free trial work?",
    a: "Every account gets one brand free for 14 days, with no card needed. When the trial ends, monitoring pauses and your brand and reports stay in your account. Add a licence and monitoring resumes straight away.",
  },
  {
    q: "Does Klyroo track where I rank in ChatGPT, Gemini or Perplexity?",
    a: "No. Klyroo checks whether your website is technically ready to be found and understood: crawler access, structured data, sitemaps, metadata and changes. It does not measure or guarantee AI recommendations, citations or rankings, and we never claim to.",
  },
  {
    q: "Is the readiness score an AI visibility score?",
    a: "No. It is a 0–100 technical readiness score built from deterministic checks, and the method is documented. Checks we could not run are shown as unavailable, never as passed.",
  },
  {
    q: "Do you need access to my store admin?",
    a: "No. Klyroo only reads your public pages, robots.txt, sitemaps and structured data. You prove you own the domain by adding a DNS TXT record.",
  },
  {
    q: "Which platforms do you support?",
    a: "Shopify, WooCommerce, BigCommerce and custom e-commerce sites.",
  },
  {
    q: "How does pricing work?",
    a: "Each brand is one licence. You pay per brand for the term you choose: 1, 3, 6 or 12 months, paid upfront on one invoice. Longer terms cost less per month. The price you pay and the price your renewal will charge are both shown before checkout.",
  },
  {
    q: "What happens when my term ends?",
    a: "Your subscription renews at the renewal price shown at checkout unless you cancel first. Cancelling stops the next renewal and your access continues to the end of the term you paid for.",
  },
  {
    q: "Can I add more brands later?",
    a: "Yes. Additional brands are charged pro rata for the rest of your current term, so they renew on the same date as your other brands.",
  },
  {
    q: "What is your refund policy?",
    a: `You can request a refund within ${SITE.refundDays} days of your first purchase. See the refund policy for details.`,
  },
];
