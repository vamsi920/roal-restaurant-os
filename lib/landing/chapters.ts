import { PUBLIC_CTA, PUBLIC_CTA_PAIR } from "@/lib/landing/public-cta";

/** Primary/secondary CTA pair reused by the blog (`lib/blog/cta.ts`). */
export const LANDING_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.signUp,
} as const;

export { PUBLIC_CTA_PAIR };
