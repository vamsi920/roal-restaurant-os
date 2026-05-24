/** Copy for `/blog` index (The ROAL Journal). */

export const BLOG_INDEX_COPY = {
  hero: {
    eyebrow: "Journal",
    title: "The ROAL Journal",
    description:
      "Short guides for owners on pickup phones, live-menu phone ordering, and kitchen tickets.",
  },
  featured: {
    titleId: "blog-featured-heading",
    label: "Featured reads",
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
  title: "The ROAL Journal — ROAL",
  description:
    "Practical guides for restaurant owners: missed phone calls, pickup phone ordering, live menus, and kitchen tickets.",
} as const;

export const BLOG_FEATURED_COUNT = 3;
