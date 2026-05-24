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
    answer:
      "On the demo page you can walk through a sample rush-hour pickup flow, read an illustrative transcript, and preview the kitchen ticket—then book a live walkthrough or sign up to test on your menu.",
    detail:
      "Book a demo call by email or sign up to scan your menu and place a test call before your next rush.",
  },
  hero: {
    eyebrow: "Demo",
    title: "See a rush-hour pickup call",
    description:
      "Sample video slot, three-step flow, transcript, and kitchen ticket—then book a walkthrough or sign up to test on your menu.",
  },
  video: {
    titleId: "demo-video-heading",
    title: "Sample pickup call",
    description: "Rush-hour recording placeholder—modifiers, disclosure, and the ticket that hits your pass.",
    placeholderTitle: "Demo video coming soon",
    placeholderDetail: "We will drop your recording in here when it is ready.",
  },
  callSimulation: {
    titleId: "demo-call-heading",
    title: "Ring → answer → ticket",
    description: "Illustrative Friday rush sequence—not a live recording.",
    steps: [
      {
        id: "ring",
        time: "6:44 PM",
        title: "Phone rings",
        body: "Second line lights up during the rush. Counter staff are plating—not answering.",
      },
      {
        id: "answer",
        time: "6:44 PM",
        title: "ROAL answers",
        body: "Pickup line picks up with your menu loaded—no hold music, no script drift.",
      },
      {
        id: "ticket",
        time: "6:45 PM",
        title: "Ticket on the pass",
        body: "Cart syncs to your kitchen screen while the guest confirms modifiers on the call.",
      },
    ],
  },
  proof: {
    titleId: "demo-proof-heading",
    title: "From call to kitchen",
    description: "Same order: what the guest said on the phone and what expo cooks from on the pass.",
    transcriptLabel: "Sample transcript",
    ticketLabel: "Kitchen ticket",
    ticketNote: "Sample ticket—sign up to run a test call on your menu.",
  },
  close: {
    titleId: "demo-close-heading",
    eyebrow: "Next step",
    title: "Try it on your menu",
    description:
      "Email us for a live walkthrough, or sign up to scan your menu and place a test call before your next rush.",
    pricingHref: "/pricing",
  },
} as const;
