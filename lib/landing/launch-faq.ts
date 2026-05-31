/**
 * Launch FAQ — single source for homepage, pricing, and security.
 * Edit answers here to keep cross-page copy aligned.
 */

import {
  PRICING_NO_ORDER_LINE,
  PRICING_PILL_PRICE,
  PRICING_RATE_LINE,
} from "@/lib/landing/pricing-core";
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
  "Catering, complaints, and manager requests go to your team. ROAL escalates—no fake orders.";

const LAUNCH_FAQ_ENTRIES = [
  {
    id: "home-what-calls",
    pages: ["home"],
    question: "What does ROAL actually do?",
    answer:
      "ROAL answers pickup calls, speaks naturally, uses your live menu and hours, and sends confirmed tickets to your kitchen.",
  },
  {
    id: "home-menu-setup",
    pages: ["home"],
    question: "How do we set up the menu?",
    answer:
      "Add your menu, review items and prices, run test calls, then forward calls when your team is comfortable.",
    link: { href: "/signup?next=/dashboard/onboarding", label: "Start setup" },
  },
  {
    id: "home-natural-voice",
    pages: ["home"],
    question: "Will guests feel stuck talking to a robot?",
    answer:
      "No. They call your restaurant, speak normally, switch languages if needed, and confirm pickup before hanging up.",
    link: { href: "/demo", label: "Hear a demo call" },
  },
  {
    id: "home-completed-order",
    pages: ["home"],
    question: "When do we pay?",
    answer: `Pay when pickup confirms and the ticket hits your kitchen screen. ${PRICING_PILL_PRICE}. No order, no charge.`,
    link: { href: HOME_PRICING_PILL.href, label: "Pricing" },
  },
  {
    id: "home-how-to-start",
    pages: ["home"],
    question: "How do we go live?",
    answer: "Hear the demo, sign up, add the menu, test calls with your team, then forward the phone line when you are ready.",
    link: { href: "/signup?next=/dashboard/restaurants", label: "Sign up" },
  },
  {
    id: "pricing-cost",
    pages: ["pricing"],
    question: "Cost per pickup order?",
    answer: PRICING_RATE_LINE,
  },
  {
    id: "successful-order",
    pages: ["pricing"],
    question: "What counts as an order?",
    answer:
      "Guest confirms pickup; ticket hits your kitchen screen. We track it in pilot.",
  },
  {
    id: "setup-cost",
    pages: ["pricing"],
    question: "Setup fee?",
    answer: `Optional. ${PRICING_PILL_PRICE} per order once live.`,
  },
  {
    id: "high-volume",
    pages: ["pricing"],
    question: "High pickup volume?",
    answer: `Volume may negotiate rate. Published ${PRICING_PILL_PRICE} for most pilots.`,
  },
  {
    id: "per-minute",
    pages: ["pricing"],
    question: "Per-minute phone fees?",
    answer: `No. ${PRICING_NO_ORDER_LINE}`,
  },
  {
    id: "rings-not-billed",
    pages: ["pricing"],
    question: "Hang-ups and wrong numbers?",
    answer: PRICING_NO_ORDER_LINE,
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
    id: "human-handoff-security",
    pages: ["security"],
    question: "Staff take over?",
    answer: HUMAN_HANDOFF_ANSWER,
    link: { href: "/contact", label: "Talk through handoff rules" },
  },
  {
    id: "guest-data",
    pages: ["security"],
    question: "What guest data is collected?",
    answer:
      "Name and phone for pickup—stored with tickets, not sold. No card numbers on the phone line.",
  },
  {
    id: "scoped-access",
    pages: ["security"],
    question: "Can other restaurants see my data?",
    answer:
      "No. Each shop’s menu and tickets stay in that account. Staff log in per location—no shared tablet password.",
  },
  {
    id: "signed-tools",
    pages: ["security"],
    question: "Fake phone orders?",
    answer:
      "Orders only from your pickup line and account—not random web forms or guessed links.",
  },
  {
    id: "audit-trail",
    pages: ["security"],
    question: "Busy night audit trail?",
    answer:
      "Draft carts, status changes, and finalized pickups are logged so you can reconstruct each ticket.",
  },
  {
    id: "technical-detail",
    pages: ["security"],
    question: "Technical security details?",
    answer:
      "Access rules, signed phone-order checks, and audit logs are below for IT or your POS partner.",
    link: { href: "#security-technical-heading", label: "Jump to implementation details" },
  },
] as const satisfies readonly LaunchFaqItem[];

const ENTRY_ORDER: Record<LaunchFaqPage, readonly string[]> = {
  home: [
    "home-what-calls",
    "home-menu-setup",
    "home-natural-voice",
    "home-completed-order",
    "home-how-to-start",
  ],
  pricing: [
    "pricing-cost",
    "successful-order",
    "rings-not-billed",
    "per-minute",
  ],
  security: [
    "guest-data",
    "scoped-access",
    "human-handoff-security",
    "signed-tools",
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
  eyebrow: "Owner FAQ",
  title: "What restaurant owners ask before going live.",
  lead: "The basics: what ROAL handles, how it uses your menu, and when you pay.",
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
