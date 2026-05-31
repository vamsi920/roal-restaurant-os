import { describe, expect, it } from "vitest";
import { buildRestaurantOrderAgentPrompt } from "@/lib/elevenlabs/agent-prompt";
import { VOICE_AGENT_CONTENT_SYNC_TRIGGERS } from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

describe("menu voice sync", () => {
  it("prompt refuses ordering when menu snapshot has zero items", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Test Kitchen",
      profile: null,
      hoursPromptSection: null,
      menu: { categoryCount: 1, itemCount: 0, modifierCount: 0 },
    });
    expect(prompt).toMatch(/no orderable menu items/i);
    expect(prompt).toMatch(/do not add items or call sync_draft_order/i);
  });

  it("includes menu size hint when items exist", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Test Kitchen",
      profile: null,
      hoursPromptSection: null,
      menu: { categoryCount: 2, itemCount: 8, modifierCount: 1 },
    });
    expect(prompt).toContain("Menu size hint: 2 categories, 8 items");
  });

  it("scanner commit uses dedicated voice sync trigger", () => {
    expect(VOICE_AGENT_CONTENT_SYNC_TRIGGERS.scanner_commit).toBe("scanner_commit");
  });
});
