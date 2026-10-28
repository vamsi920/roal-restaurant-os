import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildSecurityPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Security and caller data | ROAL",
    description:
      "How ROAL handles caller data: kept per restaurant, staff logins, call transcripts and ticket history for review, and a human handoff for tricky calls.",
    canonicalPath: "/security",
  });
}
