/**
 * Public FAQ — single source for the homepage, pricing, and security pages.
 * Keep answers honest: no invented numbers, customers, or vendor names.
 */

import {
  PRICING_NO_ORDER_LINE,
  PRICING_PILL_PRICE,
  PRICING_RATE_AMOUNT,
  PRICING_RATE_LINE,
} from "@/lib/landing/pricing-core";

export type LaunchFaqPage = "home" | "pricing" | "security";

export type LaunchFaqItem = {
  id: string;
  question: string;
  answer: string;
  pages: readonly LaunchFaqPage[];
  link?: { href: string; label: string };
};

const LAUNCH_FAQ_ENTRIES = [
  {
    id: "home-what",
    pages: ["home"],
    question: "What does ROAL actually do?",
    answer:
      "It answers your restaurant's phone, takes pickup orders from your live menu, answers questions about hours and the menu, and sends a ticket to your kitchen screen.",
  },
  {
    id: "home-setup",
    pages: ["home"],
    question: "How long does setup take?",
    answer:
      "Paste your website or Google Maps link and you can talk to your own host in about a minute. Going live means forwarding your number, which takes a few minutes with most phone carriers.",
    link: { href: "/try", label: "Try it free" },
  },
  {
    id: "home-robot",
    pages: ["home"],
    question: "Will callers feel like they are talking to a robot?",
    answer:
      "Callers speak normally and the host responds in a natural voice. You pick the voice and the name. Try a call yourself before you decide.",
  },
  {
    id: "home-menu-changes",
    pages: ["home", "pricing"],
    question: "What happens when my menu changes?",
    answer:
      "Edit the menu in your dashboard. The next call uses the updated items and prices. Sold-out items are not offered.",
  },
  {
    id: "home-handoff",
    pages: ["home", "security"],
    question: "What if a caller needs a person?",
    answer:
      "Catering, complaints, and manager requests are handed to your team. The host does not invent an order to end the call.",
  },
  {
    id: "home-pay",
    pages: ["home"],
    question: "When do I pay?",
    answer: `${PRICING_RATE_AMOUNT} when a pickup order is confirmed and the ticket reaches your kitchen. ${PRICING_NO_ORDER_LINE}`,
    link: { href: "/pricing", label: "See pricing" },
  },
  {
    id: "pricing-cost",
    pages: ["pricing"],
    question: "What does ROAL cost?",
    answer: `${PRICING_RATE_LINE}. There is no monthly fee, no per-minute fee, and no contract.`,
  },
  {
    id: "pricing-counts",
    pages: ["pricing"],
    question: "What counts as a completed order?",
    answer:
      "The caller confirms name, phone, and items, and the ticket lands on your kitchen screen. Anything short of that is free.",
  },
  {
    id: "pricing-hangups",
    pages: ["pricing"],
    question: "Hang-ups, wrong numbers, and questions?",
    answer: `Free. ${PRICING_NO_ORDER_LINE}`,
  },
  {
    id: "pricing-voids",
    pages: ["pricing"],
    question: "What if my team voids a ticket?",
    answer:
      "Tell us. Tickets your team voided in good faith are credited, so you only pay for orders you actually made.",
  },
  {
    id: "pricing-setup-fee",
    pages: ["pricing"],
    question: "Is there a setup fee or minimum?",
    answer: `No. Set up and test for free. You pay ${PRICING_PILL_PRICE} once real orders start coming in.`,
  },
  {
    id: "pricing-volume",
    pages: ["pricing"],
    question: "We do a lot of phone orders. Is there a volume rate?",
    answer: "Possibly. Talk to us about your volume and we will confirm a rate before you go live.",
    link: { href: "/contact", label: "Talk to us" },
  },
  {
    id: "pricing-cancel",
    pages: ["pricing"],
    question: "Can I stop any time?",
    answer: "Yes. Point your number back to your own line and the charges stop. No contract, no notice period.",
  },
  {
    id: "security-guest-data",
    pages: ["security"],
    question: "What caller data is collected?",
    answer:
      "Name and phone number for the pickup, stored with the ticket. We do not take card numbers over the phone and we do not sell caller data.",
  },
  {
    id: "security-scoped",
    pages: ["security"],
    question: "Can other restaurants see my data?",
    answer:
      "No. Each restaurant's menu, calls, and tickets live in that restaurant's account, and staff sign in with their own logins.",
  },
  {
    id: "security-fake-orders",
    pages: ["security"],
    question: "Can someone post fake orders?",
    answer:
      "Tickets are only created from calls on your line, by your host, into your account. There is no public form that writes to your kitchen screen.",
  },
  {
    id: "security-audit",
    pages: ["security"],
    question: "Is there an audit trail?",
    answer:
      "Every call keeps its transcript, and every ticket keeps its status history, so you can reconstruct what happened on a busy night.",
  },
] as const satisfies readonly LaunchFaqItem[];

export function faqForPage(page: LaunchFaqPage): readonly LaunchFaqItem[] {
  return LAUNCH_FAQ_ENTRIES.filter((item) => (item.pages as readonly LaunchFaqPage[]).includes(page));
}

export const HOME_FAQ = {
  titleId: "home-faq-heading",
  title: "Questions owners ask",
  items: faqForPage("home"),
} as const;

export const PRICING_FAQ = faqForPage("pricing");

/** Every launch FAQ entry, for the /faq page. */
export const ALL_LAUNCH_FAQ: readonly LaunchFaqItem[] = LAUNCH_FAQ_ENTRIES;

export const SECURITY_FAQ = faqForPage("security");
