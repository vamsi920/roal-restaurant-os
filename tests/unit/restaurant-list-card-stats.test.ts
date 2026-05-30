import { describe, expect, it } from "vitest";
import {
  buildRestaurantCardStats,
  lastOrderAtByRestaurant,
  maxIsoTimestamp,
  resolveRestaurantSyncError,
} from "@/lib/restaurant-list/card-stats";

describe("restaurant list card stats", () => {
  it("prefers menu sync error over voice sync error", () => {
    const err = resolveRestaurantSyncError({
      restaurant_id: "r1",
      elevenlabs_agent_id: "a1",
      elevenlabs_provision_status: "ready",
      elevenlabs_provision_error: null,
      elevenlabs_menu_auto_sync_status: "failed",
      elevenlabs_menu_auto_sync_error: "Menu push failed",
      elevenlabs_last_sync_error: "Voice sync failed",
    });
    expect(err).toBe("Menu push failed");
  });

  it("picks latest timestamp across drafts and receipts", () => {
    const map = lastOrderAtByRestaurant(
      [
        {
          restaurant_id: "r1",
          updated_at: "2026-05-29T10:00:00.000Z",
        },
      ],
      [
        {
          restaurant_id: "r1",
          created_at: "2026-05-30T12:00:00.000Z",
        },
      ]
    );
    expect(map.get("r1")).toBe("2026-05-30T12:00:00.000Z");
  });

  it("builds stats from real profile and order maps", () => {
    const stats = buildRestaurantCardStats({
      restaurantIds: ["r1"],
      profilesById: {
        r1: {
          restaurant_id: "r1",
          elevenlabs_agent_id: "agent-1",
          elevenlabs_provision_status: "ready",
          elevenlabs_provision_error: null,
          elevenlabs_last_sync_error: null,
          elevenlabs_menu_auto_sync_status: "succeeded",
          elevenlabs_menu_auto_sync_error: null,
        },
      },
      menuItemCounts: new Map([["r1", 14]]),
      lastOrderAt: new Map([["r1", "2026-05-30T15:00:00.000Z"]]),
    });
    expect(stats.r1).toEqual({
      restaurantId: "r1",
      agentLinked: true,
      menuItemCount: 14,
      lastOrderAt: "2026-05-30T15:00:00.000Z",
      syncError: null,
    });
  });

  it("maxIsoTimestamp keeps the newer value", () => {
    expect(
      maxIsoTimestamp("2026-05-01T00:00:00.000Z", "2026-05-02T00:00:00.000Z")
    ).toBe("2026-05-02T00:00:00.000Z");
  });
});
