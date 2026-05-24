import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const SECURITY_SEO = {
  title: "Security — ROAL for restaurants",
  description:
    "How ROAL protects guest names and phones: scoped access per restaurant, order audit trails, human handoff, and verified phone-agent requests.",
} as const;

export function buildSecurityPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: SECURITY_SEO.title,
    description: SECURITY_SEO.description,
    canonicalPath: "/security",
  });
}
