import { isValidBlogPublishedDate } from "./dates";
import type { BlogPost } from "./types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TITLE_MIN = 20;
const TITLE_MAX = 80;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 165;

/** Throws at module load if blog SEO roster is inconsistent. */
export function validateAllBlogSeo(posts: readonly BlogPost[]): void {
  const slugs = new Set<string>();

  for (const post of posts) {
    const { slug } = post;

    if (!SLUG_RE.test(slug)) {
      throw new Error(`[blog] ${slug}: slug must be lowercase kebab-case`);
    }
    if (slugs.has(slug)) {
      throw new Error(`[blog] duplicate slug ${slug}`);
    }
    slugs.add(slug);

    if (!isValidBlogPublishedDate(post.publishedAt)) {
      throw new Error(`[blog] ${slug}: invalid publishedAt ${post.publishedAt}`);
    }

    const seo = post.content?.seo;
    if (!seo?.title?.trim() || !seo?.description?.trim()) {
      throw new Error(`[blog] ${slug}: seo.title and seo.description required`);
    }

    const titleLen = seo.title.length;
    if (titleLen < TITLE_MIN || titleLen > TITLE_MAX) {
      throw new Error(
        `[blog] ${slug}: seo.title length ${titleLen} (expected ${TITLE_MIN}-${TITLE_MAX})`
      );
    }

    const descLen = seo.description.length;
    if (descLen < DESCRIPTION_MIN || descLen > DESCRIPTION_MAX) {
      throw new Error(
        `[blog] ${slug}: seo.description length ${descLen} (expected ${DESCRIPTION_MIN}-${DESCRIPTION_MAX})`
      );
    }

  }

  if (slugs.size !== posts.length) {
    throw new Error("[blog] slug count mismatch in BLOG_POSTS");
  }
}

export function getBlogCanonicalPath(slug: string): `/blog/${string}` {
  return `/blog/${slug}`;
}
