import { describe, expect, it } from "vitest";
import { buildRestaurantOrderAgentPrompt } from "@/lib/elevenlabs/agent-prompt";
import {
  CALL_GUARD_CONVERSATION,
  CALL_GUARD_TURN,
  MAX_CALL_SECONDS,
  SILENCE_CHECK_IN_SECONDS,
  SILENCE_HANG_UP_SECONDS,
} from "@/lib/elevenlabs/call-guards";
import { buildTrialAgentPrompt } from "@/lib/trial/prompt";

describe("call guards", () => {
  it("hangs up on silence after room for two check-ins, and caps call length", () => {
    expect(CALL_GUARD_TURN.silence_end_call_timeout).toBeGreaterThan(0);
    expect(SILENCE_HANG_UP_SECONDS).toBeGreaterThanOrEqual(SILENCE_CHECK_IN_SECONDS * 2);
    expect(SILENCE_HANG_UP_SECONDS).toBeLessThanOrEqual(45);
    expect(CALL_GUARD_CONVERSATION.max_duration_seconds).toBe(MAX_CALL_SECONDS);
    expect(MAX_CALL_SECONDS).toBeLessThanOrEqual(600);
  });

  it("puts silence, spam and non-order handling in both host prompts", () => {
    const restaurant = buildRestaurantOrderAgentPrompt({
      restaurantName: "Eggmania",
      profile: null,
      hoursPromptSection: null,
      menu: null,
    });
    const trial = buildTrialAgentPrompt({
      restaurantName: "Eggmania",
      profile: null,
      weeklyHours: null,
      menu: null,
      menuIsSample: false,
      knowledge: [],
      persona: { agentName: "Maya" } as Parameters<typeof buildTrialAgentPrompt>[0]["persona"],
    });
    for (const prompt of [restaurant, trial]) {
      expect(prompt).toContain("After two unanswered check-ins");
      expect(prompt).toContain("Were you looking to place an order, or just checking?");
      expect(prompt).toContain("Read the full order back exactly once");
      expect(prompt).toContain("robocalls");
    }
  });
});
