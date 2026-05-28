import { buildPilotMailto, CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";

export const DEMO_MAILTO_EMAIL = CONTACT_PILOT_EMAIL;

/** Bottom band: mailto demo call first, signup immediately after. */
export const DEMO_CTA = {
  bookDemoCall: {
    href: buildPilotMailto({
      subject: "Book a ROAL demo call",
      body: "Restaurant name:\nCity:\nBest time to connect:\n",
    }),
    label: "Book a demo call",
  },
  signup: PUBLIC_CTA.signUpOnboarding,
  hearDemo: PUBLIC_CTA.hearDemo,
} as const;

/** Copy for `/demo` — one scroll: video → steps → proof → CTA. */

export const DEMO_PAGE_COPY = {
  seo: {
    title: "ROAL Demo — Sample Pickup Call & Kitchen Ticket",
    description:
      "See how ROAL answers a rush-hour pickup call: sample flow, transcript, and kitchen ticket preview.",
  },
  aeo: {
    titleId: "demo-aeo-heading",
    question: "How can I hear ROAL on a sample pickup call?",
    answer: "Sample call flow, transcript, and kitchen ticket—then book a walkthrough or sign up.",
    detail: "Email for a live demo or sign up to test on your menu.",
  },
  hero: {
    eyebrow: "Demo",
    title: "See a rush-hour pickup call",
    description: "Video, three beats, then transcript and kitchen ticket.",
  },
  video: {
    titleId: "demo-video-heading",
    title: "Sample pickup call",
    placeholderTitle: "Demo recording soon",
    placeholderDetail: "Rush-hour sample lands here.",
  },
  callSimulation: {
    titleId: "demo-call-heading",
    title: "Ring → ROAL answers → ticket",
    steps: [
      {
        id: "ring",
        time: "6:44 PM",
        title: "Phone rings",
        tagline: "Rush hour",
        icon: "ring",
      },
      {
        id: "answer",
        time: "6:44 PM",
        title: "ROAL answers",
        tagline: "Live menu",
        icon: "answer",
      },
      {
        id: "ticket",
        time: "6:45 PM",
        title: "Ticket on pass",
        tagline: "Kitchen screen",
        icon: "ticket",
      },
    ],
  },
  proof: {
    titleId: "demo-proof-heading",
    title: "Same call, same ticket",
    transcriptLabel: "On the call",
    ticketLabel: "On the pass",
    ticketNote: "Sample—sign up to test on your menu.",
  },
  close: {
    titleId: "demo-close-heading",
    eyebrow: "Next step",
    title: "Try it on your menu",
    description: "Book a walkthrough or sign up to test on your menu.",
    pricingHref: "/pricing",
  },
} as const;
