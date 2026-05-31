import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { simulateHarnessTool } from "@/lib/voice-agent/test-harness/simulate-tool";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import {
  ITEM_BURGER_ID,
  ITEM_SOLD_OUT_ID,
  menuItems,
  menuModifiers,
  RESTAURANT_ID,
} from "../fixtures/menu";

vi.mock("@/lib/menu-editor/load-menu", () => ({
  loadRestaurantMenu: vi.fn(),
}));

vi.mock("@/lib/restaurant-hours/helpers", () => ({
  loadRestaurantHoursBundle: vi.fn(),
}));

vi.mock("@/lib/restaurant-profile/helpers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/restaurant-profile/helpers")>();
  return {
    ...actual,
    getRestaurantProfile: vi.fn(),
  };
});

import { getRestaurantProfile } from "@/lib/restaurant-profile/helpers";

const SESSION_ID = "conv_sync_draft_pass52";
const DRAFT_ORDER_ID = "77777777-7777-4777-8777-777777777777";

function buildSupabaseWithDraftUpsert() {
  let storedRow: Record<string, unknown> | null = null;

  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "draft_orders") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        upsert: vi.fn((row: Record<string, unknown>) => {
          storedRow = {
            ...row,
            id: storedRow?.id ?? DRAFT_ORDER_ID,
            created_at: storedRow?.created_at ?? "2026-05-30T12:00:00.000Z",
          };
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: storedRow, error: null }),
            }),
          };
        }),
      };
    }),
    getStoredDraft: () => storedRow,
  };

  return supabase;
}

function syncBody(items: unknown[], extra: Record<string, unknown> = {}) {
  return {
    restaurant_id: RESTAURANT_ID,
    session_id: SESSION_ID,
    status: "draft",
    items,
    ...extra,
  };
}

beforeEach(() => {
  vi.mocked(loadRestaurantMenu).mockResolvedValue({
    categories: [],
    items: menuItems,
    modifiers: menuModifiers,
  });
  vi.mocked(getRestaurantProfile).mockResolvedValue({
    allows_pickup: true,
    allows_delivery: false,
  } as never);
  vi.mocked(loadRestaurantHoursBundle).mockResolvedValue({
    profile: {
      timezone: "America/Chicago",
      temporarily_closed: false,
      temporarily_closed_reason: null,
    },
    weekly: [],
    exceptions: [],
    evaluation: {
      ordering_allowed: true,
      is_open_now: true,
      status: "open",
      message: "Open now.",
      local_date: "2026-05-30",
      local_time: "12:00",
      local_day_of_week: 5,
      next_open_hint: null,
    },
  } as never);
});

describe("sync_draft_order harness (KDS draft_orders upsert)", () => {
  it("creates a draft order row on first sync", async () => {
    const supabase = buildSupabaseWithDraftUpsert();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([{ item_id: ITEM_BURGER_ID, quantity: 1 }]),
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect(result.wroteDatabase).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("draft_orders");
    const stored = supabase.getStoredDraft();
    expect(stored?.session_id).toBe(SESSION_ID);
    expect(stored?.status).toBe("draft");
    expect(stored?.items).toEqual([
      expect.objectContaining({
        item_id: ITEM_BURGER_ID,
        name: "Classic Burger",
        quantity: 1,
      }),
    ]);
  });

  it("updates the same draft when quantity changes", async () => {
    const supabase = buildSupabaseWithDraftUpsert();

    await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([{ item_id: ITEM_BURGER_ID, quantity: 1 }]),
      dryRun: false,
    });

    const update = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([{ item_id: ITEM_BURGER_ID, quantity: 3 }]),
      dryRun: false,
    });

    expect(update.ok).toBe(true);
    const items = supabase.getStoredDraft()?.items as { quantity: number }[];
    expect(items[0]?.quantity).toBe(3);
  });
});

describe("sync_draft_order validation gates", () => {
  it("rejects stale menu item_id", async () => {
    const supabase = buildSupabaseWithDraftUpsert();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([
        { item_id: "99999999-9999-4999-8999-999999999999", quantity: 1 },
      ]),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(result.response).toMatchObject({ code: "order_validation_failed" });
    expect(result.cartValidation?.issues.some((i) => i.code === "stale_item_id")).toBe(
      true
    );
    expect(result.wroteDatabase).toBe(false);
  });

  it("rejects unknown modifier names", async () => {
    const supabase = buildSupabaseWithDraftUpsert();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([
        {
          item_id: ITEM_BURGER_ID,
          quantity: 1,
          customizations: ["Ghost topping"],
        },
      ]),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(
      result.cartValidation?.issues.some((i) => i.code === "unknown_modifier")
    ).toBe(true);
  });

  it("rejects unavailable items", async () => {
    const supabase = buildSupabaseWithDraftUpsert();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([{ item_id: ITEM_SOLD_OUT_ID, quantity: 1 }]),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(
      result.cartValidation?.issues.some((i) => i.code === "item_unavailable")
    ).toBe(true);
  });

  it("blocks sync when ordering_allowed is false", async () => {
    vi.mocked(loadRestaurantHoursBundle).mockResolvedValue({
      profile: {
        timezone: "America/Chicago",
        temporarily_closed: false,
        temporarily_closed_reason: null,
      },
      weekly: [],
      exceptions: [],
      evaluation: {
        ordering_allowed: false,
        is_open_now: false,
        status: "closed",
        message: "Closed for the night.",
        local_date: "2026-05-30",
        local_time: "22:00",
        local_day_of_week: 5,
        next_open_hint: null,
      },
    } as never);

    const supabase = buildSupabaseWithDraftUpsert();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([{ item_id: ITEM_BURGER_ID, quantity: 1 }]),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(403);
    expect(result.response).toMatchObject({
      error: "restaurant_closed",
      operations: { ordering_allowed: false },
    });
    expect(supabase.getStoredDraft()).toBeNull();
  });

  it("rejects delivery sync when allows_delivery is false", async () => {
    const supabase = buildSupabaseWithDraftUpsert();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([{ item_id: ITEM_BURGER_ID, quantity: 1 }], {
        fulfillment_type: "delivery",
        delivery_address: "742 Evergreen Terrace, Springfield",
      }),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(result.response).toMatchObject({ code: "delivery_not_offered" });
    expect(supabase.getStoredDraft()).toBeNull();
  });

  it("rejects pickup sync when allows_pickup is false", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue({
      allows_pickup: false,
      allows_delivery: true,
    } as never);

    const supabase = buildSupabaseWithDraftUpsert();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: syncBody([{ item_id: ITEM_BURGER_ID, quantity: 1 }], {
        fulfillment_type: "pickup",
      }),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(result.response).toMatchObject({ code: "pickup_not_offered" });
    expect(supabase.getStoredDraft()).toBeNull();
  });
});
