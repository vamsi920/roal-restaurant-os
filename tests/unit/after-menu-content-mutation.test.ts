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
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS: { menu: "menu" },
}));

import {
  afterMenuContentMutation,
  menuContentRevalidatePaths,
} from "@/lib/voice-agent/after-menu-content-mutation";

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000088";

describe("afterMenuContentMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates menu surfaces before and after sync settles", async () => {
    syncRestaurantAgentAfterContentChange.mockResolvedValue({
      ok: true,
      skipped: false,
      skipReason: null,
      agentId: "agent_1",
      error: null,
      trigger: "menu",
      summary: null,
    });

    const paths = menuContentRevalidatePaths(RESTAURANT_ID);

    afterMenuContentMutation(RESTAURANT_ID, { userId: "user_1" });

    expect(syncRestaurantAgentAfterContentChange).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      trigger: "menu",
      userId: "user_1",
      restaurantName: undefined,
    });

    for (const path of paths) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }

    await vi.waitFor(() => {
      expect(revalidatePath).toHaveBeenCalledTimes(paths.length * 2);
    });
  });

  it("revalidates again when sync rejects (helper should not reject; guard UI)", async () => {
    syncRestaurantAgentAfterContentChange.mockRejectedValue(new Error("unexpected"));

    afterMenuContentMutation(RESTAURANT_ID);

    await vi.waitFor(() => {
      expect(revalidatePath.mock.calls.length).toBe(
        menuContentRevalidatePaths(RESTAURANT_ID).length * 2
      );
    });
  });
});
