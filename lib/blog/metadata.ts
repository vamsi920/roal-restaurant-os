import type { Metadata } from "next";
import { getCategoryLabel } from "./categories";
import { blogPublishedInstant } from "./dates";
import { getBlogCanonicalPath } from "./validate-seo";
import { BLOG_INDEX_METADATA } from "./index-copy";
import type { BlogPost } from "./types";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

/** Metadata for `/blog` index. */
export function buildBlogIndexMetadata(): Metadata {
  const { title, description } = BLOG_INDEX_METADATA;
  return buildPublicPageMetadata({
    title,
    description,
    canonicalPath: "/blog",
  });
}

/** Metadata for `/blog/[slug]` article pages. */
export function buildBlogArticleMetadata(post: BlogPost): Metadata {
  const content = post.content;
  const seo = content?.seo;
  const title = seo?.title ?? `${post.title} | ROAL Journal`;
  const description = seo?.description ?? post.excerpt;
  const canonicalPath = getBlogCanonicalPath(post.slug);
  const publishedTime = blogPublishedInstant(post.publishedAt);
  const section = getCategoryLabel(post.primaryCategorySlug);
  const tags = post.categorySlugs.map((slug) => getCategoryLabel(slug));
  const author = content?.author ?? "ROAL Team";

  return buildPublicPageMetadata({
    title,
    description,
    canonicalPath,
    openGraphType: "article",
    keywords: tags,
    article: {
      publishedTime,
      modifiedTime: publishedTime,
      section,
      tags,
      authors: [author],
    },
  });
}
