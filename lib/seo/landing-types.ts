/** Shape of content/pages/<family>/<slug>.json written by scripts/seo/generate-pages.ts. */
export type LandingPageJson = {
  slug: string;
  label: string;
  h1: string;
  seoTitle: string;
  description: string;
  lead: string;
  question: string;
  answer: string;
  pains: { title: string; body: string }[];
  howItHelps: { title: string; body: string }[];
  sampleCall: { who: "caller" | "host"; line: string }[];
  sampleTicket: { title: string; lines: string[]; note?: string };
  sections: { h2: string; body: string }[];
  faq: { q: string; a: string }[];
  table?: { otherName: string; rows: { label: string; roal: string; other: string }[] };
  verdict?: string;
};

export type GlossaryEntryJson = { slug: string; term: string; short: string; body: string };
