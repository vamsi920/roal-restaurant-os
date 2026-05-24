import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { AUTH_PAGE_ROBOTS, PUBLIC_PAGE_ROBOTS } from "@/lib/seo/robots-metadata";

export const SITE_NAME = "ROAL";
export const OG_LOCALE = "en_US" as const;

type OpenGraphArticleExtras = {
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  authors?: string[];
};

export type PublicPageMetadataInput = {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: Metadata["robots"];
  openGraphType?: "website" | "article";
  keywords?: Metadata["keywords"];
  article?: OpenGraphArticleExtras;
};

/** Text-first Open Graph — title + description only (no OG image). */
export function buildTextFirstOpenGraph(
  title: string,
  description: string,
  canonicalPath: string,
  type: "website" | "article" = "website",
  article?: OpenGraphArticleExtras
): NonNullable<Metadata["openGraph"]> {
  const url = absoluteUrl(canonicalPath) ?? canonicalPath;

  return {
    title,
    description,
    type,
    url,
    locale: OG_LOCALE,
    siteName: SITE_NAME,
    ...(type === "article" && article ? article : {}),
  };
}

/** Twitter summary card (not large image). */
export function buildTextFirstTwitter(
  title: string,
  description: string
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary",
    title,
    description,
  };
}

export function buildPublicPageMetadata(input: PublicPageMetadataInput): Metadata {
  const {
    title,
    description,
    canonicalPath,
    robots = PUBLIC_PAGE_ROBOTS,
    openGraphType = "website",
    keywords,
    article,
  } = input;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalPath,
    },
    robots,
    openGraph: buildTextFirstOpenGraph(
      title,
      description,
      canonicalPath,
      openGraphType,
      article
    ),
    twitter: buildTextFirstTwitter(title, description),
  };
}

export function buildAuthPageMetadata(input: Omit<PublicPageMetadataInput, "robots">): Metadata {
  return buildPublicPageMetadata({ ...input, robots: AUTH_PAGE_ROBOTS });
}

/** Root layout defaults — merged with per-page title/description/url. */
export function buildSiteMetadataDefaults(): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: OG_LOCALE,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
    },
  };
}
