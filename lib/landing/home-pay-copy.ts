import {
  PRICING_HOME_RATE_UNIT,
  PRICING_NO_ORDER_LINE,
  PRICING_RATE_AMOUNT,
} from "@/lib/landing/pricing-core";
import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";
import { PUBLIC_CTA_LABELS } from "@/lib/landing/public-cta";

/** Homepage pricing/value band (`#pay`) — one idea, no comparison tables. */
export const HOME_PAY = {
  headline: "Only pay when ROAL brings you real orders.",
  amount: PRICING_RATE_AMOUNT,
  unit: PRICING_HOME_RATE_UNIT,
  note: `${PRICING_NO_ORDER_LINE} Wrong numbers, hang-ups, and tests stay off your bill.`,
  pricingHref: HOME_PRICING_PILL.href,
  ctaLabel: PUBLIC_CTA_LABELS.seePricing,
} as const;
