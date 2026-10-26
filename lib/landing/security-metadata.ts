import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildSecurityPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Security — ROAL",
    description:
      "How ROAL handles caller data: scoped per restaurant, staff logins, call transcripts and ticket history kept for review, and a human handoff for anything the host should not decide.",
    canonicalPath: "/security",
  });
}
