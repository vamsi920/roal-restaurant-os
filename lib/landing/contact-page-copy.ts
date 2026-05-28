/** Contact / pilot conversion copy for `/contact`. */

import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";

export { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";

export const CONTACT_PAGE_COPY = {
  seo: {
    title: "Book a ROAL Demo — Contact",
    description:
      "Book a short demo: email hello@getroal.com or use the two-field form to open a prefilled message. Pickup calls, live menu, kitchen tickets.",
  },
  hero: {
    eyebrow: "Book a demo",
    title: "Book a short ROAL walkthrough",
    description: "Email opens with your restaurant and reply address.",
  },
  form: {
    title: "Book a demo",
    description: "Two fields. Opens your email app—nothing stored on our servers yet.",
    staticNotice: "Preview: tap Book a demo to mail us, or use the button below.",
    submitLabel: "Book a demo",
    fields: {
      restaurant: {
        label: "Restaurant",
        placeholder: "Harbor Poke · Austin, TX",
      },
      email: { label: "Your email", placeholder: "you@restaurant.com" },
    },
  },
  whatToExpect: {
    title: "After you email",
    steps: [
      {
        title: "We reply",
        body: "How pickup calls become kitchen tickets and pilot pricing.",
      },
      {
        title: "Optional walkthrough",
        body: "Short call on your menu—or /demo first.",
      },
    ],
  },
  fit: {
    titleId: "contact-fit-heading",
    title: "Good fit today",
    items: ["Busy pickup line", "Menu you can photograph"],
  },
  close: {
    titleId: "contact-close-heading",
    eyebrow: "Book a demo",
    title: "Email us to book your walkthrough",
    description: `Opens ${CONTACT_PILOT_EMAIL} with a prefilled subject—or use the form above.`,
    demoHref: "/demo",
    demoLabel: "Hear a sample call",
  },
} as const;

export const CONTACT_CTA = {
  bookDemo: PUBLIC_CTA.bookDemoMailto,
  form: { href: "#contact-form", label: "Use the email form" },
  demo: PUBLIC_CTA.hearDemo,
  signup: PUBLIC_CTA.signUpOnboarding,
} as const;
