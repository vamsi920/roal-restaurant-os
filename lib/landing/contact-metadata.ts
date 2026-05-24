import type { Metadata } from "next";
import { CONTACT_PAGE_COPY } from "@/lib/landing/contact-page-copy";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildContactPageMetadata(): Metadata {
  const { title, description } = CONTACT_PAGE_COPY.seo;
  return buildPublicPageMetadata({
    title,
    description,
    canonicalPath: "/contact",
  });
}
