import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildAboutPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "About ROAL — An AI phone host for restaurants",
    description:
      "About ROAL, the AI phone host for restaurants, built in Jersey City. It answers calls, takes orders from your live menu and sends the ticket to the kitchen.",
    canonicalPath: "/about",
  });
}
