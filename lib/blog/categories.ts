export const BLOG_CATEGORY_SLUGS = [
  "missed-calls",
  "phone-orders",
  "operations",
  "pricing",
  "ai-basics",
  "menu",
  "marketing",
  "phone-setup",
  "staffing",
  "guest-experience",
  "comparisons",
  "restaurant-types",
  "local",
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORY_SLUGS)[number];

export const BLOG_CATEGORIES: { slug: BlogCategorySlug; label: string }[] = [
  { slug: "missed-calls", label: "Missed calls" },
  { slug: "phone-orders", label: "Phone orders" },
  { slug: "operations", label: "Operations" },
  { slug: "pricing", label: "Pricing" },
  { slug: "ai-basics", label: "AI basics" },
  { slug: "menu", label: "Menus & upsells" },
  { slug: "marketing", label: "Growth & marketing" },
  { slug: "phone-setup", label: "Phone setup" },
  { slug: "staffing", label: "Staff & training" },
  { slug: "guest-experience", label: "Guest experience" },
  { slug: "comparisons", label: "Comparisons" },
  { slug: "restaurant-types", label: "By restaurant type" },
  { slug: "local", label: "Local guides" },
];

/** One-line description per category, for hub pages and llms.txt. */
export const BLOG_CATEGORY_BLURBS: Record<BlogCategorySlug, string> = {
  "missed-calls": "Why restaurant calls go unanswered, what it costs, and how to catch more of them.",
  "phone-orders": "Taking pickup and delivery orders by phone: scripts, tickets, and fewer mistakes.",
  operations: "Running the front of house, kitchen screen and phone on busy nights.",
  pricing: "What phone answering, staffing and delivery apps really cost a restaurant.",
  "ai-basics": "AI phone answering for restaurants explained in plain words.",
  menu: "Menus that are easy to order from by phone, specials, allergens and upsells.",
  marketing: "Getting more calls and direct orders: Google, reviews, local search and more.",
  "phone-setup": "Call forwarding, carriers, VoIP and phone hardware for restaurants.",
  staffing: "Training, scheduling and keeping your team on the floor instead of the phone.",
  "guest-experience": "Phone scripts, greetings and hospitality for callers.",
  comparisons: "AI phone hosts compared with answering services, voicemail, staff and apps.",
  "restaurant-types": "Phone ordering playbooks for pizza, Chinese, Indian, delis and more.",
  local: "Guides for restaurant owners in Jersey City, Hoboken, New Jersey and New York.",
};

const LABEL_BY_SLUG = Object.fromEntries(
  BLOG_CATEGORIES.map((c) => [c.slug, c.label])
) as Record<BlogCategorySlug, string>;

export function getCategoryLabel(slug: BlogCategorySlug): string {
  return LABEL_BY_SLUG[slug];
}
