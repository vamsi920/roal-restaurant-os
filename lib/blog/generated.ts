import { BLOG_CATEGORY_SLUGS, type BlogCategorySlug } from "./categories";
import { GENERATED_POST_JSON, GENERATED_RELATED, GENERATED_SCHEDULE } from "./generated-index";
import type { BlogPost } from "./types";

export const BLOG_AUTHOR = "Venkata Vamsi";

/** Card excerpts stay short; the full summary is still shown on the article. */
function shortExcerpt(text: string, max = 120): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "")}…`;
}

const isCategory = (s: string): s is BlogCategorySlug => (BLOG_CATEGORY_SLUGS as readonly string[]).includes(s);

/** content/blog/*.json → BlogPost. Publish date comes from content/blog/_schedule.json. */
export const GENERATED_POSTS: BlogPost[] = GENERATED_POST_JSON.map((g) => {
  const category = isCategory(g.category) ? g.category : "operations";
  return {
    slug: g.slug,
    title: g.title,
    excerpt: shortExcerpt(g.summary),
    primaryCategorySlug: category,
    categorySlugs: [category],
    readTimeMinutes: Math.max(4, Math.round(g.words / 230)),
    publishedAt: GENERATED_SCHEDULE[g.slug] ?? "2026-10-28",
    content: {
      summary: g.summary,
      aeoQuestion: g.question,
      answerShort: g.answer,
      intro: g.intro,
      takeaways: g.takeaways,
      keyword: g.keyword,
      wordCount: g.words,
      author: BLOG_AUTHOR,
      seo: { title: g.seoTitle, description: g.description },
      sections: g.sections.map((s) => ({ id: s.id, title: s.h2, paragraphs: [], body: s.body })),
      faq: g.faq.map((f) => ({ question: f.q, answer: f.a })),
      relatedSlugs: GENERATED_RELATED[g.slug] ?? [],
      cta: { href: "/try", label: "Build your free test host", description: "Paste your website or Google Maps link and call your own phone host in about a minute." },
    },
  };
});
