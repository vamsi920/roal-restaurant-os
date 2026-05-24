export const BLOG_CATEGORY_SLUGS = [
  "missed-calls",
  "phone-orders",
  "operations",
  "pricing",
  "ai-basics",
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORY_SLUGS)[number];

export const BLOG_CATEGORIES: { slug: BlogCategorySlug; label: string }[] = [
  { slug: "missed-calls", label: "Missed calls" },
  { slug: "phone-orders", label: "Phone orders" },
  { slug: "operations", label: "Operations" },
  { slug: "pricing", label: "Pricing" },
  { slug: "ai-basics", label: "AI basics" },
];

const LABEL_BY_SLUG = Object.fromEntries(
  BLOG_CATEGORIES.map((c) => [c.slug, c.label])
) as Record<BlogCategorySlug, string>;

export function getCategoryLabel(slug: BlogCategorySlug): string {
  return LABEL_BY_SLUG[slug];
}
