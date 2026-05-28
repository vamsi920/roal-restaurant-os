import { aiPhoneOrderingSmallRestaurantsContent } from "./posts/ai-phone-ordering-small-restaurants";
import { costUnansweredRestaurantPhoneCallsContent } from "./posts/cost-unanswered-restaurant-phone-calls";
import { payOnlySuccessfulOrdersContent } from "./posts/pay-only-successful-orders";
import { phoneOrdersVsDeliveryAppsContent } from "./posts/phone-orders-vs-delivery-apps";
import { rushHourStaffingPhoneLineContent } from "./posts/rush-hour-staffing-phone-line";
import { setupRoal20MinutesContent } from "./posts/setup-roal-20-minutes";
import { whenAiShouldHandOffToStaffContent } from "./posts/when-ai-should-hand-off-to-staff";
import { phoneAgentMustKnowLiveMenuContent } from "./posts/phone-agent-must-know-live-menu";
import { restaurantAiVoiceAgentSoundsHumanContent } from "./posts/restaurant-ai-voice-agent-sounds-human";
import { whyRestaurantsMissCallsContent } from "./posts/why-restaurants-miss-calls-dinner-rush";
import { validateAllBlogAeo } from "./validate-aeo";
import { validateAllBlogLinks } from "./validate-links";
import { validateAllBlogSeo } from "./validate-seo";
import type { BlogPost } from "./types";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-restaurants-miss-calls-dinner-rush",
    title: "Why pickup calls go unanswered at rush",
    excerpt:
      "At 7 p.m. your team is on the pass—not the phone. Why rings go unanswered and how to cover pickup calls.",
    primaryCategorySlug: "missed-calls",
    categorySlugs: ["missed-calls"],
    readTimeMinutes: 7,
    publishedAt: "2026-04-08",
    featured: true,
    content: whyRestaurantsMissCallsContent,
  },
  {
    slug: "ai-phone-ordering-small-restaurants",
    title: "AI phone orders from your live menu",
    excerpt:
      "Guests still call for pickup. AI answers from your live menu and tickets the kitchen while staff run the room.",
    primaryCategorySlug: "phone-orders",
    categorySlugs: ["phone-orders"],
    readTimeMinutes: 8,
    publishedAt: "2026-04-15",
    content: aiPhoneOrderingSmallRestaurantsContent,
  },
  {
    slug: "cost-unanswered-restaurant-phone-calls",
    title: "What missed pickup phone calls cost",
    excerpt:
      "Every unanswered ring is pickup you never ticketed. A simple rush-hour worksheet—illustrative, not a promise.",
    primaryCategorySlug: "missed-calls",
    categorySlugs: ["missed-calls", "pricing"],
    readTimeMinutes: 9,
    publishedAt: "2026-04-22",
    content: costUnansweredRestaurantPhoneCallsContent,
  },
  {
    slug: "restaurant-ai-voice-agent-sounds-human",
    title: "Restaurant phone AI that sounds human",
    excerpt:
      "Live-menu answers, honest disclosure, warm handoff—what to listen for before you forward pickup calls.",
    primaryCategorySlug: "ai-basics",
    categorySlugs: ["ai-basics"],
    readTimeMinutes: 7,
    publishedAt: "2026-05-01",
    content: restaurantAiVoiceAgentSoundsHumanContent,
  },
  {
    slug: "phone-agent-must-know-live-menu",
    title: "Your pickup line needs your live menu",
    excerpt:
      "86s and prices on the phone must match the kitchen screen—or expo stops trusting pickup tickets.",
    primaryCategorySlug: "ai-basics",
    categorySlugs: ["ai-basics", "phone-orders"],
    readTimeMinutes: 8,
    publishedAt: "2026-05-08",
    content: phoneAgentMustKnowLiveMenuContent,
  },
  {
    slug: "pay-only-successful-orders",
    title: "Pay only when pickup hits your pass",
    excerpt:
      "$0.90 per ticket on your kitchen screen—not per ring or per minute. What counts as a billable pickup order.",
    primaryCategorySlug: "pricing",
    categorySlugs: ["pricing"],
    readTimeMinutes: 7,
    publishedAt: "2026-05-15",
    content: payOnlySuccessfulOrdersContent,
  },
  {
    slug: "setup-roal-20-minutes",
    title: "Go live with AI phone orders in ~20 minutes",
    excerpt:
      "Scan your menu, test a pickup call, and watch a ticket hit the pass—about twenty minutes for most shops.",
    primaryCategorySlug: "operations",
    categorySlugs: ["operations"],
    readTimeMinutes: 4,
    publishedAt: "2026-05-18",
    content: setupRoal20MinutesContent,
  },
  {
    slug: "rush-hour-staffing-phone-line",
    title: "Who covers the pickup line at rush?",
    excerpt:
      "The host is not free when the door looks calm. Split phone coverage so pickup orders still hit the kitchen screen.",
    primaryCategorySlug: "operations",
    categorySlugs: ["operations"],
    readTimeMinutes: 5,
    publishedAt: "2026-05-19",
    content: rushHourStaffingPhoneLineContent,
  },
  {
    slug: "phone-orders-vs-delivery-apps",
    title: "Phone pickup vs delivery apps",
    excerpt:
      "Pickup by phone keeps the guest relationship—and more of the check—in your restaurant.",
    primaryCategorySlug: "phone-orders",
    categorySlugs: ["phone-orders"],
    readTimeMinutes: 6,
    publishedAt: "2026-05-20",
    content: phoneOrdersVsDeliveryAppsContent,
  },
  {
    slug: "when-ai-should-hand-off-to-staff",
    title: "When phone AI should hand off to staff",
    excerpt:
      "Allergies, complaints, and odd pickup requests deserve a person—a warm handoff, not a dead line.",
    primaryCategorySlug: "ai-basics",
    categorySlugs: ["ai-basics", "operations"],
    readTimeMinutes: 5,
    publishedAt: "2026-05-21",
    content: whenAiShouldHandOffToStaffContent,
  },
];

validateAllBlogAeo();
validateAllBlogLinks();
validateAllBlogSeo(BLOG_POSTS);
