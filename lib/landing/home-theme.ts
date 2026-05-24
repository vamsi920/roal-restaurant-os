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
  title: "Never miss a rush-hour call again.",
  lead: "We answer pickup calls from your live menu—with natural voice—and ticket your kitchen.",
} as const;

export const HOME_PRICING_PILL = {
  href: "/pricing",
  line: "Pay only when an order lands",
  price: "$0.90/order",
} as const;

/** Hero + home CTA band: demo call primary, book demo mailto secondary. */
export const HOME_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.bookDemoMailto,
} as const;

/** @deprecated Use `HOME_HERO_VIDEO` from `@/lib/landing/public-background`. */
export { HOME_HERO_VIDEO as HOME_VIDEO } from "@/lib/landing/public-background";
