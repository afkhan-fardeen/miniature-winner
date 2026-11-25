import type { DurationMonths, PriceMode } from "@/lib/pricing";

export interface CheckoutRequest {
  organizationId: string;
  customerEmail: string;
  brands: number;
  durationMonths: DurationMonths;
  priceMode: PriceMode;
  successUrl: string;
}

export interface CheckoutResult {
  checkoutId: string;
  url: string;
}

export interface BillingProvider {
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Change the number of brand licences on an existing subscription. */
  setBrandCount(providerSubscriptionId: string, brands: number, behavior: "invoice" | "next_period"): Promise<void>;
  /** Stop the next renewal. Access continues to the end of the paid term. */
  cancelAtPeriodEnd(providerSubscriptionId: string): Promise<void>;
}
