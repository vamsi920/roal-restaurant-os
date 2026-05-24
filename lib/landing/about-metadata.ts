import type { Metadata } from "next";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildAboutPageMetadata(): Metadata {
  const { title, description } = ABOUT_PAGE_COPY.seo;
  return buildPublicPageMetadata({
    title,
    description,
    canonicalPath: "/about",
  });
}
