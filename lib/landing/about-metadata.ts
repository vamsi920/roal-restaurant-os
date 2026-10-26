import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildAboutPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "About ROAL — An AI phone host for restaurants",
    description:
      "Why we built ROAL: busy restaurants miss calls, and every missed call is a missed order. ROAL answers, takes the order from your live menu, and sends the ticket to the kitchen.",
    canonicalPath: "/about",
  });
}
