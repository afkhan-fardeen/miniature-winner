import type { BillingProvider, CheckoutRequest, CheckoutResult } from "./types";
import type { DurationMonths, PriceMode } from "@/lib/pricing";

/**
 * Polar adapter over the REST API. UNVERIFIED against a live sandbox:
 *  - 3/6-month terms via recurring_interval=month + recurring_interval_count
 *  - a single consolidated invoice for a multi-seat purchase
 * Run scripts/polar-sandbox-check.md before enabling in production.
 */

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

function baseUrl(): string {
  return process.env.POLAR_SERVER === "production"
    ? "https://api.polar.sh/v1"
    : "https://sandbox-api.polar.sh/v1";
}

/** One Polar product per (price mode, duration). IDs come from env so offers can change without code. */
export function productIdFor(mode: PriceMode, months: DurationMonths): string {
  return env(`POLAR_PRODUCT_${mode.toUpperCase()}_${months}M`);
}

async function polar(path: string, init: RequestInit & { json?: unknown } = {}) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env("POLAR_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) {
    throw new Error(`Polar ${init.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

export const polarProvider: BillingProvider = {
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const data = await polar("/checkouts/", {
      method: "POST",
      json: {
        products: [productIdFor(req.priceMode, req.durationMonths)],
        seats: req.brands,
        customer_email: req.customerEmail,
        external_customer_id: req.organizationId,
        success_url: req.successUrl,
        metadata: {
          organization_id: req.organizationId,
          brands: String(req.brands),
          duration_months: String(req.durationMonths),
          price_mode: req.priceMode,
        },
      },
    });
    return { checkoutId: data.id, url: data.url };
  },

  async setBrandCount(id, brands, behavior) {
    await polar(`/subscriptions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: { seats: brands, proration_behavior: behavior },
    });
  },

  async cancelAtPeriodEnd(id) {
    await polar(`/subscriptions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: { cancel_at_period_end: true },
    });
  },
};
