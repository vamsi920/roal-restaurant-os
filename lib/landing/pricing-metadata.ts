import type { Metadata } from "next";
import { PRICING_NO_ORDER_LINE, PRICING_RATE_LINE } from "@/lib/landing/pricing-core";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildPricingPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Pricing — $0.90 per completed order | ROAL",
    description: `${PRICING_RATE_LINE}. No per-minute fees, no monthly fee, no contracts. ${PRICING_NO_ORDER_LINE}`,
    canonicalPath: "/pricing",
  });
}
