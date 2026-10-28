import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export function buildContactPageMetadata(): Metadata {
  return buildPublicPageMetadata({
    title: "Contact — ROAL",
    description:
      "Questions about ROAL, volume pricing, or going live? Email venva920@gmail.com and a person replies.",
    canonicalPath: "/contact",
  });
}
