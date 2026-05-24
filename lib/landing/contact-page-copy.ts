/** Contact / pilot conversion copy for `/contact`. */

import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";

export { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";

export const CONTACT_PAGE_COPY = {
  seo: {
    title: "Contact ROAL — Send Your Menu, See Phone Orders",
    description:
      "Send your menu and rush-hour context—we'll show where calls become orders on your kitchen display. Email or short form; sample demo on /demo.",
  },
  hero: {
    eyebrow: "Contact",
    title: "Send your menu. We'll show where calls become orders.",
    description:
      "Share your restaurant and email—we reply with how pickup calls could land on your pass, not a generic script.",
  },
  form: {
    title: "Send your menu",
    description: "Three fields. Opens your email app with answers filled in—nothing stored on our servers yet.",
    staticNotice:
      "Preview form: submissions are not saved. Tap the button to mail us, or start self-serve setup tonight.",
    submitLabel: "Email ROAL with these details",
    fields: {
      restaurant: {
        label: "Restaurant",
        placeholder: "Harbor Poke · Austin, TX",
      },
      email: { label: "Your email", placeholder: "you@restaurant.com" },
      rushNotes: {
        label: "Rush-hour phone line (optional)",
        placeholder: "e.g. 15–25 pickup calls 6–8 PM · printed menu ready to photograph",
      },
    },
  },
  whatToExpect: {
    title: "What happens next",
    steps: [
      {
        title: "You send your menu context",
        body: "Name, email, and optional rush notes—enough to see if ROAL fits your pickup line.",
      },
      {
        title: "We map calls → orders",
        body: "A short email on how answered rings could become tickets on your kitchen screen, with success-based pricing in writing.",
      },
      {
        title: "Live walkthrough if helpful",
        body: "Optional call on your items—or explore the static sample on the demo page first.",
      },
    ],
  },
  demoAside: {
    title: "Want the sample call first?",
    description:
      "Transcript, call flow, and kitchen ticket preview on the demo page—no form required.",
    cta: PUBLIC_CTA.hearDemo,
  },
  selfServe: {
    title: "Prefer to start tonight?",
    description:
      "Scan your menu, connect voice, and run a test call—no ticket required.",
    cta: PUBLIC_CTA.signUpOnboarding,
  },
  fit: {
    titleId: "contact-fit-heading",
    title: "Good fit for ROAL today",
    description: "Pickup orders from the phone—not website chat or delivery-app tablets.",
    items: [
      "Busy pickup line during rush",
      "Printed menu you can photograph",
      "Staff who can glance at a kitchen tablet",
      "Overflow or after-hours calls you want answered",
    ],
  },
  close: {
    titleId: "contact-close-heading",
    eyebrow: "Next step",
    title: "Send your menu—we'll take it from there",
    description: `Use the form above or email ${CONTACT_PILOT_EMAIL} with your restaurant name and rush-hour context.`,
    demoNote: "Sample call preview:",
    demoHref: "/demo",
    demoLabel: "demo page",
  },
} as const;

export const CONTACT_CTA = {
  form: PUBLIC_CTA.contactForm,
  mailto: PUBLIC_CTA.bookDemoMailto,
  demo: PUBLIC_CTA.hearDemo,
  signup: PUBLIC_CTA.signUpOnboarding,
} as const;
