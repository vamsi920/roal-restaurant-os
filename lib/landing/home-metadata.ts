import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const HOME_SEO = {
  title: "ROAL: AI Phone Answering & Ordering for Restaurants",
  description:
    "AI phone host for restaurants: answers calls, takes pickup orders from your live menu and sends tickets to your kitchen. $0.90 per completed order, no monthly fee.",
} as const;

export function buildHomePageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    canonicalPath: "/",
  });
}
