import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/scanner/commit/route";
import { RESTAURANT_ID } from "../fixtures/menu";

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "77777777-7777-4777-8777-777777777777";

function accessOk() {
  return {
    access: {
      restaurant: {
        id: RESTAURANT_ID,
        organization_id: ORG_ID,
        name: "Test",
        created_at: new Date().toISOString(),
      },
      membership: {} as never,
      role: "owner" as const,
    },
    context: { user: { id: USER_ID } } as never,
    errorResponse: null,
  };
}

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/scanner/commit-menu", () => ({
  commitMenuToRestaurant: vi.fn(),
}));

vi.mock("@/lib/scanner/menu-import-audit", () => ({
  getMenuImportForRestaurant: vi.fn(),
  recordMenuImportCommitted: vi.fn(),
  recordMenuImportCommitFailed: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/usage/record", () => ({
  recordRestaurantUsage: vi.fn(),
}));

vi.mock("@/lib/voice-agent/after-menu-content-mutation", () => ({
  afterMenuContentMutation: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { commitMenuToRestaurant } from "@/lib/scanner/commit-menu";
import { afterMenuContentMutation } from "@/lib/voice-agent/after-menu-content-mutation";
import { VOICE_AGENT_CONTENT_SYNC_TRIGGERS } from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

describe("menu upload commit flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(commitMenuToRestaurant).mockResolvedValue({
      stats: { categories: 1, items: 2, modifiers: 0 },
      menu: { categories: [] } as never,
    });
  });

  it("returns 422 and skips DB merge when scan has no orderable items", async () => {
    const res = await POST(
      new Request("http://localhost/api/scanner/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          menu: { categories: [{ name: "Mains", items: [] }] },
        }),
      })
    );

    expect(res.status).toBe(422);
    expect(commitMenuToRestaurant).not.toHaveBeenCalled();
    expect(afterMenuContentMutation).not.toHaveBeenCalled();
  });

  it("commits menu and schedules voice agent sync when items are present", async () => {
    const menu = {
      categories: [
        {
          name: "Mains",
          items: [{ name: "Burger", price: 12, modifiers: [] }],
        },
      ],
    };

    const res = await POST(
      new Request("http://localhost/api/scanner/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          menu,
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(commitMenuToRestaurant).toHaveBeenCalledWith(
      RESTAURANT_ID,
      expect.objectContaining({
        categories: [
          expect.objectContaining({
            name: "Mains",
            items: [
              expect.objectContaining({ name: "Burger", price: 12 }),
            ],
          }),
        ],
      })
    );
    expect(afterMenuContentMutation).toHaveBeenCalledWith(RESTAURANT_ID, {
      userId: USER_ID,
      restaurantName: "Test",
      trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.scanner_commit,
    });
  });
});
