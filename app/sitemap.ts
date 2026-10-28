import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { blogPublishedInstant } from "@/lib/blog/dates";
import { getGlossary, getLandingPages, LANDING_FAMILIES, type LandingFamily } from "@/lib/seo/landing";
import { CORE_PAGES, TOOLS } from "@/lib/seo/site-pages";
import { getSiteOrigin } from "@/lib/site-url";

// Rebuilt hourly so scheduled posts join the sitemap on their publish day.
export const revalidate = 3600;

/** Launch public pages (prompt 74). SEO hubs, landing pages and blog posts are added below. */
export const SITEMAP_PUBLIC_PATHS = [
  "",
  "/try",
  "/pricing",
  "/blog",
  "/about",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
] as const;

/** Date the generated SEO pages were last meaningfully changed. */
const SEO_PAGES_UPDATED = new Date("2026-10-28T12:00:00.000Z");

function priority(path: string): number {
  if (path === "") return 1;
  if (path === "/pricing" || path === "/try") return 0.9;
  if (path === "/blog" || path === "/how-it-works" || path === "/facts") return 0.85;
  if (path === "/privacy" || path === "/terms") return 0.4;
  return 0.7;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin() ?? "https://tryroal.com";
  const now = new Date();
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  const add = (path: string, lastModified: Date, changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"], p = priority(path)) => {
    if (seen.has(path)) return;
    seen.add(path);
    out.push({ url: `${origin}${path}`, lastModified, changeFrequency, priority: p });
  };

  for (const path of SITEMAP_PUBLIC_PATHS) add(path, now, path === "" || path === "/blog" ? "daily" : "monthly");
  for (const page of CORE_PAGES) add(page.path === "/" ? "" : page.path, SEO_PAGES_UPDATED, "weekly");
  for (const fam of Object.keys(LANDING_FAMILIES) as LandingFamily[]) {
    for (const p of getLandingPages(fam)) add(`/${fam}/${p.slug}`, SEO_PAGES_UPDATED, "monthly", 0.8);
  }
  for (const t of TOOLS) add(`/tools/${t.slug}`, SEO_PAGES_UPDATED, "monthly", 0.8);
  for (const g of getGlossary()) add(`/glossary/${g.slug}`, SEO_PAGES_UPDATED, "monthly", 0.5);
  for (const c of BLOG_CATEGORIES) add(`/blog/topic/${c.slug}`, now, "weekly", 0.6);
  for (const post of getAllPosts()) add(`/blog/${post.slug}`, new Date(blogPublishedInstant(post.publishedAt)), "monthly", 0.7);

  return out;
}
