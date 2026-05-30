import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ITEM_BURGER_ID,
  menuItems,
  menuModifiers,
  RESTAURANT_ID,
} from "../fixtures/menu";
import { menuContextFromGetMenuResponse } from "@/lib/voice-agent/test-harness/menu-context";
import { runHarnessScenario } from "@/lib/voice-agent/test-harness/run-scenario";
import {
  getHarnessScenario,
  HARNESS_SCENARIOS,
} from "@/lib/voice-agent/test-harness/scenarios";
import {
  clearHarnessDryRunDraft,
  simulateHarnessTool,
} from "@/lib/voice-agent/test-harness/simulate-tool";
import { HARNESS_ROAL_SCENARIO_IDS } from "@/lib/voice-agent/test-harness/types";
import {
  validateCartForSync,
  validateCustomerForFinalize,
} from "@/lib/orders/validate-cart";
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
    restaurant: {
      id: RESTAURANT_ID,
      name: "Test Bistro",
      created_at: new Date().toISOString(),
    },
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

function mockClosedHours() {
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

describe("HARNESS_ROAL_SCENARIO_IDS", () => {
  it.each(HARNESS_ROAL_SCENARIO_IDS)("registers scenario %s", (id) => {
    expect(getHarnessScenario(id)).toBeDefined();
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

describe("real validators (shared with simulateHarnessTool)", () => {
  it("rejects sold-out lines on sync", () => {
    const result = validateCartForSync(
      [{ name: "Daily Special", quantity: 1 }],
      menuItems,
      burgerWithRequiredSize
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "item_unavailable")).toBe(true);
  });

  it("rejects finalize guest phone with too few digits", () => {
    const result = validateCustomerForFinalize("Jordan Lee", "123");
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "customer_phone_invalid")).toBe(
      true
    );
  });

  it("rejects finalize guest name that is too short", () => {
    const result = validateCustomerForFinalize("J", "5550109988");
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "customer_name_too_short")).toBe(
      true
    );
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

describe("runHarnessScenario — ROAL flows", () => {
  it("pickup_order: menu → sync → finalize", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "pickup_order",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps.map((s) => s.tool)).toEqual([
      "get_menu_items",
      "sync_draft_order",
      "finalize_order",
    ]);
    expect(result.steps[2]?.response).toMatchObject({ ok: true, dry_run: true });
  });

  it("menu_question: get_menu_items only", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "menu_question",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.tool).toBe("get_menu_items");
    expect(result.steps[0]?.ok).toBe(true);
  });

  it("closed_hours_call: requires ordering_allowed false on menu", async () => {
    mockClosedHours();
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "closed_hours_call",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps).toHaveLength(1);
    const ops = (result.steps[0]?.response as { operations?: { ordering_allowed?: boolean } })
      ?.operations;
    expect(ops?.ordering_allowed).toBe(false);
  });

  it("closed_hours_call fails when restaurant is open", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "closed_hours_call",
      dryRun: true,
    });
    expect(result.passed).toBe(false);
    expect(result.summary).toMatch(/open/i);
  });

  it("unavailable_item: sync fails item_unavailable", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "unavailable_item",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[1]?.cartValidation?.issues.some(
      (i) => i.code === "item_unavailable"
    )).toBe(true);
  });

  it("finalize_missing_guest: schema rejects missing contact fields", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "finalize_missing_guest",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[2]?.httpStatus).toBe(400);
    expect(result.steps[2]?.response).toMatchObject({
      error: "validation_failed",
    });
  });

  it("finalize_missing_phone: customer_phone_invalid", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "finalize_missing_phone",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[2]?.response).toMatchObject({
      error: "customer_validation_failed",
    });
    const issues = (
      result.steps[2]?.response as { issues?: { code: string }[] }
    )?.issues;
    expect(issues?.some((i) => i.code === "customer_phone_invalid")).toBe(true);
  });

  it("finalize_missing_name: customer_name_too_short", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "finalize_missing_name",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
    expect(result.steps[2]?.response).toMatchObject({
      error: "customer_validation_failed",
    });
    const issues = (
      result.steps[2]?.response as { issues?: { code: string }[] }
    )?.issues;
    expect(issues?.some((i) => i.code === "customer_name_too_short")).toBe(true);
  });

  it("catering_handoff and complaint_handoff: menu load only", async () => {
    for (const scenarioId of ["catering_handoff", "complaint_handoff"] as const) {
      const result = await runHarnessScenario({
        supabase: supabaseStub,
        restaurantId: RESTAURANT_ID,
        restaurantName: "Test Bistro",
        scenarioId,
        dryRun: true,
      });
      expect(result.passed).toBe(true);
      expect(result.steps.every((s) => s.tool === "get_menu_items")).toBe(true);
    }
  });

  it("closed_restaurant_sync: restaurant_closed on sync and finalize", async () => {
    mockClosedHours();
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

  it("pickup_order fails when requireOrderingOpen and hours are closed", async () => {
    mockClosedHours();
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "pickup_order",
      dryRun: true,
    });
    expect(result.passed).toBe(false);
    expect(result.summary).toMatch(/closed/i);
  });
});

describe("runHarnessScenario — modifier and cart edge cases", () => {
  it("accepts valid required modifier on sync", async () => {
    const result = await runHarnessScenario({
      supabase: supabaseStub,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      scenarioId: "valid_modifier_sync",
      dryRun: true,
    });
    expect(result.passed).toBe(true);
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
    expect(
      result.steps[1]?.cartValidation?.issues.some((i) => i.code === "unknown_modifier")
    ).toBe(true);
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
});

describe("HARNESS_SCENARIOS registry", () => {
  it("has unique scenario ids", () => {
    const ids = HARNESS_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
