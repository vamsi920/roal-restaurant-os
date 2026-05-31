import {
  PRICING_HOME_RATE_UNIT,
  PRICING_RATE_AMOUNT,
} from "@/lib/landing/pricing-core";
import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";
import { PUBLIC_CTA_LABELS } from "@/lib/landing/public-cta";

/** Homepage pricing/value band (`#pay`) — one idea, no comparison tables. */
export const HOME_PAY = {
  headline: "You pay when ROAL brings you an order.",
  amount: PRICING_RATE_AMOUNT,
  unit: PRICING_HOME_RATE_UNIT,
  note: `Wrong numbers, hang-ups, test calls, and casual menu questions stay off your bill. ROAL earns when a confirmed pickup order reaches your kitchen.`,
  pricingHref: HOME_PRICING_PILL.href,
  ctaLabel: PUBLIC_CTA_LABELS.seePricing,
} as const;
