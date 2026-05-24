import { BLOG_POSTS } from "./posts";
import type { BlogArticleContent, BlogPost } from "./types";

const INLINE_LINK_RE = /\[([^\]]+)\]\((\/[^)]+)\)/g;

/** Article CTAs and inline marketing paths must resolve to real routes. */
export const BLOG_ALLOWED_CTA_HREFS = ["/demo", "/signup", "/pricing", "/contact"] as const;

const ALLOWED_INLINE_PATHS = new Set<string>([
  "/pricing",
  "/contact",
  "/demo",
  "/signup",
  "/blog",
  ...BLOG_ALLOWED_CTA_HREFS,
]);

function collectInlinePaths(content: BlogArticleContent): string[] {
  const paths: string[] = [];
  for (const section of content.sections) {
    for (const paragraph of section.paragraphs) {
      for (const match of paragraph.matchAll(INLINE_LINK_RE)) {
        paths.push(match[2]);
      }
    }
  }
  return paths;
}

function assertInlinePath(slug: string, path: string, blogSlugs: Set<string>): void {
  if (path.startsWith("/blog/")) {
    const postSlug = path.slice("/blog/".length).replace(/\/$/, "");
    if (!blogSlugs.has(postSlug)) {
      throw new Error(`[blog] ${slug}: dead inline link ${path}`);
    }
    return;
  }
  if (!ALLOWED_INLINE_PATHS.has(path)) {
    throw new Error(`[blog] ${slug}: disallowed inline link ${path}`);
  }
}

function assertRelatedSlugs(post: BlogPost, blogSlugs: Set<string>): void {
  const slug = post.slug;
  const related = post.content?.relatedSlugs ?? [];
  const seen = new Set<string>();

  for (const relatedSlug of related) {
    if (relatedSlug === slug) {
      throw new Error(`[blog] ${slug}: relatedSlugs must not include self`);
    }
    if (!blogSlugs.has(relatedSlug)) {
      throw new Error(`[blog] ${slug}: dead relatedSlug ${relatedSlug}`);
    }
    if (seen.has(relatedSlug)) {
      throw new Error(`[blog] ${slug}: duplicate relatedSlug ${relatedSlug}`);
    }
    seen.add(relatedSlug);
  }
}

function assertCta(post: BlogPost): void {
  const cta = post.content?.cta;
  if (!cta?.href?.trim()) {
    throw new Error(`[blog] ${post.slug}: cta.href is required`);
  }
  if (!(BLOG_ALLOWED_CTA_HREFS as readonly string[]).includes(cta.href)) {
    throw new Error(`[blog] ${post.slug}: invalid cta.href ${cta.href}`);
  }
}

/** Throws at module load if any article has broken related/inline/CTA links. */
export function validateAllBlogLinks(): void {
  const blogSlugs = new Set(BLOG_POSTS.map((p) => p.slug));

  for (const post of BLOG_POSTS) {
    if (!post.content) {
      throw new Error(`[blog] ${post.slug}: missing article content`);
    }
    assertRelatedSlugs(post, blogSlugs);
    assertCta(post);
    for (const path of collectInlinePaths(post.content)) {
      assertInlinePath(post.slug, path, blogSlugs);
    }
  }
}
