import type { Metadata } from "next";
import { PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildPricingPageMetadata(): Metadata {
  const { title, description } = PRICING_PAGE_COPY.seo;
  return buildPublicPageMetadata({
    title,
    description,
    canonicalPath: "/pricing",
  });
}
