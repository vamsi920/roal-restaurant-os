import type { RestaurantKnowledgeCategory } from "@/lib/restaurant-knowledge/schema";

export type RestaurantKnowledgeCategoryOption = {
  value: RestaurantKnowledgeCategory;
  label: string;
  exampleQuestion: string;
  exampleAnswer: string;
};

export const RESTAURANT_KNOWLEDGE_CATEGORY_OPTIONS: RestaurantKnowledgeCategoryOption[] =
  [
    {
      value: "hours",
      label: "Hours & wait time",
      exampleQuestion: "How long is the wait for pickup?",
      exampleAnswer:
        "Quote prep_time from get_restaurant_info as an estimate only. If we are closed, use operations.message.",
    },
    {
      value: "directions",
      label: "Directions & parking",
      exampleQuestion: "Where should pickup guests park?",
      exampleAnswer:
        "Use the short-term spaces behind the building and come to the pickup counter.",
    },
    {
      value: "allergens",
      label: "Allergens & dietary",
      exampleQuestion: "Do you have gluten-free options?",
      exampleAnswer:
        "We can mention gluten-friendly menu items if marked, but we cannot guarantee no cross-contact.",
    },
    {
      value: "policies",
      label: "Delivery, pickup, refunds & reservations",
      exampleQuestion: "Do you take reservations on this phone line?",
      exampleAnswer:
        "This line handles pickup and delivery orders. For table reservations, staff will call back during open hours.",
    },
    {
      value: "policies",
      label: "Catering & large parties",
      exampleQuestion: "Can I place a catering order by phone?",
      exampleAnswer:
        "Take party size and event date, then offer a manager callback within one business day. Do not quote catering pricing on the call.",
    },
    {
      value: "handoff",
      label: "Complaints & escalation",
      exampleQuestion: "What should the agent do for a complaint call?",
      exampleAnswer:
        "Apologize, capture order number if any, and offer a manager callback—do not offer refunds on the call.",
    },
    {
      value: "menu",
      label: "Menu & specials",
      exampleQuestion: "Do you have daily specials?",
      exampleAnswer:
        "Use get_menu_items for current items and prices. Do not invent specials that are not on the live menu.",
    },
    {
      value: "general",
      label: "Other guest questions",
      exampleQuestion: "Do you have Wi-Fi for guests?",
      exampleAnswer:
        "We do not publish Wi-Fi details on this line. Offer the store phone or a staff callback if they still need help.",
    },
  ];

export function knowledgeCategoryLabel(
  category: RestaurantKnowledgeCategory
): string {
  return (
    RESTAURANT_KNOWLEDGE_CATEGORY_OPTIONS.find((opt) => opt.value === category)
      ?.label ?? category.replace(/_/g, " ")
  );
}
