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
    title: "Why restaurants miss calls during the dinner rush",
    excerpt:
      "At 7 p.m. your team is seating and expoing—not watching the phone. Here is why rings go unanswered and how to cover the line without another full-time hire.",
    primaryCategorySlug: "missed-calls",
    categorySlugs: ["missed-calls"],
    readTimeMinutes: 7,
    publishedAt: "2026-04-08",
    featured: true,
    content: whyRestaurantsMissCallsContent,
  },
  {
    slug: "ai-phone-ordering-small-restaurants",
    title: "How AI phone ordering helps small restaurants take more pickup orders",
    excerpt:
      "Locals still call for pickup. See how AI answers from your live menu, handles modifiers, and tickets the kitchen while your team runs the room.",
    primaryCategorySlug: "phone-orders",
    categorySlugs: ["phone-orders"],
    readTimeMinutes: 8,
    publishedAt: "2026-04-15",
    content: aiPhoneOrderingSmallRestaurantsContent,
  },
  {
    slug: "cost-unanswered-restaurant-phone-calls",
    title: "The real cost of unanswered restaurant phone calls",
    excerpt:
      "Missed rings are pickup you never ticketed. Use a simple worksheet with your rush-hour numbers—examples are illustrations, not promises.",
    primaryCategorySlug: "missed-calls",
    categorySlugs: ["missed-calls", "pricing"],
    readTimeMinutes: 9,
    publishedAt: "2026-04-22",
    content: costUnansweredRestaurantPhoneCallsContent,
  },
  {
    slug: "restaurant-ai-voice-agent-sounds-human",
    title: "What makes a restaurant AI voice agent sound human?",
    excerpt:
      "Natural language, live-menu answers, honest AI disclosure, and warm handoff—what to listen for before you forward pickup calls.",
    primaryCategorySlug: "ai-basics",
    categorySlugs: ["ai-basics"],
    readTimeMinutes: 7,
    publishedAt: "2026-05-01",
    content: restaurantAiVoiceAgentSoundsHumanContent,
  },
  {
    slug: "phone-agent-must-know-live-menu",
    title: "Why your phone agent must know your live menu",
    excerpt:
      "86s, modifiers, and prices on the phone must match the KDS—or expo stops trusting pickup tickets. One live menu fixes that.",
    primaryCategorySlug: "ai-basics",
    categorySlugs: ["ai-basics", "phone-orders"],
    readTimeMinutes: 8,
    publishedAt: "2026-05-08",
    content: phoneAgentMustKnowLiveMenuContent,
  },
  {
    slug: "pay-only-successful-orders",
    title: "Paying only for successful orders: why it matters",
    excerpt:
      "$0.90 per pickup on your KDS—not per ring or per minute. What counts as a successful order and why fees track tickets on the pass.",
    primaryCategorySlug: "pricing",
    categorySlugs: ["pricing"],
    readTimeMinutes: 7,
    publishedAt: "2026-05-15",
    content: payOnlySuccessfulOrdersContent,
  },
  {
    slug: "setup-roal-20-minutes",
    title: "How to go live with AI phone orders in about 20 minutes",
    excerpt:
      "Scan your menu, place a test call, and watch a ticket hit the pass—about twenty minutes for most single locations.",
    primaryCategorySlug: "operations",
    categorySlugs: ["operations"],
    readTimeMinutes: 4,
    publishedAt: "2026-05-18",
    content: setupRoal20MinutesContent,
  },
  {
    slug: "rush-hour-staffing-phone-line",
    title: "Rush-hour staffing: when the phone line needs its own coverage",
    excerpt:
      "At rush the host is not free because the door looks calm. Split phone coverage—human, AI, or hybrid—so pickup still lands on the pass.",
    primaryCategorySlug: "operations",
    categorySlugs: ["operations"],
    readTimeMinutes: 5,
    publishedAt: "2026-05-19",
    content: rushHourStaffingPhoneLineContent,
  },
  {
    slug: "phone-orders-vs-delivery-apps",
    title: "Phone orders vs delivery apps: margin, control, and guest loyalty",
    excerpt:
      "Pickup by phone keeps the relationship—and more of the check—in your restaurant.",
    primaryCategorySlug: "phone-orders",
    categorySlugs: ["phone-orders"],
    readTimeMinutes: 6,
    publishedAt: "2026-05-20",
    content: phoneOrdersVsDeliveryAppsContent,
  },
  {
    slug: "when-ai-should-hand-off-to-staff",
    title: "When your AI should hand off to staff (and how to make it smooth)",
    excerpt:
      "Allergies, complaints, and odd requests deserve a person. The handoff should feel warm, not cold.",
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
