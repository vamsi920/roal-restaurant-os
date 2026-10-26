/** Public site navigation — one source for the floating nav and the auth header. */

export const SITE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const;

export const SITE_NAV_SIGN_IN = { href: "/login", label: "Sign in" } as const;

export const SITE_NAV_TRY = { href: "/try", label: "Try it free" } as const;

export type SiteNavLink = (typeof SITE_NAV_LINKS)[number];

/** Footer columns — every href must exist as a route. */
export const SITE_FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/try", label: "Try it free" },
      { href: "/demo", label: "Demo" },
      { href: "/security", label: "Security" },
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
  "An AI phone host for restaurants. It answers, takes pickup orders from your live menu, and sends the ticket to your kitchen." as const;
