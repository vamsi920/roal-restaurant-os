/**
 * Launch FAQ — single source for homepage, pricing, and security.
 * Edit answers here to keep cross-page copy aligned.
 */

import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";

export type LaunchFaqPage = "home" | "pricing" | "security";

export type LaunchFaqItem = {
  id: string;
  question: string;
  answer: string;
  pages: readonly LaunchFaqPage[];
  link?: { href: string; label: string };
};

const HUMAN_HANDOFF_ANSWER =
  "Catering, complaints, manager requests, and anything outside normal pickup should go to your staff. ROAL escalates—it does not invent guest details to force an order through.";

const LAUNCH_FAQ_ENTRIES = [
  {
    id: "home-pricing-rate",
    pages: ["home"],
    question: `What does ${HOME_PRICING_PILL.price} mean?`,
    answer:
      "You pay when a guest confirms pickup and the ticket hits your kitchen screen—not for hang-ups, wrong numbers, or test calls.",
    link: { href: HOME_PRICING_PILL.href, label: "Full pricing" },
  },
  {
    id: "pricing-cost",
    pages: ["pricing"],
    question: "How much does ROAL cost per pickup order?",
    answer: `${HOME_PRICING_PILL.price} when the guest confirms pickup and the ticket hits your kitchen screen.`,
  },
  {
    id: "successful-order",
    pages: ["pricing"],
    question: "What counts as a successful order?",
    answer: "Name and phone on the call, ticket on your kitchen screen—that is when we bill.",
  },
  {
    id: "setup-cost",
    pages: ["pricing"],
    question: "Is there a setup fee?",
    answer: `Sometimes a one-time setup fee. Your ${HOME_PRICING_PILL.price} rate is confirmed before live calls.`,
  },
  {
    id: "high-volume",
    pages: ["pricing"],
    question: "What if we run high pickup volume?",
    answer: `Busy shops may negotiate a different per-order rate. ${HOME_PRICING_PILL.price} is what we publish for most pilots.`,
  },
  {
    id: "per-minute",
    pages: ["pricing"],
    question: "Are there per-minute phone fees?",
    answer: "No. You pay for completed pickup orders—not minutes on the phone.",
  },
  {
    id: "rings-not-billed",
    pages: ["pricing"],
    question: "Do I pay for hang-ups, wrong numbers, or test calls?",
    answer: "No. No ticket on your pass means no charge.",
  },
  {
    id: "voids",
    pages: ["pricing"],
    question: "What if an order is canceled or voided after it hits your kitchen screen?",
    answer:
      "We agree how voids work before you go live. Usually you are not charged for tickets your team voided in good faith.",
  },
  {
    id: "refunds",
    pages: ["pricing"],
    question: "How do refunds on success fees work?",
    answer:
      "If a pickup is refunded or comped, pilot terms say how we adjust the fee. You pay for real orders—not pranks or tests.",
  },
  {
    id: "production-pricing",
    pages: ["pricing"],
    question: "How is pricing set after the pilot?",
    answer:
      "We look at how many orders you run and confirm a per-order rate before you scale. Still success-based—still no per-minute bill.",
  },
  {
    id: "pilot-contract",
    pages: ["pricing"],
    question: "Is the pilot month-to-month?",
    answer: "Yes. No long-term lock-in before you see orders on your pass.",
  },
  {
    id: "setup-time",
    pages: ["home"],
    question: "How long does setup take?",
    answer:
      "Most pilots scan a menu, connect a line, and run a test call in about twenty minutes. Larger menus may need one short review call.",
    link: { href: "/signup?next=/dashboard/onboarding", label: "Start setup" },
  },
  {
    id: "menu-accuracy",
    pages: ["home"],
    question: "How does ROAL stay accurate when my menu changes?",
    answer:
      "It reads your live dashboard menu—86 an item or change a price and the next call quotes it correctly.",
  },
  {
    id: "human-handoff",
    pages: ["home", "security"],
    question: "When does a call go to my staff?",
    answer:
      "Catering, complaints, and manager requests go to your team. ROAL escalates—it does not fake an order to stay on the line.",
    link: { href: "/demo", label: "Hear a demo call" },
  },
  {
    id: "demo-onboarding",
    pages: ["home"],
    question: "How do I hear a demo or start onboarding?",
    answer:
      "Listen on the demo page, then book a walkthrough or sign up to scan your menu and place a test order.",
    link: { href: "/demo", label: "Hear a demo call" },
  },
  {
    id: "human-handoff-security",
    pages: ["security"],
    question: "Can my team take over when ROAL should stop?",
    answer: HUMAN_HANDOFF_ANSWER,
    link: { href: "/contact", label: "Talk through handoff rules" },
  },
  {
    id: "guest-data",
    pages: ["security"],
    question: "What guest information does ROAL collect?",
    answer:
      "The name and phone number needed to run the pickup—collected on the call, stored with your tickets, and not sold or used for unrelated marketing. We do not ask guests for payment cards on the phone line.",
  },
  {
    id: "scoped-access",
    pages: ["security"],
    question: "Can another restaurant see my menu or orders?",
    answer:
      "No. Each shop’s menu, drafts, and completed tickets live inside that restaurant’s account. Your staff only see locations they are invited to, with their own login—not a shared password on one tablet.",
  },
  {
    id: "signed-tools",
    pages: ["security"],
    question: "How do you stop random people from placing fake phone orders?",
    answer:
      "Orders only come from your connected pickup line and your restaurant account—not from random web forms or guessed links.",
  },
  {
    id: "audit-trail",
    pages: ["security"],
    question: "Can I see what happened on a busy night?",
    answer:
      "Draft carts, status changes, and finalized pickups are recorded so you can reconstruct tickets: what was ordered, when it finalized, and what changed before it hit the pass.",
  },
  {
    id: "technical-detail",
    pages: ["security"],
    question: "Where is the technical security detail?",
    answer:
      "Access rules, secure phone-order verification, and audit logs are in the implementation section below for your IT contact or POS partner.",
    link: { href: "#security-technical-heading", label: "Jump to implementation details" },
  },
] as const satisfies readonly LaunchFaqItem[];

const ENTRY_ORDER: Record<LaunchFaqPage, readonly string[]> = {
  home: [
    "home-pricing-rate",
    "setup-time",
    "menu-accuracy",
    "human-handoff",
    "demo-onboarding",
  ],
  pricing: [
    "pricing-cost",
    "successful-order",
    "rings-not-billed",
    "per-minute",
    "setup-cost",
  ],
  security: [
    "guest-data",
    "scoped-access",
    "human-handoff-security",
    "signed-tools",
    "audit-trail",
    "technical-detail",
  ],
};

function byId(id: string): LaunchFaqItem {
  const item = LAUNCH_FAQ_ENTRIES.find((e) => e.id === id);
  if (!item) throw new Error(`Missing launch FAQ entry: ${id}`);
  return item;
}

export function launchFaqItemsFor(page: LaunchFaqPage): LaunchFaqItem[] {
  return ENTRY_ORDER[page].map(byId);
}

export const HOME_FAQ = {
  eyebrow: "FAQ",
  title: "Quick answers",
  lead: "Pricing, setup, live menu, and staff handoffs.",
  items: launchFaqItemsFor("home"),
} as const;

export const PRICING_FAQ = launchFaqItemsFor("pricing").map((item) => ({
  q: item.question,
  a: item.answer,
}));

export const SECURITY_FAQ = launchFaqItemsFor("security");

export type SecurityFaqItem = LaunchFaqItem;

/** @deprecated Use `LaunchFaqItem` from launch-faq */
export type HomeFaqItem = LaunchFaqItem;
