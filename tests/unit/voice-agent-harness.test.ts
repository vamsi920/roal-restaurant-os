import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ITEM_BURGER_ID,
  ITEM_SOLD_OUT_ID,
  menuItems,
  menuModifiers,
  RESTAURANT_ID,
} from "../fixtures/menu";
import { menuContextFromGetMenuResponse } from "@/lib/voice-agent/test-harness/menu-context";
import { runHarnessScenario } from "@/lib/voice-agent/test-harness/run-scenario";
import {
  clearHarnessDryRunDraft,
  simulateHarnessTool,
} from "@/lib/voice-agent/test-harness/simulate-tool";
import type { SupabaseClient } from "@supabase/supabase-js";

const burgerWithRequiredSize = [
  ...menuModifiers,
  {
    id: "66666666-6666-4666-8666-666666666666",
    item_id: ITEM_BURGER_ID,
    group_name: "Size",
    modifier_name: "Large",
    extra_price: 2,
    min_selection: 1,
    max_selection: 1,
    sort_order: 1,
    group_sort_order: 1,
  },
];

vi.mock("@/lib/menu-editor/load-menu", () => ({
  loadRestaurantMenu: vi.fn(),
}));

vi.mock("@/lib/restaurant-hours/helpers", () => ({
  loadRestaurantHoursBundle: vi.fn(),
}));

vi.mock("@/lib/voice-agent/test-harness/build-get-menu", () => ({
  buildGetMenuHarnessResponse: vi.fn(),
}));

import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import { buildGetMenuHarnessResponse } from "@/lib/voice-agent/test-harness/build-get-menu";

const supabaseStub = {} as SupabaseClient;

function menuResponse(operations: Record<string, unknown> = {}) {
  const categoryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  return {
    restaurant: { id: RESTAURANT_ID, name: "Test Bistro", created_at: new Date().toISOString() },
    categories: [
      {
        id: categoryId,
        name: "Mains",
        sort_order: 0,
        items: menuItems.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          price: it.price,
          is_available: it.is_available,
          modifiers: burgerWithRequiredSize
            .filter((m) => m.item_id === it.id)
            .map((m) => ({
              id: m.id,
              group_name: m.group_name,
              modifier_name: m.modifier_name,
              extra_price: m.extra_price,
              min_selection: m.min_selection,
              max_selection: m.max_selection,
            })),
        })),
      },
    ],
    operations: {
      ordering_allowed: true,
      message: "Open now.",
      ...operations,
    },
  };
}

beforeEach(() => {
  vi.mocked(loadRestaurantMenu).mockResolvedValue({
    categories: [],
    items: menuItems,
    modifiers: burgerWithRequiredSize,
  });
  vi.mocked(loadRestaurantHoursBundle).mockResolvedValue(null);
  vi.mocked(buildGetMenuHarnessResponse).mockResolvedValue({
    httpStatus: 200,
    body: menuResponse(),
  });
});

describe("menuContextFromGetMenuResponse", () => {
  it("finds available, unavailable, and required-modifier hints", () => {
    const ctx = menuContextFromGetMenuResponse(menuResponse());
    expect(ctx?.firstAvailableItemName).toBe("House Salad");
    expect(ctx?.firstUnavailableItemName).toBe("Daily Special");
    expect(ctx?.requiredModifier).toMatchObject({
      itemName: "Classic Burger",
      groupName: "Size",
      exampleModifierName: "Large",
    });
  });
});

describe("simulateHarnessTool dry-run cart carryover", () => {
  it("finalize uses items from prior dry-run sync", async () => {
    const sessionId = "roal-harness-test-carryover";
    clearHarnessDryRunDraft(RESTAURANT_ID, sessionId);

    const sync = await simulateHarnessTool({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: sessionId,
        status: "draft",
        items: [{ name: "Classic Burger", quantity: 1, customizations: ["Large"] }],
      },
      dryRun: true,
    });
    expect(sync.ok).toBe(true);

    const fin = await simulateHarnessTool({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      tool: "finalize_order",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: sessionId,
        customer_name: "Alex",
        customer_phone: "555-010-2233",
      },
      dryRun: true,
    });
    expect(fin.ok).toBe(true);
    expect(fin.cartValidation?.normalizedItems).toHaveLength(1);
  });
});

describe("runHarnessScenario", () => {
  it("happy pickup dry-run passes sync then finalize", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "happy_pickup_order",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[2]?.tool).toBe("finalize_order");
    expect(result.steps[2]?.ok).toBe(true);
  });

  it("rejects unavailable item on sync", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "unavailable_item_sync",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[1]?.ok).toBe(false);
    expect(result.steps[1]?.expectedFailure).toBe(true);
  });

  it("accepts valid required modifier on sync", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "valid_modifier_sync",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[1]?.ok).toBe(true);
    expect(result.steps[1]?.cartValidation?.normalizedItems).toHaveLength(1);
  });

  it("rejects invalid modifier on sync", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "invalid_modifier_sync",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[1]?.cartValidation?.issues.some((i) => i.code === "unknown_modifier")).toBe(
      true
    );
  });

  it("rejects finalize without customer info", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "finalize_without_customer",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[2]?.httpStatus).toBe(400);
  });

  it("rejects empty cart finalize", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "empty_cart_finalize",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[1]?.cartValidation?.issues.some((i) => i.code === "empty_cart")).toBe(
      true
    );
  });

  it("rejects required modifier missing", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "required_modifier_missing",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(
      result.steps[1]?.cartValidation?.issues.some(
        (i) => i.code === "required_modifier_missing"
      )
    ).toBe(true);
  });

  it("blocks sync and finalize when hours are closed", async () => {
    vi.mocked(buildGetMenuHarnessResponse).mockResolvedValue({
      httpStatus: 200,
      body: menuResponse({
        ordering_allowed: false,
        message: "Closed for the night.",
      }),
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
        local_date: "2026-05-19",
        local_time: "22:00",
        local_day_of_week: 1,
      },
    } as never);

    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "closed_restaurant_sync",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[1]?.response).toMatchObject({ error: "restaurant_closed" });
    expect(result.steps[2]?.response).toMatchObject({ error: "restaurant_closed" });
  });
});
