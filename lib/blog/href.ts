import { getBlogCanonicalPath } from "./validate-seo";

/** Canonical article path for index cards, related posts, and inline QA. */
export function getBlogPostHref(slug: string): `/blog/${string}` {
  return getBlogCanonicalPath(slug);
}
