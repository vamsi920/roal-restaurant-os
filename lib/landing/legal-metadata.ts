import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildPrivacyPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Privacy policy (draft) — ROAL",
    description:
      "Draft privacy placeholder for ROAL pilots: guest data scoped per restaurant, no resale. Full policy coming before general launch.",
    canonicalPath: "/privacy",
  });
}

export function buildTermsPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Terms of service (draft) — ROAL",
    description:
      "Draft terms placeholder for ROAL pilots. Written pilot agreements define pricing, success fees, and support before live guest calls.",
    canonicalPath: "/terms",
  });
}
