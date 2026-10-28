/** Shape of content/blog/<slug>.json written by scripts/seo/generate-posts.ts. */
export type GeneratedPostJson = {
  slug: string;
  keyword: string;
  category: string;
  title: string;
  seoTitle: string;
  description: string;
  question: string;
  answer: string;
  summary: string;
  intro: string;
  sections: { id: string; h2: string; body: string }[];
  takeaways: string[];
  faq: { q: string; a: string }[];
  words: number;
  generatedAt: string;
};
