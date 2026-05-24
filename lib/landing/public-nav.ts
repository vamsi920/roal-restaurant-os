/** Shared public nav IA (homepage + marketing shell). */

import { PUBLIC_CTA } from "@/lib/landing/public-cta";

/** Primary nav — minimal launch IA (prompt 36). */
export const PUBLIC_NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/demo", label: "Demo" },
  { href: "/about", label: "About" },
] as const;

export const PUBLIC_NAV_LOGIN = {
  href: "/login",
  label: "Login",
} as const;

/** Header pill CTA (replaces “Book a demo” in nav chrome). */
export const PUBLIC_NAV_SIGNUP = PUBLIC_CTA.signUp;

/** @deprecated Footer legacy — prefer `PUBLIC_NAV_SIGNUP` in header. */
export const PUBLIC_NAV_BOOK_DEMO = PUBLIC_CTA.bookDemo;

export type PublicNavLink = (typeof PUBLIC_NAV_LINKS)[number];
