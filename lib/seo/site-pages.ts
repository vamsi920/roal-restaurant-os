/**
 * Registry of public SEO pages: one source for routes, the sitemap, llms.txt,
 * footer/hub links and the blog generator's allowed internal links.
 */

export type SeoPageRef = { slug: string; label: string };

/** /for/<slug> — restaurant-type landing pages. */
export const FOR_TYPES: SeoPageRef[] = [
  { slug: "pizza", label: "Pizza shops" },
  { slug: "chinese", label: "Chinese takeout" },
  { slug: "indian", label: "Indian restaurants" },
  { slug: "thai", label: "Thai restaurants" },
  { slug: "mexican", label: "Mexican restaurants" },
  { slug: "italian", label: "Italian restaurants" },
  { slug: "sushi", label: "Sushi and Japanese" },
  { slug: "delis", label: "Delis and sandwich shops" },
  { slug: "bagel-shops", label: "Bagel shops" },
  { slug: "diners", label: "Diners and breakfast spots" },
  { slug: "burgers", label: "Burger joints" },
  { slug: "wings", label: "Wing shops" },
  { slug: "halal", label: "Halal restaurants" },
  { slug: "mediterranean", label: "Mediterranean and Greek" },
  { slug: "bbq", label: "BBQ restaurants" },
  { slug: "bakeries", label: "Bakeries and cake shops" },
  { slug: "caribbean", label: "Caribbean restaurants" },
  { slug: "korean", label: "Korean restaurants" },
  { slug: "latin", label: "Latin American restaurants" },
  { slug: "seafood", label: "Seafood restaurants" },
  { slug: "caterers", label: "Caterers" },
  { slug: "food-trucks", label: "Food trucks" },
  { slug: "ghost-kitchens", label: "Ghost kitchens" },
  { slug: "restaurant-groups", label: "Multi-location groups" },
];

/** /use-cases/<slug> */
export const USE_CASES: SeoPageRef[] = [
  { slug: "rush-hour", label: "Rush-hour phone orders" },
  { slug: "after-hours", label: "After-hours calls" },
  { slug: "catering", label: "Catering inquiries" },
  { slug: "reservations", label: "Reservation requests" },
  { slug: "menu-questions", label: "Menu, hours and allergen questions" },
  { slug: "multilingual", label: "Callers in other languages" },
  { slug: "holidays", label: "Holiday rushes" },
  { slug: "short-staffed", label: "Short-staffed shifts" },
  { slug: "multi-location", label: "Multiple locations" },
  { slug: "pickup-orders", label: "Pickup order taking" },
];

/** /compare/<slug> — ROAL vs a category (never a named competitor). */
export const COMPARE_PAGES: SeoPageRef[] = [
  { slug: "per-order-pricing", label: "Pay-per-order AI phone answering: flat fee vs percentage" },
  { slug: "answering-service", label: "AI phone host vs answering service" },
  { slug: "voicemail", label: "AI phone host vs voicemail" },
  { slug: "hiring-phone-staff", label: "AI phone host vs hiring phone staff" },
  { slug: "delivery-apps", label: "Phone orders vs delivery apps" },
  { slug: "online-ordering", label: "AI phone host vs online ordering" },
  { slug: "phone-menu-ivr", label: "AI phone host vs a press-1 phone menu" },
  { slug: "monthly-ai-phone-plans", label: "Pay per order vs monthly AI phone plans" },
];

/** /tools/<slug> — free calculators. */
export const TOOLS: SeoPageRef[] = [
  { slug: "missed-call-calculator", label: "Missed call cost calculator" },
  { slug: "delivery-commission-calculator", label: "Delivery app commission calculator" },
  { slug: "phone-staff-cost-calculator", label: "Phone staff cost calculator" },
  { slug: "phone-host-cost-calculator", label: "AI phone host cost calculator" },
  { slug: "phone-greeting-templates", label: "Phone greeting templates" },
  { slug: "call-forwarding-codes", label: "Call forwarding codes by carrier" },
];

/** /locations/<slug> */
export const LOCATIONS: SeoPageRef[] = [
  { slug: "jersey-city", label: "Jersey City, NJ" },
  { slug: "hoboken", label: "Hoboken, NJ" },
  { slug: "new-jersey", label: "New Jersey" },
  { slug: "new-york-city", label: "New York City" },
];

/** Static marketing and hub paths. */
export const CORE_PAGES: { path: string; label: string }[] = [
  { path: "/", label: "Home" },
  { path: "/try", label: "Build a free test host" },
  { path: "/pricing", label: "Pricing" },
  { path: "/about", label: "About ROAL" },
  { path: "/security", label: "Security" },
  { path: "/facts", label: "ROAL facts" },
  { path: "/faq", label: "Questions owners ask" },
  { path: "/how-it-works", label: "How it works" },
  { path: "/for", label: "Restaurant types" },
  { path: "/use-cases", label: "Use cases" },
  { path: "/compare", label: "Comparisons" },
  { path: "/tools", label: "Free tools" },
  { path: "/glossary", label: "Restaurant phone glossary" },
  { path: "/locations", label: "Locations" },
  { path: "/blog", label: "Blog" },
];

/** Every internal path blog posts may link to, with a label for the generator prompt. */
export const SEO_LINKS: { path: string; label: string }[] = [
  ...CORE_PAGES.filter((p) => p.path !== "/"),
  ...FOR_TYPES.map((p) => ({ path: `/for/${p.slug}`, label: `ROAL for ${p.label.toLowerCase()}` })),
  ...USE_CASES.map((p) => ({ path: `/use-cases/${p.slug}`, label: p.label })),
  ...COMPARE_PAGES.map((p) => ({ path: `/compare/${p.slug}`, label: p.label })),
  ...TOOLS.map((p) => ({ path: `/tools/${p.slug}`, label: p.label })),
  ...LOCATIONS.map((p) => ({ path: `/locations/${p.slug}`, label: `ROAL in ${p.label}` })),
];
