import { describe, expect, it, vi, beforeEach } from "vitest";

const { revalidatePath, syncRestaurantAgentAfterContentChange } = vi.hoisted(
  () => ({
    revalidatePath: vi.fn(),
    syncRestaurantAgentAfterContentChange: vi.fn(),
  })
);

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/voice-agent/sync-restaurant-agent-after-content-change", () => ({
  syncRestaurantAgentAfterContentChange,
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS: {
    profile: "profile",
    hours: "hours",
    knowledge: "knowledge_updated",
  },
}));

import {
  afterHoursSettingsMutation,
  afterProfileSettingsMutation,
  afterRestaurantKnowledgeMutation,
  restaurantSettingsRevalidatePaths,
} from "@/lib/voice-agent/after-restaurant-settings-mutation";

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000077";

describe("afterRestaurantSettingsMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncRestaurantAgentAfterContentChange.mockResolvedValue({
      ok: true,
      skipped: false,
      skipReason: null,
      agentId: "agent_1",
      error: null,
      trigger: "profile",
      summary: null,
    });
  });

  it("afterProfileSettingsMutation syncs with profile trigger and revalidates onboarding", async () => {
    const paths = restaurantSettingsRevalidatePaths(RESTAURANT_ID);

    afterProfileSettingsMutation(RESTAURANT_ID, {
      userId: "user_1",
      restaurantName: "Bistro",
    });

    expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      trigger: "profile",
      userId: "user_1",
      restaurantName: "Bistro",
    });

    for (const path of paths) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/onboarding");
  });

  it("afterRestaurantKnowledgeMutation syncs with knowledge_updated trigger", () => {
    afterRestaurantKnowledgeMutation(RESTAURANT_ID, {
      userId: "user_3",
      restaurantName: "Bistro",
    });

    expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      trigger: "knowledge_updated",
      userId: "user_3",
      restaurantName: "Bistro",
    });
  });

  it("afterHoursSettingsMutation syncs with hours trigger", async () => {
    afterHoursSettingsMutation(RESTAURANT_ID, {
      userId: "user_2",
      restaurantName: "Diner",
    });

    expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      trigger: "hours",
      userId: "user_2",
      restaurantName: "Diner",
    });

    await vi.waitFor(() => {
      expect(revalidatePath.mock.calls.length).toBe(
        restaurantSettingsRevalidatePaths(RESTAURANT_ID).length * 2
      );
    });
  });
});
