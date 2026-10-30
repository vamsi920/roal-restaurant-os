import { BLOG_CTA_MENU } from "../cta";
import type { BlogArticleContent } from "../types";

export const setupRoal20MinutesContent: BlogArticleContent = {
  summary:
    "Paste your restaurant link, let ROAL build your phone host in about two minutes, test-call it in your browser, then forward your number when the order read-back sounds right.",
  answerShort:
    "Going live with ROAL takes three steps: paste your restaurant's website, Google Maps link, or name and city at tryroal.com/try and ROAL builds a phone host from your menu, prices and hours in about two minutes; test-call it in your browser with no sign-up; then claim it and forward your existing restaurant number. Most of your time goes into checking your top sellers and modifiers, not into setup.",
  author: "ROAL Team",
  seo: {
    title: "How to Go Live with ROAL AI Phone Orders | ROAL Journal",
    description:
      "Paste your restaurant link, get a phone host in about two minutes, test-call it in the browser, then forward your number. What to check before live calls.",
  },
  sections: [
    {
      id: "before-you-start",
      title: "Before you start",
      paragraphs: [
        "Have your website, Google Maps listing, or a menu file handy, plus your pickup hours. You will not need a developer or new phone hardware.",
        "Pick a quiet window—not mid-service—for the first test call so you can hear the read-back clearly.",
      ],
    },
    {
      id: "build-the-host",
      title: "Paste your link, get a phone host",
      paragraphs: [
        "At [tryroal.com/try](/try), paste your website, Google Maps link, or restaurant name and city. ROAL reads your menu, prices, hours and address and builds your phone host in about two minutes.",
        "No sign-up is needed to try it. If the menu came from an old PDF, upload your current menu file in any format and edits reach the next caller.",
      ],
    },
    {
      id: "test-call",
      title: "Test-call it, fix the top sellers",
      paragraphs: [
        "Call the host from your browser and order like a guest, with one change mid-call. Listen for the read-back, the ready time, and how it asks about required choices.",
        "Spend your time on the dishes that drive phone volume and any required modifier groups. If something is wrong, fix the menu item and call again until the read-back matches what the kitchen expects.",
      ],
    },
    {
      id: "go-live",
      title: "Claim it and forward your number",
      paragraphs: [
        "When test calls feel routine, claim the host. Each location gets its own phone line, and you forward your existing number to it—all calls, or only when the line is busy or unanswered. Use the [call forwarding codes](/tools/call-forwarding-codes) for your carrier.",
        "You keep your number and can turn forwarding off any time. Many owners start with one busy service, such as Friday dinner, then widen coverage once tickets look right.",
      ],
    },
  ],
  faq: [
    {
      question: "How long does ROAL setup take?",
      answer:
        "ROAL builds a phone host from your restaurant link in about two minutes. Testing your top items and forwarding your number takes a little longer, depending on how much of the menu you want to check first.",
    },
    {
      question: "What do I need before my first test call?",
      answer:
        "Your website, Google Maps link, or a menu file, plus accurate pickup hours. Know which modifiers are required on your most-ordered items.",
    },
    {
      question: "Can I go live the same day?",
      answer:
        "Yes. Once test calls sound right and your team knows which calls come to them (catering, complaints, allergy questions), you can forward your number.",
    },
    {
      question: "Do I need a new phone number for AI phone orders?",
      answer:
        "No. You keep your number and forward it to the phone line ROAL gives your location. Guests dial the same number they already trust.",
    },
    {
      question: "What does it cost to go live?",
      answer:
        "Nothing up front. ROAL charges $0.90 per completed order, with no monthly fee, setup fee or contract. Test calls are free.",
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
      "Paste your restaurant link, hear your own phone host in about two minutes, and place a test call before you forward a single live call.",
  },
};
