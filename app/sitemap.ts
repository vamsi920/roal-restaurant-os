import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { blogPublishedInstant } from "@/lib/blog/dates";
import { getSiteOrigin } from "@/lib/site-url";

/** Launch public pages (prompt 74). Blog slugs added separately. */
export const SITEMAP_PUBLIC_PATHS = [
  "",
  "/pricing",
  "/blog",
  "/about",
  "/demo",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
] as const;

const ALL_STATIC_PATHS = SITEMAP_PUBLIC_PATHS;

function changeFrequency(path: (typeof ALL_STATIC_PATHS)[number]): MetadataRoute.Sitemap[0]["changeFrequency"] {
  if (path === "" || path === "/blog") return "weekly";
  return "monthly";
}

function priority(path: (typeof ALL_STATIC_PATHS)[number]): number {
  if (path === "") return 1;
  if (path === "/blog") return 0.9;
  if (path === "/pricing" || path === "/demo" || path === "/contact") return 0.85;
  if (path === "/about" || path === "/security") return 0.8;
  if (path === "/privacy" || path === "/terms") return 0.55;
  return 0.7;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin() ?? "http://localhost:3000";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = ALL_STATIC_PATHS.map((path) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: changeFrequency(path),
    priority: priority(path),
  }));

  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${origin}/blog/${post.slug}`,
    lastModified: new Date(blogPublishedInstant(post.publishedAt)),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...blogEntries];
}
