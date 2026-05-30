import { describe, expect, it } from "vitest";
import {
  buildRestaurantLaunchBlockers,
  restaurantNeedsAttention,
  stuckOrdersBlockerMessage,
} from "@/lib/org-overview/launch-blockers";

const RESTAURANT_ID = "b2222222-2222-4222-8222-222222222222";

describe("buildRestaurantLaunchBlockers", () => {
  it("flags missing voice agent and empty menu", () => {
    const blockers = buildRestaurantLaunchBlockers({
      restaurantId: RESTAURANT_ID,
      voiceProvisionState: "not_started",
      menuSyncPhase: "no_agent",
      lastVoiceSyncError: null,
      menuItemCount: 0,
      hoursConfigured: false,
      stuckOrderCount: 0,
    });
    expect(blockers.map((b) => b.code)).toEqual([
      "voice_agent_missing",
      "menu_empty",
      "hours_not_set",
    ]);
    expect(blockers[0]?.href).toContain("/agent");
  });

  it("flags menu sync failed when agent is ready", () => {
    const blockers = buildRestaurantLaunchBlockers({
      restaurantId: RESTAURANT_ID,
      voiceProvisionState: "ready",
      menuSyncPhase: "failed",
      lastVoiceSyncError: null,
      menuItemCount: 12,
      hoursConfigured: true,
      stuckOrderCount: 0,
    });
    expect(blockers.some((b) => b.code === "menu_sync_failed")).toBe(true);
  });

  it("flags voice sync error without duplicate missing-agent blocker", () => {
    const blockers = buildRestaurantLaunchBlockers({
      restaurantId: RESTAURANT_ID,
      voiceProvisionState: "ready",
      menuSyncPhase: "succeeded",
      lastVoiceSyncError: "Tool sync failed",
      menuItemCount: 5,
      hoursConfigured: true,
      stuckOrderCount: 0,
    });
    expect(blockers.map((b) => b.code)).toEqual(["voice_sync_error"]);
  });
});

describe("restaurantNeedsAttention", () => {
  it("is true when stuck orders exist without launch blockers", () => {
    expect(restaurantNeedsAttention([], 2)).toBe(true);
    expect(restaurantNeedsAttention([], 0)).toBe(false);
  });
});

describe("stuckOrdersBlockerMessage", () => {
  it("formats stuck count copy", () => {
    expect(stuckOrdersBlockerMessage(0)).toBeNull();
    expect(stuckOrdersBlockerMessage(1)).toMatch(/1 stuck/);
    expect(stuckOrdersBlockerMessage(3)).toMatch(/3 stuck/);
  });
});
