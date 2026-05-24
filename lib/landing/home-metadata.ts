import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const HOME_SEO = {
  title: "ROAL — More pickup calls answered during rush",
  description:
    "Answer more rush-hour pickup calls from your live menu and send tickets to your kitchen while you run the floor.",
} as const;

export function buildHomePageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    canonicalPath: "/",
  });
}
