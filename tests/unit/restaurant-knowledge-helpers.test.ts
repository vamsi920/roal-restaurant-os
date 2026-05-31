import { describe, expect, it } from "vitest";
import { buildRestaurantOrderAgentPrompt } from "@/lib/elevenlabs/agent-prompt";
import { restaurantInfoKnowledgeStatusMessage } from "@/lib/restaurant-knowledge/helpers";

describe("restaurant knowledge helpers", () => {
  it("reports honest missing-knowledge guidance for get_restaurant_info", () => {
    expect(restaurantInfoKnowledgeStatusMessage(0)).toMatch(/do not invent/i);
    expect(restaurantInfoKnowledgeStatusMessage(2)).toMatch(
      /knowledge_entries/i
    );
  });
});

describe("agent prompt knowledge injection", () => {
  it("excludes inactive knowledge entries from the prompt", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "QA Bistro",
      knowledgeEntries: [
        {
          category: "allergens",
          question: "Gluten free?",
          answer: "Active answer.",
          is_active: true,
        },
        {
          category: "directions",
          question: "Where do I park?",
          answer: "Hidden answer.",
          is_active: false,
        },
      ],
    });

    expect(prompt).toContain("Active answer.");
    expect(prompt).not.toContain("Hidden answer.");
  });
});
