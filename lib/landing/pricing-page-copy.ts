import {
  PRICING_NO_ORDER_LINE,
  PRICING_ORDER_EXPLAINER,
  PRICING_PILL_PRICE,
  PRICING_RATE_AMOUNT,
  PRICING_RATE_LINE,
  PRICING_SUCCESS_HEADLINE,
} from "@/lib/landing/pricing-core";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";

/** Restaurant-owner copy for `/pricing`. */

export const PRICING_HEADLINE = PRICING_RATE_LINE;

export const PRICING_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.bookDemoMailto,
  signup: PUBLIC_CTA.signUpOnboarding,
} as const;

export const PRICING_PAGE_COPY = {
  seo: {
    title: "Pricing — $0.90 per successful order | ROAL",
    description: `${PRICING_RATE_LINE}. ${PRICING_NO_ORDER_LINE}`,
  },
  aeo: {
    titleId: "pricing-cost-heading",
    question: "How much does ROAL cost per pickup order?",
    answer: `${PRICING_SUCCESS_HEADLINE}. ${PRICING_RATE_LINE}.`,
    detail: PRICING_NO_ORDER_LINE,
  },
  primaryCard: {
    titleId: "pricing-heading",
    eyebrow: "Success-based pricing",
    headline: PRICING_SUCCESS_HEADLINE,
    rate: PRICING_RATE_AMOUNT,
    rateUnit: "/order",
    tagline: PRICING_NO_ORDER_LINE,
    rateNote: undefined,
    billableHeading: "",
    billableItems: [] as const,
    freeHeading: "",
    freeItems: [] as const,
    ctas: PRICING_CTA,
  },
  whatCounts: PRICING_ORDER_EXPLAINER,
  pilot: {
    titleId: "pricing-pilot-heading",
    title: "Pilot setup",
    lead: "Live in about twenty minutes.",
    steps: [
      "Scan your menu",
      "Connect your pickup line",
      "Test call, then forward rush-hour calls",
    ] as const,
    note: "Rate confirmed before live calls.",
  },
  faq: {
    titleId: "pricing-faq-heading",
    title: "Quick answers",
  },
  close: {
    titleId: "pricing-close-heading",
    title: PRICING_SUCCESS_HEADLINE,
    description: "Hear a demo call or book a short walkthrough.",
  },
  signupNote: "Scan your menu and run a test call.",
} as const;

export { PRICING_FAQ } from "@/lib/landing/launch-faq";
export { PRICING_PILL_PRICE };
