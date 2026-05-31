import { describe, expect, it } from "vitest";
import {
  FinalizeOrderRequestSchema,
  GetCallerHistoryRequestSchema,
  GetCallerHistoryResponseSchema,
  GetRestaurantInfoPostBodySchema,
  GetRestaurantInfoResponseSchema,
  GetOrderStatusRequestSchema,
  GetOrderStatusResponseSchema,
  GetMenuPostBodySchema,
  GetMenuQuerySchema,
  GetMenuResponseSchema,
  SubmitReservationRequestSchema,
  SubmitReservationResponseSchema,
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

  it("parses delivery details on sync_draft_order", () => {
    const parsed = parseAgentToolRequest(
      SyncDraftOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "draft",
        fulfillment_type: "delivery",
        delivery_address: "123 Market St, Apt 4B",
        delivery_instructions: "Ring side gate buzzer",
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

  it("parses delivery details on finalize_order", () => {
    const parsed = parseAgentToolRequest(
      FinalizeOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        customer_name: "Maria Lopez",
        customer_phone: "4155551212",
        fulfillment_type: "delivery",
        delivery_address: "123 Market St, Apt 4B",
        delivery_instructions: "Leave at lobby desk",
        items: [{ name: "Classic Burger", quantity: 1 }],
      },
      { tool: "finalize_order" }
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects finalize delivery without delivery_address", () => {
    const parsed = parseAgentToolRequest(
      FinalizeOrderRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        customer_name: "Maria Lopez",
        customer_phone: "4155551212",
        fulfillment_type: "delivery",
        items: [{ name: "Classic Burger", quantity: 1 }],
      },
      { tool: "finalize_order" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.issues?.some((i) => i.path === "delivery_address")).toBe(
        true
      );
      expect(parsed.body.recovery_hint).toContain("delivery_address");
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

  it("parses get_restaurant_info POST body", () => {
    const parsed = parseAgentToolRequest(
      GetRestaurantInfoPostBodySchema,
      {},
      { tool: "get_restaurant_info" }
    );
    expect(parsed.ok).toBe(true);
  });

  it("parses get_order_status by customer phone", () => {
    const parsed = parseAgentToolRequest(
      GetOrderStatusRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "+15551234567",
      },
      { tool: "get_order_status" }
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects get_order_status without lookup details", () => {
    const parsed = parseAgentToolRequest(
      GetOrderStatusRequestSchema,
      { restaurant_id: RESTAURANT_ID },
      { tool: "get_order_status" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.recovery_hint).toContain("session_id");
    }
  });

  it("parses get_caller_history by customer phone", () => {
    const parsed = parseAgentToolRequest(
      GetCallerHistoryRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "+15551234567",
      },
      { tool: "get_caller_history" }
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects get_caller_history without caller details", () => {
    const parsed = parseAgentToolRequest(
      GetCallerHistoryRequestSchema,
      { restaurant_id: RESTAURANT_ID },
      { tool: "get_caller_history" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.recovery_hint).toContain("phone number or name");
    }
  });

  it("parses submit_reservation_request", () => {
    const parsed = parseAgentToolRequest(
      SubmitReservationRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        customer_name: "Priya Shah",
        customer_phone: "+14155550199",
        party_size: 4,
        requested_date: "tomorrow",
        requested_time: "7 PM",
        notes: "Birthday dinner",
      },
      { tool: "submit_reservation_request" }
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects submit_reservation_request without reservation details", () => {
    const parsed = parseAgentToolRequest(
      SubmitReservationRequestSchema,
      {
        restaurant_id: RESTAURANT_ID,
        customer_name: "P",
      },
      { tool: "submit_reservation_request" }
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.body.issues?.some((i) => i.path === "party_size")).toBe(true);
      expect(parsed.body.issues?.some((i) => i.path === "requested_date")).toBe(
        true
      );
    }
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

describe("get_order_status response schema", () => {
  it("accepts a found order status payload", () => {
    const parsed = parseAgentToolResponse(
      GetOrderStatusResponseSchema,
      {
        ok: true,
        order: {
          found: true,
          status: "ready",
          status_label: "ready for pickup",
          message: "That order is ready for pickup.",
          session_id: SESSION_ID,
          customer_name: "Maria Lopez",
          customer_phone: "+15551234567",
          item_count: 3,
          updated_at: "2026-05-30T18:00:00.000Z",
          created_at: "2026-05-30T17:45:00.000Z",
        },
      },
      { tool: "get_order_status" }
    );
    expect(parsed.ok).toBe(true);
  });
});

describe("get_caller_history response schema", () => {
  it("accepts returning caller history payload", () => {
    const parsed = parseAgentToolResponse(
      GetCallerHistoryResponseSchema,
      {
        ok: true,
        caller: {
          found: true,
          customer_name: "Maria Lopez",
          customer_phone: "+15551234567",
          visit_count: 2,
          completed_order_count: 2,
          last_order_at: "2026-05-30T17:45:00.000Z",
          last_order_items: ["Paneer Tikka", "Naan"],
          favorite_items: ["Paneer Tikka"],
          message:
            "Returning guest with 2 completed pickup orders here. You may mention you can help with their usual, but do not assume they want it.",
        },
      },
      { tool: "get_caller_history" }
    );
    expect(parsed.ok).toBe(true);
  });
});

describe("submit_reservation_request response schema", () => {
  it("accepts reservation request payload", () => {
    const parsed = parseAgentToolResponse(
      SubmitReservationResponseSchema,
      {
        ok: true,
        reservation_request: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          restaurant_id: RESTAURANT_ID,
          session_id: SESSION_ID,
          conversation_id: SESSION_ID,
          customer_name: "Priya Shah",
          customer_phone: "+14155550199",
          party_size: 4,
          requested_date: "tomorrow",
          requested_time: "7 PM",
          notes: "Birthday dinner",
          status: "requested",
          created_at: "2026-05-30T19:15:00.000Z",
          message:
            "Reservation request saved for 4 guests on tomorrow at 7 PM. Staff will confirm.",
        },
      },
      { tool: "submit_reservation_request" }
    );
    expect(parsed.ok).toBe(true);
  });
});

describe("get_restaurant_info response schema", () => {
  it("accepts live business facts, operations, and FAQ entries", () => {
    const parsed = parseAgentToolResponse(
      GetRestaurantInfoResponseSchema,
      {
        ok: true,
        restaurant: {
          id: RESTAURANT_ID,
          name: "Test Bistro",
          phone: "+15551234567",
          website: "https://example.com",
          cuisine: "Pizza",
          address: {
            line1: "123 Main St",
            line2: null,
            city: "Austin",
            region: "TX",
            postal_code: "78701",
            country: "US",
            display: "123 Main St, Austin, TX, 78701, US",
          },
          service_modes: {
            pickup: true,
            delivery: false,
          },
          prep_time_minutes: 20,
          prep_time_message:
            "Typical pickup prep time is about 20 minutes. Quote this as an estimate, not a promise.",
        },
        operations: {
          ordering_allowed: true,
          is_open_now: true,
          status: "open",
          message: "Open now.",
          local_date: "2026-05-30",
          local_time: "18:00",
        },
        knowledge_entries: [
          {
            category: "directions",
            question: "Where do I park?",
            answer: "Use the short-term spaces behind the restaurant.",
          },
        ],
      },
      { tool: "get_restaurant_info" }
    );
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
