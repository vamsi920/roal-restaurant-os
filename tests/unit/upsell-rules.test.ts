import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRestaurantOrderAgentPrompt } from "@/lib/elevenlabs/agent-prompt";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import { simulateHarnessTool } from "@/lib/voice-agent/test-harness/simulate-tool";
import {
  auditUpsellRuleAgainstMenu,
  buildMenuUpsellCatalog,
  filterUpsellRulesForPrompt,
  upsellTextMatchesMenuName,
} from "@/lib/restaurant-upsell/menu-binding";
import { upsellOutcomeCounts } from "@/lib/restaurant-upsell/analytics-signals";
import {
  shouldSkipProactiveUpsell,
  upsellSkipReason,
} from "@/lib/restaurant-upsell/skip-policy";
import { replaceRestaurantUpsellRules } from "@/lib/restaurant-upsell/helpers";
import {
  ITEM_BURGER_ID,
  ITEM_SALAD_ID,
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

const SESSION_ID = "conv_upsell_accept";

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
              single: () => Promise.resolve({ data: storedRow, error: null }),
            }),
          };
        }),
      };
    }),
    getStoredDraft: () => storedRow,
  };
  return supabase;
}

beforeEach(() => {
  vi.mocked(loadRestaurantMenu).mockResolvedValue({
    categories: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        restaurant_id: RESTAURANT_ID,
        name: "Mains",
        sort_order: 1,
        created_at: "",
        updated_at: "",
      },
    ],
    items: menuItems,
    modifiers: menuModifiers,
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
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";

const menuSnapshot: RestaurantMenuSnapshot = {
  categories: [
    {
      id: "cat-1",
      restaurant_id: RESTAURANT_ID,
      name: "Mains",
      sort_order: 1,
      created_at: "",
      updated_at: "",
    },
  ],
  items: menuItems,
  modifiers: menuModifiers,
};

const catalog = buildMenuUpsellCatalog(menuSnapshot);

describe("filterUpsellRulesForPrompt", () => {
  it("includes configured rule when offer matches an available menu item", () => {
    const ready = filterUpsellRulesForPrompt(
      [{ trigger_text: "burger", offer_text: "house salad" }],
      catalog
    );
    expect(ready).toHaveLength(1);
    expect(ready[0]?.menu_offer_names).toContain("House Salad");
  });

  it("excludes offers that are not on the live menu", () => {
    const ready = filterUpsellRulesForPrompt(
      [{ trigger_text: "burger", offer_text: "mystery combo platter" }],
      catalog
    );
    expect(ready).toHaveLength(0);
  });

  it("excludes unavailable menu items", () => {
    const ready = filterUpsellRulesForPrompt(
      [{ trigger_text: "burger", offer_text: "daily special" }],
      catalog
    );
    expect(ready).toHaveLength(0);
  });

  it("excludes all rules when menu catalog is missing", () => {
    const ready = filterUpsellRulesForPrompt(
      [{ trigger_text: "burger", offer_text: "house salad" }],
      null
    );
    expect(ready).toHaveLength(0);
  });
});

describe("buildRestaurantOrderAgentPrompt upsell safety", () => {
  it("includes configured upsell rule with menu-bound offer names", () => {
    const ready = filterUpsellRulesForPrompt(
      [{ trigger_text: "burger", offer_text: "house salad" }],
      catalog
    );
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Test Diner",
      profile: null,
      hoursPromptSection: null,
      menu: { categoryCount: 1, itemCount: 3, modifierCount: 1 },
      promptReadyUpsellRules: ready,
    });

    expect(prompt).toContain("Upsell rules");
    expect(prompt).toContain("House Salad");
    expect(prompt).toContain("Classic Burger");
    expect(prompt).toMatch(/sync_draft_order/i);
    expect(prompt).toMatch(/continue checkout without asking again/i);
    expect(prompt).not.toMatch(/combo deal|bundle price|2 for 1/i);
  });

  it("omits non-menu upsell rules from the prompt section", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Test Diner",
      profile: null,
      hoursPromptSection: null,
      menu: null,
      upsellRules: [
        { trigger_text: "pizza", offer_text: "invented dessert flight" },
      ],
      promptReadyUpsellRules: [],
    });

    expect(prompt).not.toContain("invented dessert flight");
    expect(prompt).toMatch(/Never invent add-ons/i);
  });

  it("documents skip cases for rushed, voicemail, handoff, and reservation calls", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Test Diner",
      profile: null,
      hoursPromptSection: null,
      menu: null,
    });

    expect(prompt).toMatch(/rushed, angry/i);
    expect(prompt).toMatch(/voicemail\/callback/i);
    expect(prompt).toMatch(/staff handoff/i);
    expect(prompt).toMatch(/reservation intake/i);
    expect(prompt).toMatch(/FAQ-only/i);
  });
});

