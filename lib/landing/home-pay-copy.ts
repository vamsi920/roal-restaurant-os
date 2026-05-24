import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";
import { PUBLIC_CTA_LABELS } from "@/lib/landing/public-cta";

/** Short homepage pricing teaser (`#pay`). */
export const HOME_PAY = {
  title: "No ticket on your pass? You do not pay.",
  price: HOME_PRICING_PILL.price,
  priceNote: "Per confirmed pickup on your kitchen screen—not per minute, not every ring.",
  pricingHref: HOME_PRICING_PILL.href,
  ctaLabel: PUBLIC_CTA_LABELS.seePricing,
} as const;
