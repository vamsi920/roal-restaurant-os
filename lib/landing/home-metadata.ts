import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const HOME_SEO = {
  title: "ROAL - AI phone agent that takes restaurant pickup orders",
  description:
    "ROAL answers restaurant pickup calls, speaks naturally in the customer's language, takes orders from your live menu, sends kitchen tickets, and charges only for successful orders.",
} as const;

export function buildHomePageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    canonicalPath: "/",
  });
}
