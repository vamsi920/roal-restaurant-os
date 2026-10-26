import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildDemoPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Demo — talk to your own AI phone host | ROAL",
    description:
      "The best demo is your own menu. Paste your restaurant link and call your AI phone host from the browser in about a minute.",
    canonicalPath: "/demo",
  });
}
