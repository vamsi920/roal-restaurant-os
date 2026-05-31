import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FINALIZE_ORDER_STATUS } from "@/lib/order-status";
import { buildOrderStatusHistory } from "@/lib/orders/status-history";
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
import type { DraftOrderRow } from "@/lib/types";

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

const SESSION_ID = "conv_finalize_pass53";
const DRAFT_ORDER_ID = "88888888-8888-4888-8888-888888888888";

function buildSupabaseForFinalizeFlow() {
  let draftRow: Record<string, unknown> | null = null;
  let receiptRow: Record<string, unknown> | null = null;
  const receiptUpsert = vi.fn((row: Record<string, unknown>) => {
    receiptRow = row;
    return Promise.resolve({ error: null });
  });

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "draft_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: draftRow,
                  error: null,
                })),
              })),
            })),
          })),
          upsert: vi.fn((row: Record<string, unknown>) => {
            draftRow = {
              ...draftRow,
              ...row,
              id: draftRow?.id ?? DRAFT_ORDER_ID,
              created_at:
                draftRow?.created_at ?? "2026-05-30T12:00:00.000Z",
            };
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: draftRow, error: null }),
              }),
            };
          }),
        };
      }
      if (table === "phone_order_receipts") {
        return {
          upsert: receiptUpsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    getDraft: () => draftRow,
    getReceipt: () => receiptRow,
    receiptUpsert,
  };

  return supabase;
}

function finalizeBody(extra: Record<string, unknown> = {}) {
  return {
    restaurant_id: RESTAURANT_ID,
    session_id: SESSION_ID,
    customer_name: "Maria Lopez",
    customer_phone: "4155551212",
    fulfillment_type: "pickup",
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

describe("finalize_order harness (draft → kitchen ticket + receipt)", () => {
  it("finalizes cart from prior draft session into status new", async () => {
    const supabase = buildSupabaseForFinalizeFlow();

    const sync = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
        items: [{ item_id: ITEM_BURGER_ID, quantity: 2 }],
      },
      dryRun: false,
    });
    expect(sync.ok).toBe(true);

    const fin = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody(),
      dryRun: false,
    });

    expect(fin.ok).toBe(true);
    expect(fin.wroteDatabase).toBe(true);
    expect(supabase.getDraft()?.status).toBe(FINALIZE_ORDER_STATUS);
    expect(supabase.getDraft()?.customer_name).toBe("Maria Lopez");
    expect(supabase.receiptUpsert).toHaveBeenCalledOnce();
    expect(supabase.getReceipt()).toMatchObject({
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      customer_name: "Maria Lopez",
      items: [
        expect.objectContaining({
          item_id: ITEM_BURGER_ID,
          quantity: 2,
        }),
      ],
    });

    const history = buildOrderStatusHistory(supabase.getDraft() as DraftOrderRow);
    expect(history.map((h) => h.label)).toContain("Ticket sent to kitchen");
  });

  it("writes phone_order_receipt when finalizing with inline items", async () => {
    const supabase = buildSupabaseForFinalizeFlow();
    const fin = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody({
        items: [{ item_id: ITEM_BURGER_ID, quantity: 1 }],
      }),
      dryRun: false,
    });

    expect(fin.ok).toBe(true);
    expect(supabase.receiptUpsert).toHaveBeenCalledOnce();
    expect(supabase.getDraft()?.status).toBe("new");
  });
});

describe("finalize_order validation gates", () => {
  it("rejects empty cart when draft has no line items", async () => {
    const supabase = buildSupabaseForFinalizeFlow();
    await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
        items: [],
      },
      dryRun: false,
    });

    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody(),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(result.response).toMatchObject({ code: "order_validation_failed" });
    expect(
      result.cartValidation?.issues.some((i) => i.code === "empty_cart")
    ).toBe(true);
    expect(supabase.receiptUpsert).not.toHaveBeenCalled();
  });

  it("rejects unavailable items", async () => {
    const supabase = buildSupabaseForFinalizeFlow();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody({
        items: [{ item_id: ITEM_SOLD_OUT_ID, quantity: 1 }],
      }),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(
      result.cartValidation?.issues.some((i) => i.code === "item_unavailable")
    ).toBe(true);
    expect(supabase.receiptUpsert).not.toHaveBeenCalled();
  });

  it("rejects unknown modifiers", async () => {
    const supabase = buildSupabaseForFinalizeFlow();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody({
        items: [
          {
            item_id: ITEM_BURGER_ID,
            quantity: 1,
            customizations: ["Ghost topping"],
          },
        ],
      }),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(
      result.cartValidation?.issues.some((i) => i.code === "unknown_modifier")
    ).toBe(true);
  });

  it("blocks finalize when ordering_allowed is false", async () => {
    const supabase = buildSupabaseForFinalizeFlow();
    await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
        items: [{ item_id: ITEM_BURGER_ID, quantity: 1 }],
      },
      dryRun: false,
    });

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

    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody(),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(403);
    expect(result.response).toMatchObject({ error: "restaurant_closed" });
    expect(supabase.receiptUpsert).not.toHaveBeenCalled();
    expect(supabase.getDraft()?.status).toBe("draft");
  });

  it("rejects delivery when profile allows_delivery is false", async () => {
    const supabase = buildSupabaseForFinalizeFlow();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody({
        fulfillment_type: "delivery",
        delivery_address: "742 Evergreen Terrace, Springfield",
        items: [{ item_id: ITEM_BURGER_ID, quantity: 1 }],
      }),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(result.response).toMatchObject({ code: "delivery_not_offered" });
    expect(supabase.receiptUpsert).not.toHaveBeenCalled();
  });

  it("rejects pickup when profile allows_pickup is false", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue({
      allows_pickup: false,
      allows_delivery: true,
    } as never);

    const supabase = buildSupabaseForFinalizeFlow();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody({
        fulfillment_type: "pickup",
        items: [{ item_id: ITEM_BURGER_ID, quantity: 1 }],
      }),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(422);
    expect(result.response).toMatchObject({ code: "pickup_not_offered" });
    expect(supabase.receiptUpsert).not.toHaveBeenCalled();
  });

  it("rejects delivery without a real address and does not upsert receipt", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue({
      allows_pickup: true,
      allows_delivery: true,
    } as never);

    const supabase = buildSupabaseForFinalizeFlow();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody({
        fulfillment_type: "delivery",
        delivery_address: "TBD",
        items: [{ item_id: ITEM_BURGER_ID, quantity: 1 }],
      }),
      dryRun: false,
    });

    expect(result.httpStatus).toBe(400);
    expect(result.response).toMatchObject({ code: "missing_delivery_address" });
    expect(supabase.receiptUpsert).not.toHaveBeenCalled();
  });

  it("writes delivery fulfillment fields on allowed delivery finalize", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue({
      allows_pickup: false,
      allows_delivery: true,
    } as never);

    const supabase = buildSupabaseForFinalizeFlow();
    const result = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: finalizeBody({
        fulfillment_type: "delivery",
        delivery_address: "742 Evergreen Terrace, Springfield",
        delivery_instructions: "Ring doorbell",
        items: [{ item_id: ITEM_BURGER_ID, quantity: 1 }],
      }),
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect(supabase.getDraft()).toMatchObject({
      fulfillment_type: "delivery",
      delivery_address: "742 Evergreen Terrace, Springfield",
      delivery_instructions: "Ring doorbell",
    });
    expect(supabase.getReceipt()).toMatchObject({
      fulfillment_type: "delivery",
      delivery_address: "742 Evergreen Terrace, Springfield",
      delivery_instructions: "Ring doorbell",
    });
  });
});
