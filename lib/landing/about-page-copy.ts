import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { PUBLIC_CTA, PUBLIC_CTA_PAIR } from "@/lib/landing/public-cta";

export const ABOUT_CTA = {
  ...PUBLIC_CTA_PAIR,
  tertiary: PUBLIC_CTA.bookDemo,
} as const;

export const ABOUT_PAGE_COPY = {
  seo: {
    title: "About ROAL — AI Phone Orders for Independent Restaurants",
    description:
      "ROAL helps restaurants answer rush-hour pickup calls from a live menu, send kitchen tickets, and pay $0.90 per successful order—built for independents, not call centers.",
  },
  aeo: {
    titleId: "about-what-is-roal",
    question: "What is ROAL?",
    answer:
      "ROAL is a restaurant phone ordering product that answers pickup calls using your live menu, sends tickets to your kitchen display, and charges around successful orders—not per minute or per ring.",
    detail:
      "We built it for independent restaurants that lose pickup demand when the dining room peaks—not for generic call centers or scripted phone trees.",
  },
  hero: {
    eyebrow: "About",
    title: "We built ROAL so the phone line stops losing pickup orders.",
    description:
      "Phone ordering for independent restaurants: answer rush-hour rings from your live menu, ticket the kitchen while the guest is still on the line, and pay only when the order hits your pass—not per minute or per ring.",
  },
  problem: {
    titleId: "about-problem-heading",
    eyebrow: "The problem",
    title: "Missed calls are a timing problem—not a people problem",
    description:
      "Between seating, expo, and the pass, the phone becomes second-class exactly when pickup callers are ready to buy.",
    bullets: [
      "Call volume spikes when hosts and managers are already underwater.",
      "Voicemail and “call back after rush” rarely place tonight’s order.",
      "Pickup guests move on—margin and loyalty go to whoever answered.",
    ],
    blogLink: {
      href: "/blog/why-restaurants-miss-calls-dinner-rush",
      label: "Why restaurants miss calls during rush",
    },
  },
  whyRoal: {
    titleId: "about-why-roal-heading",
    eyebrow: "Why we exist",
    title: "Coverage, menu truth, kitchen tickets, and fair billing—together",
    description: "The line answered with the same menu your pass runs—not a phone tree or last season’s PDF.",
    steps: [
      {
        id: "answer",
        title: "Answer the line",
        body: "Natural conversation on forwarded calls—not press 1 for pickup.",
      },
      {
        id: "menu",
        title: "Live menu",
        body: "Items, modifiers, and 86s your kitchen actually uses tonight.",
      },
      {
        id: "ticket",
        title: "Ticket the pass",
        body: "Name, phone, and cart on your kitchen screen before the guest hangs up.",
      },
      {
        id: "bill",
        title: "Bill for success",
        body: "$0.90 per successful pickup for many pilots—not per minute of talk.",
      },
    ],
  },
  companyStory: {
    titleId: "about-company-story-heading",
    eyebrow: "Our story",
    title: "Built for independent restaurants—not a generic call center",
    lead: "Pickup loyalty still lives on the phone—but the dining room wins attention at rush. We build for that gap, not generic call centers.",
    paragraphs: [
      "We work with one- and two-location operators who know their modifiers cold. Our job is to cover the line when your team is seating and expoing—not replace your hosts or your voice. Judge us on demo calls and test tickets, not stock photos.",
    ],
    principles: [
      {
        id: "accuracy",
        title: "Accuracy on the pass",
        body: "Calls, menu, and kitchen tickets must describe the same dish. If expo cannot trust the ticket, the phone channel dies.",
      },
      {
        id: "automation",
        title: "Honest automation",
        body: "Callers hear that the line is automated. ROAL is efficient and clear—not pretending to be a specific person on your roster.",
      },
      {
        id: "handoff",
        title: "Staff handoff when it matters",
        body: "AI takes the routine cart; your team takes judgment—allergies, complaints, catering scale, and policy calls.",
      },
    ],
    footnote:
      "If you are deciding whether ROAL fits your restaurant, judge us on demo calls and test tickets—not on a fabricated origin story.",
  },
  values: {
    titleId: "about-values-heading",
    eyebrow: "Values",
    title: "Three values we build around",
    description:
      "Every product decision on ROAL should trace back to one of these—especially during rush hour.",
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
        body: "You pay when a real guest confirms on the line and the pickup finalizes on your pass—hang-ups, wrong numbers, and menu tests are not the unit on the bill.",
        link: {
          href: "/blog/pay-only-successful-orders",
          label: "Paying only for successful orders",
        },
      },
    ],
  },
  promise: {
    titleId: "about-promise-heading",
    eyebrow: "Our promise",
    title: "What we stand behind—and what we do not",
    doItems: [
      "Answers grounded in your live menu and tickets your line can cook.",
      "Clear disclosure that the line is automated, with warm handoff to staff.",
      "Success-based pilot terms in writing before live guest traffic.",
    ],
    dontItems: [
      "Replacing in-person hospitality or every catering negotiation.",
      "Implying the agent never errs without menu upkeep and test calls.",
      "Fabricated ROI or national “average loss” statistics.",
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
    title: "Hear the agent, then book a walkthrough",
    description:
      "Start with a sample pickup call on /demo—then email us to book a live demo with your menu and rush-hour volume.",
    mailtoNote: `Book a demo opens your email to ${CONTACT_PILOT_EMAIL} with a short template—we respond with times, not a call center queue.`,
    ctas: ABOUT_CTA,
  },
} as const;
