import type { BlogCategorySlug } from "./categories";
import { BLOG_POSTS } from "./posts";
import type { BlogPost } from "./types";

export { BLOG_CATEGORIES, BLOG_CATEGORY_SLUGS, getCategoryLabel } from "./categories";
export type { BlogCategorySlug } from "./categories";
export { BLOG_POSTS } from "./posts";
export type {
  BlogArticleContent,
  BlogArticleSection,
  BlogFaqItem,
  BlogPost,
} from "./types";
export { BLOG_INDEX_COPY, BLOG_INDEX_METADATA } from "./index-copy";
export { BLOG_INDEX_RESULTS_ID, type BlogFilterValue } from "./filter";
export { getBlogFilterLabel } from "./filter-label";
export {
  buildBlogArticleMetadata,
  buildBlogIndexMetadata,
} from "./metadata";
export {
  buildArticleJsonLdGraph,
  buildBlogPostingJsonLd,
  buildFaqPageJsonLd,
} from "./json-ld";
export {
  BLOG_AEO_FAQ_MAX,
  BLOG_AEO_FAQ_MIN,
  validateAllBlogAeo,
  validateBlogAeoContent,
} from "./validate-aeo";
export {
  BLOG_ALLOWED_CTA_HREFS,
  validateAllBlogLinks,
} from "./validate-links";
export { blogPublishedInstant } from "./dates";
export { getBlogCanonicalPath, validateAllBlogSeo } from "./validate-seo";
export { getBlogPostHref } from "./href";
export { BLOG_CTA_DEMO, BLOG_CTA_MENU, blogCta } from "./cta";
export type { BlogCtaPreset } from "./cta";

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getFeaturedPosts(limit = 3): BlogPost[] {
  const posts = getAllPosts();
  const flagged = posts.filter((p) => p.featured);
  const rest = posts.filter((p) => !flagged.some((f) => f.slug === p.slug));
  return [...flagged, ...rest].slice(0, limit);
}

export function getFeaturedPost(): BlogPost {
  return getFeaturedPosts(1)[0]!;
}

export function getPostsForIndex(category: BlogCategorySlug | "all"): BlogPost[] {
  const posts = getAllPosts();
  if (category === "all") return posts;
  return posts.filter((p) => p.categorySlugs.includes(category));
}

export function formatPostDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export const BLOG_RELATED_POST_LIMIT = 3;

export function getRelatedPosts(post: BlogPost, limit = BLOG_RELATED_POST_LIMIT): BlogPost[] {
  const slugs = (post.content?.relatedSlugs ?? []).filter((s) => s !== post.slug);
  const bySlug = slugs
    .map((s) => getPostBySlug(s))
    .filter((p): p is BlogPost => Boolean(p));

  if (bySlug.length >= limit) return bySlug.slice(0, limit);

  const seen = new Set([post.slug, ...bySlug.map((p) => p.slug)]);
  const fallback = getAllPosts().filter(
    (p) =>
      !seen.has(p.slug) &&
      p.content &&
      p.categorySlugs.some((c) => post.categorySlugs.includes(c))
  );
  const merged = [...bySlug, ...fallback];
  if (merged.length >= limit) return merged.slice(0, limit);

  const anyOther = getAllPosts().filter((p) => !seen.has(p.slug) && p.content);
  return [...merged, ...anyOther].slice(0, limit);
}

export function getAllPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
