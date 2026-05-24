import { CONTACT_PILOT_EMAIL } from "./contact-page-copy";
import { PUBLIC_NAV_LOGIN, PUBLIC_NAV_SIGNUP } from "./public-nav";

/** Launch footer IA (homepage + marketing shell). */

export const LANDING_FOOTER = {
  tagline: "Phone orders for restaurants—live menu, kitchen tickets, pay per pickup.",
  trustLine:
    "Your data in your account · Real guest details on every ticket · Staff handoff when it matters.",
  copyrightName: "ROAL",
  email: CONTACT_PILOT_EMAIL,
  login: PUBLIC_NAV_LOGIN,
  signup: PUBLIC_NAV_SIGNUP,
  columns: [
    {
      title: "Product",
      links: [
        { href: "/demo", label: "Demo" },
        { href: "/pricing", label: "Pricing" },
        { href: "/security", label: "Security" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" },
      ],
    },
    {
      title: "Resources",
      links: [{ href: "/blog", label: "Blog" }],
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
      ],
    },
  ],
} as const;

/** @deprecated Story footer */
export const FOOTER_COPY = {
  headline: "The next call does not have to go unanswered.",
  lead: "ROAL answers with your real menu, streams the cart to your kitchen screen, and bills around successful pickups—not every ring.",
  trust:
    "Your data stays in your account · Real guest name and phone on finalize · Staff handoff when it matters",
  pilot: {
    title: "Pilot invitation",
    body: "We onboard a limited number of independents each month. Share your menu and rush-hour volume—we will show you the recovery path before you forward live calls.",
    cta: { href: "/contact", label: "Request a pilot" },
  },
  productTitle: "Product",
  companyTitle: "Company",
  platformTitle: "Platform",
} as const;

/** @deprecated */
export const FOOTER_PRODUCT_LINKS = [
  { href: "/demo", label: "Demo walkthrough" },
  { href: "/pricing", label: "Success pricing" },
  { href: "/#trust", label: "Trust & safety" },
  { href: "/security", label: "Security" },
] as const;

/** @deprecated */
export const FOOTER_COMPANY_LINKS = [
  { href: "/contact", label: "Contact & pilots" },
  { href: "/demo", label: "Hear the agent" },
  { href: "/#proof", label: "Pilot metrics" },
] as const;

/** @deprecated */
export const FOOTER_PLATFORM_LINKS = [
  { href: "/signup?next=/dashboard/restaurants", label: "Start setup" },
  { href: "/login?next=/dashboard", label: "Dashboard" },
] as const;
