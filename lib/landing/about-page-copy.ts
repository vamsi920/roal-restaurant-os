import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import {
  PRICING_NO_ORDER_LINE,
  PRICING_RATE_LINE,
} from "@/lib/landing/pricing-core";
import { PUBLIC_CTA, PUBLIC_CTA_PAIR } from "@/lib/landing/public-cta";

export const ABOUT_CTA = {
  ...PUBLIC_CTA_PAIR,
  tertiary: PUBLIC_CTA.bookDemo,
} as const;

export const ABOUT_PAGE_COPY = {
  seo: {
    title: "About ROAL — Pickup calls when rush hits",
    description: "Missed rush-hour calls, live menu on the line, tickets on your pass.",
  },
  aeo: {
    titleId: "about-what-is-roal",
    question: "What is ROAL?",
    answer:
      "Pickup phone orders for independents—live menu, kitchen tickets, success-based billing.",
    detail:
      "Built so you do not miss orders when the rush hits. Your team stays on the floor.",
  },
  hero: {
    eyebrow: "About",
    title: "When the rush hits, pickup calls still get answered.",
    description:
      "Busy restaurants miss rings on the floor. ROAL answers your line with your live menu and takes pickup orders to your kitchen screen.",
  },
  pillars: {
    titleId: "about-pillars-heading",
    eyebrow: "Problem & fix",
    title: "Missed calls, then ROAL on the line",
    lead: "Four beats—pain, answer, ticket, and price.",
    items: [
      {
        id: "missed-calls",
        title: "Missed calls",
        body: "Team on the floor—voicemail picks up and guests order elsewhere.",
      },
      {
        id: "roal-answers",
        title: "ROAL answers",
        body: "Your line rings; ROAL takes pickup orders from tonight’s live menu.",
      },
      {
        id: "kitchen-ticket",
        title: "Kitchen ticket",
        body: "Name, phone, and items confirmed while the guest is still on the call.",
      },
      {
        id: "fair-billing",
        title: "Pay per order",
        body: `${PRICING_RATE_LINE}. No order—no charge.`,
      },
    ] as const,
    blogLink: {
      href: "/blog/why-restaurants-miss-calls-dinner-rush",
      label: "Why restaurants miss calls during rush",
    },
  },
  values: {
    titleId: "about-values-heading",
    eyebrow: "Values",
    title: "Three values we build around",
    description: "Every product decision on ROAL should trace back to one of these—especially during rush hour.",
    items: [
      {
        id: "answer-guest",
        title: "Answer more pickup guests",
        body: "Callers who reach your forwarded line get a clear voice, live items, and confirmation on the call—not hold music or voicemail roulette when your team is on the floor.",
        link: {
          href: "/blog/why-restaurants-miss-calls-dinner-rush",
          label: "Why missed calls hurt at rush",
        },
      },
      {
        id: "staff-control",
        title: "Keep staff in control",
        body: "ROAL builds the routine cart; your team handles allergies, complaints, catering scale, and anything that needs judgment—with the ticket already on your kitchen screen.",
        link: {
          href: "/blog/when-ai-should-hand-off-to-staff",
          label: "When AI should hand off",
        },
      },
      {
        id: "charge-success",
        title: "Charge only for successful orders",
        body: "$0.90 per successful order. If it does not become an order, you do not pay.",
        link: {
          href: "/blog/pay-only-successful-orders",
          label: "Paying only for successful orders",
        },
      },
    ],
  },
  resources: {
    titleId: "about-resources-heading",
    title: "Go deeper",
    links: [
      { href: "/blog/ai-phone-ordering-small-restaurants", label: "How phone ordering with a live menu works" },
      { href: "/blog/phone-agent-must-know-live-menu", label: "Why your agent needs a live menu" },
      { href: "/blog/pay-only-successful-orders", label: "Paying only for successful orders" },
      { href: "/pricing", label: "Pricing — $0.90 per successful order" },
      { href: "/security", label: "Security & data handling" },
    ],
  },
  close: {
    titleId: "about-cta-heading",
    eyebrow: "Next step",
    title: "Hear a demo call",
    description: "Hear a demo call or book a short walkthrough.",
    mailtoNote: `Email ${CONTACT_PILOT_EMAIL} to book.`,
    ctas: ABOUT_CTA,
  },
} as const;
