import type { BlogCategorySlug } from "./categories";

export type BlogArticleSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type BlogFaqItem = {
  question: string;
  answer: string;
};

export type BlogArticleSeo = {
  title: string;
  description: string;
};

export type BlogArticleCta = {
  href: string;
  label: string;
  description?: string;
};

export type BlogArticleContent = {
  summary: string;
  /** Primary question this article answers (defaults to first FAQ question). */
  aeoQuestion?: string;
  answerShort: string;
  author: string;
  seo: BlogArticleSeo;
  sections: BlogArticleSection[];
  faq: BlogFaqItem[];
  relatedSlugs: string[];
  cta: BlogArticleCta;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  primaryCategorySlug: BlogCategorySlug;
  categorySlugs: BlogCategorySlug[];
  readTimeMinutes: number;
  publishedAt: string;
  featured?: boolean;
  content?: BlogArticleContent;
};

export type BlogCategory = {
  slug: BlogCategorySlug;
  label: string;
};
