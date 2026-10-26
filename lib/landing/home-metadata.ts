import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const HOME_SEO = {
  title: "ROAL — The AI phone host for restaurants",
  description:
    "Paste your restaurant link, talk to your own AI phone host in about a minute, then forward your number. ROAL takes pickup orders from your live menu and charges $0.90 per completed order, nothing otherwise.",
} as const;

export function buildHomePageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    canonicalPath: "/",
  });
}
