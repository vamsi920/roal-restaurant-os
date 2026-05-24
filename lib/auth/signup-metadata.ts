import type { Metadata } from "next";
import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";
import { buildAuthPageMetadata } from "@/lib/seo/public-open-graph";

export function buildSignupPageMetadata(): Metadata {
  const { title, description } = SIGNUP_PAGE_COPY.seo;
  return buildAuthPageMetadata({
    title,
    description,
    canonicalPath: "/signup",
  });
}
