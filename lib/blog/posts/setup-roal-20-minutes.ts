import { BLOG_CTA_MENU } from "../cta";
import type { BlogArticleContent } from "../types";

export const setupRoal20MinutesContent: BlogArticleContent = {
  summary:
    "Scan your menu, run a test call, and watch a ticket hit the pass—about twenty minutes for most single locations, not a multi-week IT project.",
  answerShort:
    "Going live with ROAL phone ordering usually takes about twenty minutes: add your restaurant, scan or import your menu, fix modifiers on your top sellers, connect voice, and place a test call so a ticket hits your kitchen display before you forward live pickup traffic.",
  author: "ROAL Team",
  seo: {
    title: "Go Live with AI Phone Orders in About 20 Minutes | ROAL Journal",
    description:
      "Quick setup: menu scan, test call, and a kitchen ticket—what you need before forwarding live pickup calls to ROAL.",
  },
  sections: [
    {
      id: "before-you-start",
      title: "Before you start (five minutes of prep)",
      paragraphs: [
        "Have a printed menu or PDF, your pickup hours, and one person who knows modifier quirks (\"combo includes soup OR salad\"). You will not need a developer.",
        "Pick a quiet ten-minute window—not mid-service—to run the first test call so you can hear the agent clearly.",
      ],
    },
    {
      id: "scan-and-review",
      title: "Scan the menu, fix the top sellers",
      paragraphs: [
        "ROAL extracts items, prices, and categories from your menu scan. Spend most of your time on the twenty dishes that drive phone volume and any required modifier groups.",
        "You do not need perfection on day one; you need accuracy on what callers actually order. Refine the long tail after the first week of test calls.",
      ],
    },
    {
      id: "test-call",
      title: "Place a test call, watch the pass",
      paragraphs: [
        "Call your test line, order like a guest (with one modifier change mid-call), and confirm name and phone. The ticket should appear on your kitchen display while you are still on the line.",
        "If something is wrong, fix the menu item—not the guest experience. Re-test until the read-back matches what expo expects.",
      ],
    },
    {
      id: "go-live",
      title: "Forward traffic when the ticket is boring",
      paragraphs: [
        "Go live when test calls feel routine: right items, honest 86 behavior, and a handoff path your shift lead knows. Start with one service period if you want a soft launch—Friday pickup only, for example.",
        "Keep success-based pilot terms in writing so you know what counts as a billable order before the first live guest ring.",
      ],
    },
  ],
  faq: [
    {
      question: "How long does ROAL setup take?",
      answer:
        "Many single-location restaurants scan a menu, configure voice, and complete a successful test call in about twenty minutes, plus time to polish top items and modifiers.",
    },
    {
      question: "What do I need before my first test call?",
      answer: "A menu file or photo, accurate pickup hours, and clarity on required modifiers for your most-ordered items.",
    },
    {
      question: "Can I go live the same day I sign up?",
      answer:
        "Yes, if test tickets match your kitchen expectations and your team knows when to take escalations from the agent.",
    },
    {
      question: "Do I need a new phone number for AI phone orders?",
      answer:
        "Usually you forward your existing pickup line or use the number your pilot provides. Guests should dial the same number they already trust.",
    },
    {
      question: "What if the menu scan misses an item?",
      answer:
        "Edit items in the menu editor, fix modifiers on your top sellers, and place another test call. Full menu polish can wait; accuracy on what callers actually order cannot.",
    },
  ],
  relatedSlugs: [
    "ai-phone-ordering-small-restaurants",
    "phone-agent-must-know-live-menu",
    "pay-only-successful-orders",
  ],
  cta: {
    ...BLOG_CTA_MENU,
    description:
      "When you have ten quiet minutes: scan your menu, place one test call, and see the ticket land before you forward a single live guest.",
  },
};
