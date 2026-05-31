import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/scanner/commit/route";
import { RESTAURANT_ID } from "../fixtures/menu";

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "77777777-7777-4777-8777-777777777777";
const IMPORT_ID = "88888888-8888-4888-8888-888888888888";

const validMenu = {
  categories: [
    {
      name: "Mains",
      items: [
        {
          name: "Burger",
          price: 12,
          modifiers: [
            {
              group_name: "Add-ons",
              modifier_name: "Cheese",
              extra_price: 1,
              min_selection: 0,
              max_selection: 1,
            },
          ],
        },
      ],
    },
  ],
};

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
import {
  getMenuImportForRestaurant,
  recordMenuImportCommitted,
} from "@/lib/scanner/menu-import-audit";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordRestaurantUsage } from "@/lib/usage/record";
import { afterMenuContentMutation } from "@/lib/voice-agent/after-menu-content-mutation";
import { VOICE_AGENT_CONTENT_SYNC_TRIGGERS } from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

function commitRequest(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/scanner/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/scanner/commit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabase).mockResolvedValue({} as never);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: validMenu,
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when restaurant_id missing", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const res = await commitRequest({ menu: validMenu });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("restaurant_id");
  });

  it("returns 422 for invalid menu schema", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: { categories: [] },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("Invalid menu payload");
  });

  it("returns 422 when blocking review errors exist", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: {
        categories: [
          {
            name: "Mains",
            items: [{ name: "  ", price: 5, modifiers: [] }],
          },
        ],
      },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/validation/i);
    expect(body.hints?.length).toBeGreaterThan(0);
    expect(vi.mocked(commitMenuToRestaurant)).not.toHaveBeenCalled();
  });

  it("commits when duplicate item names are warnings only", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(commitMenuToRestaurant).mockResolvedValue({
      stats: { categories: 1, items: 2, modifiers: 0 },
      menu: validMenu as never,
    });

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: {
        categories: [
          {
            name: "Mains",
            items: [
              { name: "Burger", price: 10, modifiers: [] },
              { name: "burger", price: 11, modifiers: [] },
            ],
          },
        ],
      },
    });

    expect(res.status).toBe(200);
    expect(vi.mocked(commitMenuToRestaurant)).toHaveBeenCalled();
  });

  it("returns 404 when import_id not found", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(getMenuImportForRestaurant).mockResolvedValue(null);

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: validMenu,
      import_id: IMPORT_ID,
    });
    expect(res.status).toBe(404);
    expect(vi.mocked(commitMenuToRestaurant)).not.toHaveBeenCalled();
  });

  it("returns 409 when import already committed", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(getMenuImportForRestaurant).mockResolvedValue({
      id: IMPORT_ID,
      extraction_status: "committed",
    } as never);

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: validMenu,
      import_id: IMPORT_ID,
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already committed/i);
  });

  it("returns 200 and records audit + usage on success", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(getMenuImportForRestaurant).mockResolvedValue({
      id: IMPORT_ID,
      extraction_status: "extracted",
    } as never);
    vi.mocked(commitMenuToRestaurant).mockResolvedValue({
      stats: { categories: 1, items: 1, modifiers: 1 },
      menu: validMenu as never,
    });

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: validMenu,
      import_id: IMPORT_ID,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stats).toEqual({ categories: 1, items: 1, modifiers: 1 });
    expect(recordMenuImportCommitted).toHaveBeenCalledWith(
      expect.anything(),
      IMPORT_ID,
      { categories: 1, items: 1, modifiers: 1 }
    );
    expect(recordRestaurantUsage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "import_attempt",
        organizationId: ORG_ID,
        restaurantId: RESTAURANT_ID,
        idempotencyKey: `import_attempt:${IMPORT_ID}:committed`,
        metadata: expect.objectContaining({ outcome: "committed" }),
      })
    );
    expect(afterMenuContentMutation).toHaveBeenCalledWith(RESTAURANT_ID, {
      userId: USER_ID,
      restaurantName: "Test",
      trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.scanner_commit,
    });
  });

  it("does not schedule voice sync when commit is blocked", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const res = await commitRequest({
      restaurant_id: RESTAURANT_ID,
      menu: { categories: [] },
    });

    expect(res.status).toBe(422);
    expect(afterMenuContentMutation).not.toHaveBeenCalled();
  });
});
