import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildPrivacyPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Privacy policy — ROAL",
    description:
      "What ROAL collects from callers and restaurants, how it is used, and how to reach us. Caller name and phone are used for the pickup order only.",
    canonicalPath: "/privacy",
  });
}

export function buildTermsPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Terms of service — ROAL",
    description:
      "Terms for using ROAL: $0.90 per completed phone order, no contract, cancel any time.",
    canonicalPath: "/terms",
  });
}
