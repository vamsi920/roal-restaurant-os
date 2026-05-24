import { describe, expect, it } from "vitest";
import {
  FinalizeOrderRequestSchema,
  GetMenuPostBodySchema,
  GetMenuQuerySchema,
  GetMenuResponseSchema,
  SyncDraftOrderRequestSchema,
  assertRestaurantIdMatches,
  formatZodValidationError,
  parseAgentToolRequest,
  parseAgentToolResponse,
} from "@/lib/agent-tools/schemas";
import {
  formatCartValidationError,
  validateCartForFinalize,
  validateCustomerForFinalize,
} from "@/lib/orders/validate-cart";
import {
  ITEM_BURGER_ID,
  menuItems,
  menuModifiers,
  RESTAURANT_ID,
} from "../fixtures/menu";

const SESSION_ID = "conv_test_session_001";

describe("agent tool request schemas", () => {
  it("parses valid sync_draft_order body", () => {
    const parsed = parseAgentToolRequest(
      SyncDraftOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
        items: [{ name: "Classic Burger", quantity: 1 }],
      },
      { tool: "sync_draft_order" }
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects sync without session_id with structured issues", () => {
    const parsed = parseAgentToolRequest(
      SyncDraftOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        status: "draft",
        items: [],
      },
      { tool: "sync_draft_order" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.status).toBe(400);
      expect(parsed.body.code).toBe("validation_failed");
      expect(parsed.body.message).toContain("sync_draft_order");
      expect(parsed.body.recovery_hint).toContain("session_id");
      expect(parsed.body.issues?.some((i) => i.path === "session_id")).toBe(true);
      expect(
        parsed.body.issues?.find((i) => i.path === "session_id")?.suggestion
      ).toBeTruthy();
    }
  });

  it("rejects sync without items array", () => {
    const parsed = parseAgentToolRequest(
      SyncDraftOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
      },
      { tool: "sync_draft_order" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.issues?.some((i) => i.path === "items")).toBe(true);
      expect(parsed.body.recovery_hint).toContain("items");
    }
  });

  it("rejects finalize without customer fields", () => {
    const parsed = parseAgentToolRequest(
      FinalizeOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
      },
      { tool: "finalize_order" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.issues?.some((i) => i.path === "customer_name")).toBe(
        true
      );
      expect(parsed.body.issues?.some((i) => i.path === "customer_phone")).toBe(
        true
      );
      expect(parsed.body.recovery_hint).toContain("finalize_order");
    }
  });

  it("rejects finalize line without name or item_id", () => {
    const parsed = parseAgentToolRequest(
      FinalizeOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        customer_name: "Maria Lopez",
        customer_phone: "4155551212",
        items: [{ quantity: 2 }],
      },
      { tool: "finalize_order" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.recovery_hint).toContain("name or item_id");
    }
  });

  it("rejects invalid restaurant_id uuid", () => {
    const parsed = parseAgentToolRequest(
      SyncDraftOrderRequestSchema,
      {
        restaurant_id: "not-a-uuid",
        session_id: SESSION_ID,
        status: "draft",
        items: [],
      },
      { tool: "sync_draft_order" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.recovery_hint).toContain("get_menu_items");
    }
  });

  it("rejects unknown JSON keys (strict)", () => {
    const parsed = parseAgentToolRequest(
      SyncDraftOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
        items: [],
        surprise: true,
      },
      { tool: "sync_draft_order" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.issues?.length).toBeGreaterThan(0);
    }
  });

  it("parses get_menu query with optional restaurant_id", () => {
    const parsed = parseAgentToolRequest(
      GetMenuQuerySchema,
      { restaurant_id: RESTAURANT_ID },
      { tool: "get_menu_items" }
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects invalid get_menu query restaurant_id", () => {
    const parsed = parseAgentToolRequest(
      GetMenuQuerySchema,
      { restaurant_id: "bad" },
      { tool: "get_menu_items" }
    );
    expect(parsed.ok).toBe(false);
  });

  it("parses get_menu POST body", () => {
    const parsed = parseAgentToolRequest(
      GetMenuPostBodySchema,
      {},
      { tool: "get_menu_items" }
    );
    expect(parsed.ok).toBe(true);
  });
});

describe("get_menu_items response schema", () => {
  it("accepts nested menu payload from Edge", () => {
    const body = {
      restaurant: { id: RESTAURANT_ID, name: "Test Bistro", created_at: new Date().toISOString() },
      categories: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          name: "Mains",
          sort_order: 0,
          items: [
            {
              id: ITEM_BURGER_ID,
              name: "Classic Burger",
              description: null,
              price: 12.5,
              is_available: true,
              modifiers: [
                {
                  id: menuModifiers[0].id,
                  group_name: "Add-ons",
                  modifier_name: "Extra cheese",
                  extra_price: 1.5,
                  min_selection: 0,
                  max_selection: 2,
                },
              ],
            },
          ],
        },
      ],
      restaurant_name_hint: "Test Bistro",
      operations: {
        ordering_allowed: true,
        message: "Open now.",
        status: "open",
        is_open_now: true,
      },
    };
    const parsed = parseAgentToolResponse(GetMenuResponseSchema, body, {
      tool: "get_menu_items",
    });
    expect(parsed.ok).toBe(true);
  });
});

describe("cart validation error shape", () => {
  it("returns agent-friendly empty_cart error on finalize", () => {
    const result = validateCartForFinalize([], menuItems, menuModifiers);
    expect(result.ok).toBe(false);
    const body = formatCartValidationError(result, { tool: "finalize_order" });
    expect(body.code).toBe("order_validation_failed");
    expect(body.issues?.[0]?.code).toBe("empty_cart");
    expect(body.issues?.[0]?.path).toBe("items[0]");
    expect(body.issues?.[0]?.suggestion).toBeTruthy();
    expect(body.recovery_hint).toContain("sync_draft_order");
  });
});

describe("customer validation error shape", () => {
  it("returns structured placeholder phone error", () => {
    const check = validateCustomerForFinalize("Maria Lopez", "555-000-0000");
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.issues[0]?.code).toBe("placeholder_customer_phone");
    }
  });
});

describe("formatZodValidationError", () => {
  it("sets tool-specific message", () => {
    const parsed = SyncDraftOrderRequestSchema.safeParse({
      session_id: "",
      status: "draft",
      items: [],
    });
    if (parsed.success) throw new Error("expected failure");
    const body = formatZodValidationError(parsed.error, {
      tool: "sync_draft_order",
    });
    expect(body.message).toBe("sync_draft_order request failed validation.");
  });
});

describe("assertRestaurantIdMatches", () => {
  it("allows matching restaurant scope", () => {
    const result = assertRestaurantIdMatches(RESTAURANT_ID, RESTAURANT_ID);
    expect(result.ok).toBe(true);
  });

  it("blocks mismatched restaurant scope", () => {
    const result = assertRestaurantIdMatches(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      RESTAURANT_ID
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.body.code).toBe("restaurant_id_mismatch");
      expect(result.body.recovery_hint).toBeTruthy();
    }
  });

  it("allows matching scope when body uuid casing differs", () => {
    const result = assertRestaurantIdMatches(
      RESTAURANT_ID.toUpperCase(),
      RESTAURANT_ID
    );
    expect(result.ok).toBe(true);
  });
});
