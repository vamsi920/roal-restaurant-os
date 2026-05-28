import {
  PRICING_HOME_RATE_UNIT,
  PRICING_NO_ORDER_LINE,
  PRICING_RATE_AMOUNT,
  PRICING_VALUE_HEADLINE,
} from "@/lib/landing/pricing-core";
import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";
import { PUBLIC_CTA_LABELS } from "@/lib/landing/public-cta";

/** Homepage pricing/value band (`#pay`) — one idea, no comparison tables. */
export const HOME_PAY = {
  headline: PRICING_VALUE_HEADLINE,
  amount: PRICING_RATE_AMOUNT,
  unit: PRICING_HOME_RATE_UNIT,
  note: PRICING_NO_ORDER_LINE,
  pricingHref: HOME_PRICING_PILL.href,
  ctaLabel: PUBLIC_CTA_LABELS.seePricing,
} as const;
