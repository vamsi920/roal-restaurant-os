/** Copy for `/blog` index (The ROAL Journal). */

export const BLOG_INDEX_COPY = {
  hero: {
    eyebrow: "Guides for restaurant owners",
    title: "The ROAL Journal",
    description:
      "Practical guides on phone orders, missed calls, call forwarding, menus and busy nights, written for independent restaurant owners.",
  },
  featured: {
    titleId: "blog-featured-heading",
    label: "Start here",
  },
  allPosts: {
    titleId: "blog-all-heading",
    label: "All articles",
  },
  /** JSON-LD only — not rendered on the index page. */
  aeo: {
    titleId: "blog-index-aeo-heading",
    question: "What is The ROAL Journal?",
    answer:
      "The ROAL Journal is practical guides for independent restaurants on phone ordering, live menus, kitchen tickets, and success-based pricing.",
    detail: "Written for owners and managers—each article includes a short answer, deeper sections, and a small FAQ.",
  },
} as const;

export const BLOG_INDEX_METADATA = {
  title: "Restaurant Phone Orders & AI Answering Blog | ROAL",
  description:
    "Guides for restaurant owners: missed calls, phone order scripts, call forwarding, AI phone answering, menus, pricing and rush-hour operations.",
} as const;

export const BLOG_FEATURED_COUNT = 3;
