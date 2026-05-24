import { BLOG_CTA_DEMO } from "../cta";
import type { BlogArticleContent } from "../types";

export const phoneOrdersVsDeliveryAppsContent: BlogArticleContent = {
  summary:
    "Delivery apps buy discovery; phone pickup buys margin and repeat guests. Most independents want both—but on purpose, not by accident.",
  answerShort:
    "Phone pickup orders usually keep more margin and guest loyalty than marketplace delivery because you set terms, own the relationship, and avoid per-order platform fees—while delivery apps remain useful for discovery. Covering more forwarded rings with live-menu AI can keep phone demand from leaking to apps when your team is slammed.",
  author: "ROAL Team",
  seo: {
    title: "Phone Orders vs Delivery Apps for Restaurants | ROAL Journal",
    description:
      "Margin, control, and loyalty on phone pickup vs delivery marketplaces—and why answered phone lines still matter.",
  },
  sections: [
    {
      id: "margin",
      title: "Margin: what stays in the restaurant",
      paragraphs: [
        "Marketplace delivery takes a slice of every ticket—marketing, logistics, or both. Phone pickup keeps the check closer to your model, especially when guests pick up themselves.",
        "You still have food and labor cost; the difference is whether a third party tax applies to the same bowl of ramen.",
      ],
    },
    {
      id: "control-loyalty",
      title: "Control and loyalty",
      paragraphs: [
        "Phone guests talk to you—or your agent trained on your menu—not a generic storefront next to five competitors. You hear about the anniversary dinner, the wrong sauce last time, the standing Thursday order.",
        "That context is hard to replicate in a delivery chat thread owned by someone else’s app.",
      ],
    },
    {
      id: "when-apps-help",
      title: "When delivery apps still help",
      paragraphs: [
        "Apps can be discovery for tourists, new neighborhoods, or promo-heavy nights. Many owners treat them as marketing with a known CPA, not as the only ordering line.",
        "The mistake is letting app convenience train locals away from a phone line you never answer—then paying platform fees on guests who would have called.",
      ],
    },
    {
      id: "phone-plus-coverage",
      title: "Protect the phone channel during rush",
      paragraphs: [
        "If pickup by phone is profitable, coverage is non-negotiable: answer, build the cart from the live menu, ticket the pass. AI ordering exists so that channel does not die when the dining room peaks.",
        "Success-based pricing ties cost to completed phone tickets—aligned with the margin you are trying to keep.",
      ],
    },
  ],
  faq: [
    {
      question: "Are phone orders better than DoorDash for restaurants?",
      answer:
        "For many independents, phone pickup keeps more margin and direct guest relationships. Apps can still help discovery—you choose the mix.",
    },
    {
      question: "Why do guests still call instead of using delivery apps?",
      answer:
        "Timing questions, modifiers, trust, and habit—especially for regulars ordering family trays or standing weekly pickups.",
    },
    {
      question: "How do restaurants capture phone orders during rush?",
      answer:
        "Dedicated coverage or AI on forwarded calls that uses the live menu and sends tickets to the kitchen display while staff run the floor.",
    },
    {
      question: "Should I turn off DoorDash if I fix my phone line?",
      answer:
        "Not necessarily. Many owners keep apps for discovery while rebuilding phone pickup for regulars and margin. The goal is choice—not one channel by default.",
    },
    {
      question: "Does ROAL replace online ordering on my website?",
      answer:
        "No. ROAL covers voice. If you have web ordering, it can coexist; the phone line is what fails most often during rush when nobody answers.",
    },
  ],
  relatedSlugs: [
    "ai-phone-ordering-small-restaurants",
    "pay-only-successful-orders",
    "why-restaurants-miss-calls-dinner-rush",
  ],
  cta: BLOG_CTA_DEMO,
};
