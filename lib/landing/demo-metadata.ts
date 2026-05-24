import type { Metadata } from "next";
import { DEMO_PAGE_COPY } from "@/lib/landing/demo-page-copy";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildDemoPageMetadata(): Metadata {
  const { title, description } = DEMO_PAGE_COPY.seo;
  return buildPublicPageMetadata({
    title,
    description,
    canonicalPath: "/demo",
  });
}
