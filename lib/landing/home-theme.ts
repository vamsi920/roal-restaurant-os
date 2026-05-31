import { PRICING_HERO_SIGNAL, PRICING_PILL_PRICE } from "@/lib/landing/pricing-core";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";
import {
  PUBLIC_NAV_LINKS,
  PUBLIC_NAV_LOGIN,
  PUBLIC_NAV_SIGNUP,
} from "./public-nav";

/** Homepage-only theme config (ethereal / glass). */

export const HOME_NAV = PUBLIC_NAV_LINKS;

export const HOME_NAV_SIGNUP = PUBLIC_NAV_SIGNUP;
export const HOME_NAV_LOGIN = PUBLIC_NAV_LOGIN;

export const HOME_HERO = {
  title: "Never miss another phone order.",
  lead: "ROAL answers, speaks the customer's language, takes the pickup order, and sends a clean ticket to your kitchen.",
} as const;

/** FAQ / teasers: compact pricing shorthand (full rate on /pricing). */
export const HOME_PRICING_PILL = {
  href: "/pricing",
  label: PRICING_PILL_PRICE,
} as const;

/** Hero only: high-visibility completed-order pricing line. */
export const HOME_HERO_PRICING_PILL = {
  href: "/pricing",
  label: PRICING_HERO_SIGNAL,
} as const;

/** Hero: demo primary, sign-up secondary (two actions only). */
export const HOME_HERO_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.signUpOnboarding,
} as const;

/** Home CTA band: demo primary, book demo mailto secondary. */
export const HOME_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.bookDemoMailto,
} as const;

/** @deprecated Use `HOME_HERO_VIDEO` from `@/lib/landing/public-background`. */
export { HOME_HERO_VIDEO as HOME_VIDEO } from "@/lib/landing/public-background";
