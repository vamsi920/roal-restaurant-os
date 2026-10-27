import { describe, expect, it } from "vitest";
import * as nextSchemas from "@/lib/agent-tools/schemas";

const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const SESSION_ID = "conv_parity_session";

const requestCases = [
  {
    label: "sync_draft_order valid",
    schemaNext: nextSchemas.SyncDraftOrderRequestSchema,
    tool: "sync_draft_order" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      status: "draft",
      items: [{ name: "Burger", quantity: 1 }],
    },
    expectOk: true,
  },
  {
    label: "sync_draft_order delivery valid",
    schemaNext: nextSchemas.SyncDraftOrderRequestSchema,
    tool: "sync_draft_order" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      status: "draft",
      fulfillment_type: "delivery",
      delivery_address: "123 Market St",
      items: [{ name: "Burger", quantity: 1 }],
    },
    expectOk: true,
  },
  {
    label: "sync_draft_order missing session_id",
    schemaNext: nextSchemas.SyncDraftOrderRequestSchema,
    tool: "sync_draft_order" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      status: "draft",
      items: [],
    },
    expectOk: false,
  },
  {
    label: "finalize_order missing customer",
    schemaNext: nextSchemas.FinalizeOrderRequestSchema,
    tool: "finalize_order" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
    },
    expectOk: false,
  },
  {
    label: "finalize_order delivery missing address",
    schemaNext: nextSchemas.FinalizeOrderRequestSchema,
    tool: "finalize_order" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      customer_name: "Priya Shah",
      customer_phone: "+14155550199",
      fulfillment_type: "delivery",
      items: [{ name: "Burger", quantity: 1 }],
    },
    expectOk: false,
  },
  {
    label: "get_order_status valid phone lookup",
    schemaNext: nextSchemas.GetOrderStatusRequestSchema,
    tool: "get_order_status" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      customer_phone: "+15551234567",
    },
    expectOk: true,
  },
  {
    label: "get_order_status missing lookup keys",
    schemaNext: nextSchemas.GetOrderStatusRequestSchema,
    tool: "get_order_status" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
    },
    expectOk: false,
  },
  {
    label: "get_caller_history valid phone lookup",
    schemaNext: nextSchemas.GetCallerHistoryRequestSchema,
    tool: "get_caller_history" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      customer_phone: "+15551234567",
    },
    expectOk: true,
  },
  {
    label: "get_caller_history missing lookup keys",
    schemaNext: nextSchemas.GetCallerHistoryRequestSchema,
    tool: "get_caller_history" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
    },
    expectOk: false,
  },
  {
    label: "submit_reservation_request valid",
    schemaNext: nextSchemas.SubmitReservationRequestSchema,
    tool: "submit_reservation_request" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      customer_name: "Priya Shah",
      customer_phone: "+14155550199",
      party_size: 4,
      requested_date: "tomorrow",
      requested_time: "7 PM",
    },
    expectOk: true,
  },
  {
    label: "submit_reservation_request missing required fields",
    schemaNext: nextSchemas.SubmitReservationRequestSchema,
    tool: "submit_reservation_request" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      customer_phone: "+14155550199",
    },
    expectOk: false,
  },
  {
    label: "get_menu POST empty body",
    schemaNext: nextSchemas.GetMenuPostBodySchema,
    tool: "get_menu_items" as const,
    payload: {},
    expectOk: true,
  },
  {
    label: "get_restaurant_info POST empty body",
    schemaNext: nextSchemas.GetRestaurantInfoPostBodySchema,
    tool: "get_restaurant_info" as const,
    payload: {},
    expectOk: true,
  },
  {
    label: "get_menu query invalid uuid",
    schemaNext: nextSchemas.GetMenuQuerySchema,
    tool: "get_menu_items" as const,
    payload: { restaurant_id: "not-uuid" },
    expectOk: false,
  },
  {
    label: "sync rejects unknown keys (strict)",
    schemaNext: nextSchemas.SyncDraftOrderRequestSchema,
    tool: "sync_draft_order" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
      status: "draft",
      items: [],
      extra_field: true,
    },
    expectOk: false,
  },
] as const;

describe("agent-tool request schema contract (single source: lib/agent-tools/schemas)", () => {
  for (const c of requestCases) {
    it(`${c.label}: ${c.expectOk ? "accepts" : "rejects"}`, () => {
      const parsed = nextSchemas.parseAgentToolRequest(c.schemaNext, c.payload, {
        tool: c.tool,
      });
      expect(parsed.ok).toBe(c.expectOk);
      if (!parsed.ok) {
        expect(parsed.status).toBe(400);
        expect(parsed.body.code).toBe("validation_failed");
        expect(parsed.body.recovery_hint).toBeTruthy();
      }
    });
  }
});

describe("assertRestaurantIdMatches", () => {
  it("rejects mismatched body scope with restaurant_id_mismatch", () => {
    const bodyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const result = nextSchemas.assertRestaurantIdMatches(bodyId, RESTAURANT_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.body.code).toBe("restaurant_id_mismatch");
    }
  });

  it("accepts case-insensitive match", () => {
    expect(
      nextSchemas.assertRestaurantIdMatches(RESTAURANT_ID.toUpperCase(), RESTAURANT_ID).ok
    ).toBe(true);
  });
});
