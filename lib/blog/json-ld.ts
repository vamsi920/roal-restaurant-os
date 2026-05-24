import { getCategoryLabel } from "./categories";
import { blogPublishedInstant } from "./dates";
import { getBlogCanonicalPath } from "./validate-seo";
import type { BlogFaqItem, BlogPost } from "./types";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-url";

const PUBLISHER_NAME = "ROAL";
const JOURNAL_NAME = "The ROAL Journal";

function jsonLdBaseUrl(): string {
  return getSiteOrigin() ?? "http://localhost:3000";
}

function articleUrl(slug: string): string {
  return absoluteUrl(getBlogCanonicalPath(slug)) ?? `${jsonLdBaseUrl()}${getBlogCanonicalPath(slug)}`;
}

function faqMainEntity(items: BlogFaqItem[]) {
  return items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  }));
}

export function buildBlogPostingJsonLd(post: BlogPost) {
  const content = post.content;
  if (!content) return null;

  const seo = content.seo;
  const url = articleUrl(post.slug);
  const description = seo.description || content.summary || post.excerpt;
  const keywords = post.categorySlugs.map((slug) => getCategoryLabel(slug));

  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description,
    datePublished: blogPublishedInstant(post.publishedAt),
    dateModified: blogPublishedInstant(post.publishedAt),
    author: {
      "@type": "Organization",
      name: content.author,
    },
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      url: jsonLdBaseUrl(),
    },
    isPartOf: {
      "@type": "Blog",
      name: JOURNAL_NAME,
      url: `${jsonLdBaseUrl()}/blog`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    articleSection: getCategoryLabel(post.primaryCategorySlug),
    keywords: keywords.join(", "),
    inLanguage: "en-US",
    timeRequired: `PT${post.readTimeMinutes}M`,
  };
}

export function buildFaqPageJsonLd(post: BlogPost) {
  const content = post.content;
  if (!content || content.faq.length === 0) return null;

  const url = articleUrl(post.slug);

  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    mainEntity: faqMainEntity(content.faq),
  };
}

/** BlogPosting + FAQPage in one graph for a single script tag. */
export function buildArticleJsonLdGraph(post: BlogPost) {
  const blogPosting = buildBlogPostingJsonLd(post);
  if (!blogPosting) return null;

  const graph: Record<string, unknown>[] = [blogPosting];
  const faqPage = buildFaqPageJsonLd(post);
  if (faqPage) graph.push(faqPage);

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
