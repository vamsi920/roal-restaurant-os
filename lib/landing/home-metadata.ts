import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const HOME_SEO = {
  title: "ROAL - AI phone agent that answers restaurant pickup calls",
  description:
    "ROAL answers busy restaurant phone calls in a natural voice, takes pickup orders from your live menu, sends tickets to the kitchen, and charges only for real orders.",
} as const;

export function buildHomePageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    canonicalPath: "/",
  });
}
