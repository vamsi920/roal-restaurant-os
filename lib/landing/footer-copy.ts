import { PUBLIC_CTA } from "@/lib/landing/public-cta";

/** Minimal launch footer — brand, demo/contact, essential + legal links. */

export const LANDING_FOOTER = {
  brandName: "ROAL",
  brandHref: "/",
  tagline: "The phone agent for pickup orders during rush.",
  demoCta: PUBLIC_CTA.hearDemo,
  contactCta: { href: "/contact", label: "Contact" },
  essentialLinks: [
    { href: "/pricing", label: "Pricing" },
    { href: "/demo", label: "Demo" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ] as const,
  copyrightName: "ROAL",
} as const;

/** @deprecated Story footer */
export const FOOTER_COPY = {
  headline: "The next call does not have to go unanswered.",
  lead: "$0.90 per successful order. If it does not become an order, you do not pay.",
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
  { href: "/#proof", label: "Product capabilities" },
] as const;

/** @deprecated */
export const FOOTER_PLATFORM_LINKS = [
  { href: "/signup?next=/dashboard/restaurants", label: "Start setup" },
  { href: "/login?next=/dashboard", label: "Dashboard" },
] as const;
