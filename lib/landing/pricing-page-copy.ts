import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";

/** Restaurant-owner copy for `/pricing`. */

export const PRICING_HEADLINE = "Only pay for successful orders" as const;

export const PRICING_CTA = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.bookDemoMailto,
  signup: PUBLIC_CTA.signUpOnboarding,
} as const;

export const PRICING_PAGE_COPY = {
  seo: {
    title: "Pricing — $0.90 per successful order | ROAL",
    description:
      "Only pay for successful orders. $0.90 per pickup when the ticket hits your kitchen—not per minute, not per ring.",
  },
  aeo: {
    titleId: "pricing-cost-heading",
    question: "How much does ROAL cost per pickup order?",
    answer: `${HOME_PRICING_PILL.price} per successful pickup when the guest confirms on the call and the ticket hits your kitchen screen.`,
    detail: "Hang-ups, wrong numbers, and test calls are free. No per-minute phone bill.",
  },
  primaryCard: {
    titleId: "pricing-heading",
    eyebrow: "Pricing",
    headline: PRICING_HEADLINE,
    rate: "$0.90",
    rateUnit: "per successful order",
    rateNote:
      "Guest confirms pickup on the call and the ticket hits your kitchen screen—that is one billable order.",
    billableHeading: "Counts as one order",
    billableItems: [
      "Guest name and phone captured on the call",
      "Ticket on your kitchen screen (your kitchen pass)",
    ] as const,
    freeHeading: "Never billed",
    freeItems: [
      "Hang-ups and wrong numbers",
      "Small talk with no order",
      "Abandoned carts and test calls",
      "Per-minute phone fees",
    ] as const,
    ctas: PRICING_CTA,
  },
  pilot: {
    titleId: "pricing-pilot-heading",
    title: "Pilot setup",
    lead: "Most shops are live in about twenty minutes.",
    steps: [
      "Scan your printed menu into the dashboard",
      "Connect your pickup line",
      "Run a test call, then forward rush-hour traffic",
    ] as const,
    note: "Optional one-time setup fee. We confirm your rate before live calls. Pilot is month-to-month.",
  },
  faq: {
    titleId: "pricing-faq-heading",
    title: "Quick answers",
  },
  close: {
    titleId: "pricing-close-heading",
    title: "Stop paying for rings that never become orders.",
    description: "Hear a sample call on your menu, or book a short walkthrough with our team.",
  },
} as const;

export { PRICING_FAQ } from "@/lib/landing/launch-faq";
