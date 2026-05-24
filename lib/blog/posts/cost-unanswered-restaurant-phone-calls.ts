import { BLOG_CTA_DEMO } from "../cta";
import type { BlogArticleContent } from "../types";

export const costUnansweredRestaurantPhoneCallsContent: BlogArticleContent = {
  summary:
    "Missed calls are pickup you never ticketed—not one dramatic voicemail. Use a short worksheet with your rush-hour numbers; every dollar example here is an illustration, not a promise.",
  answerShort:
    "The cost of unanswered restaurant phone calls is pickup revenue you never see on the KDS: missed calls in a busy window × the share who would have ordered if someone answered × your average pickup ticket—from your phone logs and POS, not industry averages. Blog math is template-only; your recovery will differ. When you add coverage, compare fees to tickets on the pass—ROAL bills per successful pickup, not per ring or per minute (see pricing).",
  author: "ROAL Team",
  seo: {
    title: "Cost of Unanswered Restaurant Phone Calls — Worksheet | ROAL Journal",
    description:
      "Estimate missed-call pickup loss with your own numbers (illustrative examples only). No fake industry stats—plus success-based pricing vs per-minute phone bills.",
  },
  sections: [
    {
      id: "disclaimer-first",
      title: "Read this before you use the worksheet",
      paragraphs: [
        "This article does not quote a national \"average loss per restaurant.\" Those headlines are rarely true for your zip code, your menu, or your rush.",
        "Every number below is an illustration to show the formula—not a guarantee, forecast, or ROAL promise of savings. Your job is to plug in data you can defend from a weekend of call tracking and your POS or KDS.",
        "When in doubt, round down on missed orders and average ticket. Underestimating keeps the exercise honest.",
      ],
    },
    {
      id: "more-than-one-order",
      title: "More than one lost ticket",
      paragraphs: [
        "Owners remember the loud miss: the catering ask that hit voicemail, the regular who said they called three times. The quieter damage is cumulative—Tuesday's unanswered ring, Saturday's hang-up, the guest who never left a message.",
        "Phone pickup often keeps more margin than marketplace delivery, and callers are frequently ready to buy. When the line goes unanswered, you lose a channel guests still use for timing, modifiers, and \"the usual.\"",
        "For why the phone loses during peak—not a staffing moral failure—see [why restaurants miss calls during rush](/blog/why-restaurants-miss-calls-dinner-rush).",
      ],
    },
    {
      id: "worksheet",
      title: "The worksheet (four inputs you control)",
      paragraphs: [
        "Pick one busy window you know—example: Friday 5:30–8:30 p.m.",
        "Input A — Inbound calls: count rings (phone report or manual tally). Input B — Answered calls: how many you actually picked up. Missed = A − B (or track abandoned/voicemail separately if you can).",
        "Input C — Order likelihood: of missed calls, what fraction would have placed pickup if answered immediately? Stay conservative—many would have, not all. Input D — Average pickup ticket: from POS/KDS for phone pickup, food plus tax; round down if unsure.",
        "Illustrative lost pickup for that window = Missed calls × C × D. That is food revenue you did not ticket—not profit, not catering upside, not lifetime value unless you model that separately.",
      ],
    },
    {
      id: "example-friday",
      title: "Example A: Friday peak (illustration only)",
      paragraphs: [
        "Suppose 20 inbound calls, you answered 14, six missed. You believe three of those six would have ordered pickup if answered right away. Average pickup ticket $42 (your real average may be $28 or $65).",
        "Illustrative math: 3 × $42 = $126 in unticketed pickup for that window. Not \"$126 profit\" and not \"every restaurant loses $126 on Fridays\"—just the structure with round numbers.",
        "Run Saturday with the same method. If results are in the same ballpark twice, you have a range—not precision to the penny.",
      ],
    },
    {
      id: "example-month",
      title: "Example B: rough month (still illustrative)",
      paragraphs: [
        "If two peak nights per week each show roughly $100–$150 in illustrative unticketed pickup (using your inputs, not ours), that is about $800–$1,200 per month before guests who stop calling back.",
        "Holiday weeks, events, and short staffing can swing this up. Slow January can swing it down. The point is comparison: is the gap big enough to fix the channel?",
        "Do not treat the monthly range as a revenue forecast for your accountant—treat it as a decision filter.",
      ],
    },
    {
      id: "example-recovery-cost",
      title: "Example C: compare loss to coverage cost (illustration only)",
      paragraphs: [
        "Separate food revenue from vendor fees. Illustration: if better coverage adds six completed pickup orders on a weekend at a $40 average ticket, that is about $240 in food revenue on the pass—not $240 in your pocket after food and labor cost.",
        "If success-based fees for those six orders were $0.90 each (see [pricing](/pricing)), that is $5.40 in illustrative platform fees for those six—not your full labor, onboarding, or every night of the month.",
        "Whether that trade makes sense depends on your real missed-call worksheet, how many orders coverage actually recovers, and your margins. We are not promising six orders or $240; we are showing how to compare units fairly.",
      ],
    },
    {
      id: "your-numbers-vary",
      title: "Why your worksheet will not match ours",
      paragraphs: [
        "High-volume pizza at a $28 average ticket looks nothing like a bistro at $65 with fewer rings. Catering-heavy menus can have bigger single-call upside; walk-in-heavy days may lean less on phone.",
        "Answer rate changes when you add a phone block, forward to a cell, or [cover rush with AI ordering](/blog/ai-phone-ordering-small-restaurants). Order likelihood changes with neighborhood loyalty—some guests retry once; many do not.",
        "Use KDS or POS averages when you can. If you only know cash, round down. Never defend a number you cannot trace to a weekend of observation.",
      ],
    },
    {
      id: "per-minute-vs-success",
      title: "Per-minute bills vs paying for successful pickups",
      paragraphs: [
        "Traditional phone stacks charge minutes, seats, or extensions whether or not anyone ordered. Rush holds and callbacks inflate minutes while revenue still depends on tickets that finalize.",
        "Some AI vendors price talk time the same way—longer calls, larger invoices. That misaligns incentives when you want completed pickups on the pass.",
        "Success-based pricing asks a different question: did a real guest confirm on the line and did the ticket finalize on your KDS? Hang-ups, wrong numbers, and menu tests should not count. Details in [paying only for successful orders](/blog/pay-only-successful-orders).",
      ],
    },
    {
      id: "what-counts-successful",
      title: "What counts as a successful order (for comparing vendors)",
      paragraphs: [
        "For ROAL pilots, a successful order means the caller gave a real name and phone on the line and the ticket finalized on your KDS—not an abandoned cart, a prank, or a test call while you wire voice.",
        "That definition is how you compare a per-minute quote to a per-success quote apples-to-apples. Production rates after pilot depend on volume, locations, and menu complexity—confirmed in writing before live guest traffic.",
        "Pilot list pricing is published at [pricing](/pricing) ($0.90 per successful order for many pilots—your terms may differ after volume review).",
      ],
    },
    {
      id: "recovery-next-step",
      title: "If the worksheet says the channel is leaking",
      paragraphs: [
        "The fix is coverage that answers with your live menu and tickets the pass—not a longer voicemail greeting.",
        "ROAL's loop: answer → cart from live items → confirm guest → KDS ticket. You pay around successful pickups aligned with the revenue you are trying to recover.",
        "Next steps: run your worksheet for two peak nights, listen to a demo call, and compare to pilot terms on [pricing](/pricing) or [contact](/contact) with your call volume and menu—no inflated industry stat required.",
      ],
    },
  ],
  faq: [
    {
      question: "How much do missed restaurant phone calls cost?",
      answer:
        "There is no honest universal number. Use your data: missed calls in a busy window × conservative order likelihood × your average pickup ticket. Treat blog examples as illustrations, not guarantees.",
    },
    {
      question: "How do I calculate lost revenue from unanswered calls?",
      answer:
        "Track inbound and answered calls for one or two peak nights, estimate how many missed callers would have ordered pickup, multiply by your POS/KDS average pickup check, and round down.",
    },
    {
      question: "Are the dollar examples in this article guaranteed?",
      answer:
        "No. All scenarios are labeled illustrative. Your rush volume, answer rate, ticket size, and recovery after coverage will differ.",
    },
    {
      question: "Is per-minute pricing bad for restaurant phone AI?",
      answer:
        "It can bill talk time whether or not a ticket completes. Many owners prefer fees tied to successful pickups that hit the kitchen screen.",
    },
    {
      question: "How much does ROAL cost per recovered phone order?",
      answer:
        "Many pilots use success-based pricing around $0.90 per successful pickup on the KDS—guest confirmed on the call, ticket finalized—not per ring or per minute. Confirm your terms on the pricing page before live traffic.",
    },
  ],
  relatedSlugs: [
    "why-restaurants-miss-calls-dinner-rush",
    "pay-only-successful-orders",
    "ai-phone-ordering-small-restaurants",
  ],
  cta: {
    ...BLOG_CTA_DEMO,
    description:
      "Tally one busy night with your own numbers, then try a demo call when you want to hear how recovered pickups could look on the pass.",
  },
};
