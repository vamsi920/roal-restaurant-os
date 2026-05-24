import {
  PUBLIC_NAV_LINKS,
  PUBLIC_NAV_LOGIN,
  PUBLIC_NAV_SIGNUP,
} from "./public-nav";

/** Marketing shell nav (see `lib/landing/public-nav.ts`). */

export const LANDING_NAV = {
  links: PUBLIC_NAV_LINKS,
  signup: PUBLIC_NAV_SIGNUP,
  login: PUBLIC_NAV_LOGIN,
} as const;

import { PUBLIC_CTA, PUBLIC_CTA_PAIR } from "@/lib/landing/public-cta";

export const LANDING_HERO_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.seeHowItWorks,
} as const;

export const LANDING_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.signUp,
  /** @deprecated Use primary/secondary */
  demo: PUBLIC_CTA.hearDemo,
  pricing: PUBLIC_CTA.signUp,
} as const;

export { PUBLIC_CTA_PAIR };
