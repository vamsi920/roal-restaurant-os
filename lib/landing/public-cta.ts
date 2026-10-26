import { buildPilotMailto } from "@/lib/landing/contact-mailto";

/** Canonical public CTA labels — shared by marketing pages and the blog. */
export const PUBLIC_CTA_LABELS = {
  tryFree: "Try it free",
  hearDemo: "Hear it on your menu",
  bookDemo: "Talk to us",
  signUp: "Sign up",
  seePricing: "See pricing",
  seeHowItWorks: "See how it works",
} as const;

export type PublicCtaLink = { href: string; label: string };

export const PUBLIC_CTA = {
  tryFree: { href: "/try", label: PUBLIC_CTA_LABELS.tryFree },
  hearDemo: { href: "/demo", label: PUBLIC_CTA_LABELS.hearDemo },
  bookDemo: { href: "/contact", label: PUBLIC_CTA_LABELS.bookDemo },
  bookDemoMailto: {
    href: buildPilotMailto({
      subject: "ROAL — question from a restaurant",
      body: "Restaurant name:\nCity:\nQuestion:\n",
    }),
    label: PUBLIC_CTA_LABELS.bookDemo,
  },
  signUp: { href: "/signup", label: PUBLIC_CTA_LABELS.signUp },
  signUpOnboarding: {
    href: "/signup?next=%2Fdashboard%2Fonboarding",
    label: PUBLIC_CTA_LABELS.signUp,
  },
  seePricing: { href: "/pricing", label: PUBLIC_CTA_LABELS.seePricing },
  seeHowItWorks: { href: "/#how", label: PUBLIC_CTA_LABELS.seeHowItWorks },
} as const satisfies Record<string, PublicCtaLink>;

/** Default pair on marketing pages: black primary + ghost secondary. */
export const PUBLIC_CTA_PAIR: { primary: PublicCtaLink; secondary: PublicCtaLink } = {
  primary: PUBLIC_CTA.tryFree,
  secondary: PUBLIC_CTA.seePricing,
};
