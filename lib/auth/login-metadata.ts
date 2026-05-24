import type { Metadata } from "next";
import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { buildAuthPageMetadata } from "@/lib/seo/public-open-graph";

export function buildLoginPageMetadata(): Metadata {
  const { title, description } = LOGIN_PAGE_COPY.seo;
  return buildAuthPageMetadata({
    title,
    description,
    canonicalPath: "/login",
  });
}
