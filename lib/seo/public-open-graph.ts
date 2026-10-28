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
  /** Share image path; defaults to the site card at /opengraph-image. */
  ogImage?: string;
};

export const DEFAULT_OG_IMAGE = "/opengraph-image";

/** Text-first Open Graph — title + description only (no OG image). */
export function buildTextFirstOpenGraph(
  title: string,
  description: string,
  canonicalPath: string,
  type: "website" | "article" = "website",
  article?: OpenGraphArticleExtras,
  ogImage: string = DEFAULT_OG_IMAGE
): NonNullable<Metadata["openGraph"]> {
  const url = absoluteUrl(canonicalPath) ?? canonicalPath;

  return {
    title,
    description,
    type,
    url,
    locale: OG_LOCALE,
    siteName: SITE_NAME,
    images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    ...(type === "article" && article ? article : {}),
  };
}

/** Twitter card; the image comes from app/twitter-image.tsx. */
export function buildTextFirstTwitter(
  title: string,
  description: string,
  ogImage: string = DEFAULT_OG_IMAGE
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
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
    ogImage = DEFAULT_OG_IMAGE,
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
      article,
      ogImage
    ),
    twitter: buildTextFirstTwitter(title, description, ogImage),
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
      card: "summary_large_image",
    },
  };
}
