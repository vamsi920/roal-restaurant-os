/** Public site navigation — one source for the floating nav and the auth header. */

export const SITE_NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "Company" },
] as const;

export const SITE_NAV_SIGN_IN = { href: "/login", label: "Sign in" } as const;

export const SITE_NAV_TRY = { href: "/try", label: "Get started" } as const;

export type SiteNavLink = (typeof SITE_NAV_LINKS)[number];

/** Footer columns — every href must exist as a route. */
export const SITE_FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/how-it-works", label: "How it works (guide)" },
      { href: "/try", label: "Try it free" },
      { href: "/security", label: "Security" },
      { href: "/faq", label: "FAQ" },
      { href: "/facts", label: "Facts" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/tools", label: "Free tools" },
      { href: "/tools/missed-call-calculator", label: "Missed call calculator" },
      { href: "/tools/call-forwarding-codes", label: "Call forwarding codes" },
      { href: "/compare", label: "Comparisons" },
      { href: "/glossary", label: "Glossary" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Restaurants",
    links: [
      { href: "/for/pizza", label: "Pizza shops" },
      { href: "/for/chinese", label: "Chinese takeout" },
      { href: "/for/indian", label: "Indian restaurants" },
      { href: "/for/delis", label: "Delis" },
      { href: "/for", label: "All restaurant types" },
      { href: "/use-cases", label: "Use cases" },
      { href: "/locations/jersey-city", label: "Jersey City" },
      { href: "/locations/hoboken", label: "Hoboken" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export const SITE_FOOTER_LINE =
  "The AI phone host for restaurants. It answers, takes orders from your live menu, and sends the ticket to your kitchen." as const;

export const SITE_FOOTER_MADE_FOR = "Made for restaurants" as const;

/** Launch directories that list ROAL; some require a link back from our footer to keep the listing. */
export const SITE_FEATURED_ON = [
  { label: "Product Hunt", href: "https://www.producthunt.com/products/roal" },
  { label: "Indie Hackers", href: "https://www.indiehackers.com/product/roal" },
  { label: "Twelve Tools", href: "https://twelve.tools" },
  { label: "Tiny Startups", href: "https://www.tinystartups.com" },
  { label: "Future Tools", href: "https://www.futuretools.io" },
] as const;
