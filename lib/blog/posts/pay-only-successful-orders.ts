import { BLOG_CTA_DEMO } from "../cta";
import type { BlogArticleContent } from "../types";

export const payOnlySuccessfulOrdersContent: BlogArticleContent = {
  summary:
    "ROAL bills when a real pickup hits your KDS—not rings, minutes, or hang-ups. ROAL charges a flat $0.90 per completed order, with no monthly fee, so fees track tickets on the pass, not talk time.",
  answerShort:
    "Paying only for successful orders means you are charged when a guest confirms name and phone on the call and the pickup ticket finalizes on your kitchen display—not for every ring, per-minute talk time, wrong numbers, or abandoned carts. ROAL charges a flat $0.90 per completed order with no monthly fee, setup fee or contract, so the bill follows orders on the pass instead of rush-hour chatter.",
  author: "ROAL Team",
  seo: {
    title: "Pay Only for Successful Restaurant Phone Orders — $0.90 | ROAL Journal",
    description:
      "Success-based restaurant phone AI pricing: $0.90 per successful pickup on your KDS, aligned incentives, no per-minute surprises—what counts and what does not.",
  },
  sections: [
    {
      id: "wrong-unit",
      title: "The wrong unit: rings and minutes",
      paragraphs: [
        "Most owners do not want more phone minutes—they want more completed pickups on the pass.",
        "Traditional stacks bill extensions, hold time, and inbound volume whether or not anyone ordered. Some AI vendors do the same: longer calls, larger invoices, same busy Friday.",
        "Per-minute surprises show up after rush: callbacks, read-backs, handoffs, guests who never order. You pay for talk; the pass stays quiet.",
        "Success-based pricing changes the unit to the outcome you sell: a ticket your kitchen can fulfill.",
      ],
    },
    {
      id: "ninety-cents",
      title: "$0.90 per completed order, nothing else",
      paragraphs: [
        "On [pricing](/pricing), ROAL publishes one price: $0.90 per completed order—meaning the guest confirmed on the line and the ticket reached your kitchen screen.",
        "That is not $0.90 per ring, per minute, or per \"AI conversation.\" A ten-minute call that ends in a hang-up should not behave like revenue on your invoice.",
        "There is no monthly fee, setup fee, per-minute fee or contract on top. Calls, questions and test calls are free, and the bill comes once a month.",
      ],
    },
    {
      id: "aligned-incentives",
      title: "Aligned incentives—you and your vendor",
      paragraphs: [
        "When both sides care about finalized tickets, the product favors accurate [live menus](/blog/phone-agent-must-know-live-menu), clean confirmations, and fewer wrong items—not longer chatter.",
        "Per-minute pricing rewards talk time. Flat SaaS rewards logins. Success pricing rewards orders that made it to the pass with a real guest attached.",
        "During rush you want the phone host efficient and correct, not chatty. That is the same moment per-minute bills hurt most.",
      ],
    },
    {
      id: "what-counts",
      title: "What counts as a successful order",
      paragraphs: [
        "A successful order means: real name and phone on the call, pickup ticket finalized on your KDS, food your team can make tonight.",
        "Same bar you would use internally—not \"we discussed pad thai,\" but \"pad thai is on the rail with a callback number.\"",
        "The [pricing](/pricing) page spells this out, so accounting and the kitchen agree on what the invoice reflects.",
      ],
    },
    {
      id: "what-does-not-count",
      title: "What should not hit your invoice",
      paragraphs: [
        "Wrong numbers, hang-ups before confirmation, prank calls, and \"what time do you close?\" should not bill as successes.",
        "Test calls while you set up, training calls, and abandoned carts that never finalize should not surprise you on a success invoice.",
        "Clear exclusions build trust—you should not feel punished for testing before you forward Friday traffic.",
      ],
    },
    {
      id: "illustrative-roi",
      title: "Illustrative math (not a guarantee)",
      paragraphs: [
        "Compare tickets on the pass to success fees—not rings.",
        "Example only: six extra completed pickup orders on a weekend at a $40 average ticket is roughly $240 in food revenue on the pass (not profit after food and labor). At $0.90 per successful order, illustrative platform fees for those six are about $5.40—not your full labor or onboarding.",
        "Whether that trade works is your worksheet: see [cost of unanswered calls](/blog/cost-unanswered-restaurant-phone-calls) with your own missed-call data. We are not promising six orders or any ROI.",
        "Track phone tickets on the KDS for two weekends with and without coverage, then compare to fees—not to a telephony minute report.",
      ],
    },
    {
      id: "no-minute-stacks",
      title: "No per-minute stack on top",
      paragraphs: [
        "Owners hate finding a base platform fee plus metered minutes after go-live. ROAL's public price is per completed order: you pay when a confirmed ticket reaches the kitchen screen.",
        "The same $0.90 applies at every location and every ticket size. No surprise per-minute layer sold as \"usage.\"",
        "If you are evaluating vendors, ask: \"What bills if rush hour is loud but only three calls become tickets?\" Minutes-heavy models charge more; success models charge for the three.",
      ],
    },
    {
      id: "compare-models",
      title: "How this compares to other models",
      paragraphs: [
        "Per-minute AI: cost rises with interruptions, read-backs, and handoffs—even when no ticket completes.",
        "Flat unlimited SaaS: simple subscription, but slow weeks still pay full freight when value was Friday coverage.",
        "Marketplace delivery: perpetual slice per ticket; [phone pickup](/blog/phone-orders-vs-delivery-apps) keeps margin when you answer.",
        "ROAL success pricing: cost tracks completed phone pickups on your screen—aligned with recovering orders you lost when [nobody answered during rush](/blog/why-restaurants-miss-calls-dinner-rush).",
      ],
    },
    {
      id: "next-step",
      title: "Next step: pricing page, then a demo call",
      paragraphs: [
        "Read the full breakdown on [pricing](/pricing)—what counts, what does not, and example monthly bills.",
        "Listen to a demo call with your menu, run test tickets on the pass, then forward peak nights when tickets look boringly correct.",
        "Questions on volume or locations? Use [contact](/contact). Want to hear it first? [Build a free test host](/try) from your restaurant link.",
      ],
    },
  ],
  faq: [
    {
      question: "How much does ROAL charge per successful phone order?",
      answer:
        "ROAL charges $0.90 per completed order: the guest confirmed on the call and the ticket reached the kitchen screen. No monthly fee, setup fee, per-minute fee or contract.",
    },
    {
      question: "What is success-based pricing for restaurant phone AI?",
      answer:
        "You pay around completed pickup orders that hit your kitchen screen—not for every inbound ring or minute of conversation.",
    },
    {
      question: "What counts as a successful order for ROAL?",
      answer:
        "A pickup where the guest gave a real name and phone on the line and the ticket finalized on your KDS—not abandoned carts, wrong numbers, or setup test calls.",
    },
    {
      question: "Do restaurants pay per minute for ROAL phone AI?",
      answer:
        "No. ROAL charges $0.90 per completed order, not per minute or per ring. Calls that do not become orders are free.",
    },
    {
      question: "Is success-based pricing better than per-minute phone AI?",
      answer:
        "Many owners prefer it because the bill tracks tickets on the pass—the outcome they want—instead of talk time during rush holds and handoffs.",
    },
  ],
  relatedSlugs: [
    "cost-unanswered-restaurant-phone-calls",
    "why-restaurants-miss-calls-dinner-rush",
    "phone-orders-vs-delivery-apps",
  ],
  cta: {
    ...BLOG_CTA_DEMO,
    description:
      "Listen to a demo call with your menu in mind, then see how $0.90 per successful order fits your rush-hour worksheet on the pricing page.",
  },
};