describe("shouldSkipProactiveUpsell", () => {
  it("skips voicemail, callback, handoff, reservation, faq, and no-order contexts", () => {
    expect(shouldSkipProactiveUpsell({ intent: "voicemail" })).toBe(true);
    expect(shouldSkipProactiveUpsell({ intent: "callback" })).toBe(true);
    expect(shouldSkipProactiveUpsell({ intent: "handoff" })).toBe(true);
    expect(shouldSkipProactiveUpsell({ intent: "reservation" })).toBe(true);
    expect(shouldSkipProactiveUpsell({ intent: "faq" })).toBe(true);
    expect(shouldSkipProactiveUpsell({ intent: "no_order" })).toBe(true);
    expect(shouldSkipProactiveUpsell({ rushed: true, intent: "order" })).toBe(
      true
    );
    expect(shouldSkipProactiveUpsell({ angry: true, intent: "order" })).toBe(
      true
    );
    expect(
      shouldSkipProactiveUpsell({
        intent: "order",
        experimentVariant: "control",
      })
    ).toBe(true);
    expect(
      shouldSkipProactiveUpsell({ intent: "order", experimentVariant: "treatment" })
    ).toBe(false);
  });

  it("returns a human-readable skip reason", () => {
    expect(upsellSkipReason({ intent: "handoff" })).toBe("staff handoff");
  });
});

describe("upsellOutcomeCounts", () => {
  it("counts skipped as suggested minus accepted", () => {
    expect(
      upsellOutcomeCounts({ eligibleOrders: 4, attachedOrders: 1 })
    ).toEqual({
      suggested: 4,
      accepted: 1,
      skipped: 3,
    });
  });
});

describe("replaceRestaurantUpsellRules tenant scope", () => {
  it("writes rules only for the requested restaurant", async () => {
    const filters: { column: string; value: unknown }[] = [];
    const supabase = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            filters.push({ column, value });
            return Promise.resolve({ error: null });
          }),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      })),
    };

    await replaceRestaurantUpsellRules(supabase as never, {
      restaurantId: RESTAURANT_ID,
      organizationId: "org-1",
      rules: [{ trigger_text: "burger", offer_text: "fries" }],
    });

    expect(filters).toEqual([
      { column: "restaurant_id", value: RESTAURANT_ID },
    ]);
  });
});

describe("auditUpsellRuleAgainstMenu", () => {
  it("flags invented offers honestly for owners", () => {
    const audit = auditUpsellRuleAgainstMenu(
      { trigger_text: "pizza", offer_text: "mystery combo platter" },
      catalog
    );
    expect(audit.status).toBe("not_on_menu");
    expect(audit.message).toMatch(/does not match any live menu item/i);
  });

  it("flags sold-out offers as unavailable", () => {
    const audit = auditUpsellRuleAgainstMenu(
      { trigger_text: "burger", offer_text: "daily special" },
      catalog
    );
    expect(audit.status).toBe("unavailable");
    expect(audit.message).toMatch(/sold out|unavailable/i);
  });
});

describe("upsellTextMatchesMenuName", () => {
  it("matches partial menu names used in operator rules", () => {
    expect(upsellTextMatchesMenuName("large burger order", "Classic Burger")).toBe(
      true
    );
  });
});

describe("sync_draft_order upsell cart flow", () => {
  it("adds accepted upsell line items through the existing draft sync tool", async () => {
    const supabase = buildSupabaseWithDraftUpsert();
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

    const accepted = await simulateHarnessTool({
      supabase: supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "sync_draft_order",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
        items: [
          { item_id: ITEM_BURGER_ID, quantity: 1 },
          { item_id: ITEM_SALAD_ID, quantity: 1 },
        ],
      },
      dryRun: false,
    });

    expect(accepted.ok).toBe(true);
    const items = supabase.getStoredDraft()?.items as { item_id: string }[];
    expect(items).toHaveLength(2);
    expect(items.map((line) => line.item_id)).toEqual([
      ITEM_BURGER_ID,
      ITEM_SALAD_ID,
    ]);
  });

  it("keeps the cart unchanged when an upsell is declined", async () => {
    const supabase = buildSupabaseWithDraftUpsert();
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

    const declined = await simulateHarnessTool({
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

    expect(declined.ok).toBe(true);
    const items = supabase.getStoredDraft()?.items as { item_id: string }[];
    expect(items).toHaveLength(1);
    expect(items[0]?.item_id).toBe(ITEM_BURGER_ID);
  });
});
