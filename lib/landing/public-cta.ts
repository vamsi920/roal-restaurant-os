import { buildPilotMailto } from "@/lib/landing/contact-mailto";
import { publicHomeHash } from "@/lib/landing/public-links";

/** Canonical public CTA labels (prompt 85). */
export const PUBLIC_CTA_LABELS = {
  hearDemo: "Hear a demo call",
  bookDemo: "Book a demo",
  signUp: "Sign up",
  seePricing: "See pricing",
  seeHowItWorks: "See how it works",
  sendMenu: "Send your menu",
} as const;

export type PublicCtaLink = { href: string; label: string };

export const PUBLIC_CTA = {
  hearDemo: { href: "/demo", label: PUBLIC_CTA_LABELS.hearDemo },
  bookDemo: { href: "/contact", label: PUBLIC_CTA_LABELS.bookDemo },
  bookDemoMailto: {
    href: buildPilotMailto({
      subject: "Book a ROAL demo",
      body: "Restaurant name:\nCity:\nBest time to connect:\n",
    }),
    label: PUBLIC_CTA_LABELS.bookDemo,
  },
  signUp: { href: "/signup", label: PUBLIC_CTA_LABELS.signUp },
  signUpOnboarding: {
    href: "/signup?next=/dashboard/restaurants",
    label: PUBLIC_CTA_LABELS.signUp,
  },
  seePricing: { href: "/pricing", label: PUBLIC_CTA_LABELS.seePricing },
  seeHowItWorks: { href: publicHomeHash("how"), label: PUBLIC_CTA_LABELS.seeHowItWorks },
  contactForm: { href: "#contact-form", label: PUBLIC_CTA_LABELS.sendMenu },
} as const;

/** Default pair on marketing pages: black primary + glass secondary. */
export const PUBLIC_CTA_PAIR: { primary: PublicCtaLink; secondary: PublicCtaLink } = {
  primary: PUBLIC_CTA.hearDemo,
  secondary: PUBLIC_CTA.bookDemo,
};
