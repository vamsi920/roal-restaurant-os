import { BLOG_POSTS } from "./posts";
import type { BlogArticleContent } from "./types";

export const BLOG_AEO_FAQ_MIN = 3;
export const BLOG_AEO_FAQ_MAX = 5;

export function validateBlogAeoContent(
  slug: string,
  content: BlogArticleContent
): void {
  if (!content.answerShort.trim()) {
    throw new Error(`[blog] ${slug}: answerShort is required`);
  }
  if (content.faq.length < BLOG_AEO_FAQ_MIN || content.faq.length > BLOG_AEO_FAQ_MAX) {
    throw new Error(
      `[blog] ${slug}: expected ${BLOG_AEO_FAQ_MIN}-${BLOG_AEO_FAQ_MAX} FAQ items, got ${content.faq.length}`
    );
  }
  const questions = new Set<string>();
  for (const item of content.faq) {
    if (!item.question.trim() || !item.answer.trim()) {
      throw new Error(`[blog] ${slug}: FAQ question and answer must be non-empty`);
    }
    if (questions.has(item.question)) {
      throw new Error(`[blog] ${slug}: duplicate FAQ question`);
    }
    questions.add(item.question);
  }
}

/** Throws at module load if any published article fails AEO checks. */
export function validateAllBlogAeo(): void {
  for (const post of BLOG_POSTS) {
    if (!post.content) {
      throw new Error(`[blog] ${post.slug}: missing article content`);
    }
    validateBlogAeoContent(post.slug, post.content);
  }
}
