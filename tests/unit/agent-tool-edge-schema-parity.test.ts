import { describe, expect, it } from "vitest";
import * as nextSchemas from "@/lib/agent-tools/schemas";
import * as edgeSchemas from "../../supabase/functions/_shared/agent-tool-zod";

const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const SESSION_ID = "conv_parity_session";

const requestCases = [
  {
    label: "sync_draft_order valid",
    schemaNext: nextSchemas.SyncDraftOrderRequestSchema,
    schemaEdge: edgeSchemas.SyncDraftOrderRequestSchema,
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
    label: "sync_draft_order missing session_id",
    schemaNext: nextSchemas.SyncDraftOrderRequestSchema,
    schemaEdge: edgeSchemas.SyncDraftOrderRequestSchema,
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
    schemaEdge: edgeSchemas.FinalizeOrderRequestSchema,
    tool: "finalize_order" as const,
    payload: {
      restaurant_id: RESTAURANT_ID,
      session_id: SESSION_ID,
    },
    expectOk: false,
  },
  {
    label: "get_menu POST empty body",
    schemaNext: nextSchemas.GetMenuPostBodySchema,
    schemaEdge: edgeSchemas.GetMenuPostBodySchema,
    tool: "get_menu_items" as const,
    payload: {},
    expectOk: true,
  },
  {
    label: "get_menu query invalid uuid",
    schemaNext: nextSchemas.GetMenuQuerySchema,
    schemaEdge: edgeSchemas.GetMenuQuerySchema,
    tool: "get_menu_items" as const,
    payload: { restaurant_id: "not-uuid" },
    expectOk: false,
  },
  {
    label: "sync rejects unknown keys (strict)",
    schemaNext: nextSchemas.SyncDraftOrderRequestSchema,
    schemaEdge: edgeSchemas.SyncDraftOrderRequestSchema,
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

describe("Next vs Edge agent-tool request schema parity", () => {
  for (const c of requestCases) {
    it(`${c.label}: both parsers agree (${c.expectOk ? "accept" : "reject"})`, () => {
      const next = nextSchemas.parseAgentToolRequest(c.schemaNext, c.payload, {
        tool: c.tool,
      });
      const edge = edgeSchemas.parseAgentToolRequest(c.schemaEdge, c.payload, {
        tool: c.tool,
      });

      expect(next.ok).toBe(c.expectOk);
      expect(edge.ok).toBe(c.expectOk);
      expect(next.ok).toBe(edge.ok);
    });
  }
});

describe("assertRestaurantIdMatches parity", () => {
  it("Next and Edge both reject mismatched body scope", () => {
    const bodyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const authId = RESTAURANT_ID;
    const next = nextSchemas.assertRestaurantIdMatches(bodyId, authId);
    const edge = edgeSchemas.assertRestaurantIdMatches(bodyId, authId);
    expect(next.ok).toBe(false);
    expect(edge.ok).toBe(false);
    if (!next.ok && !edge.ok) {
      expect(next.body.code).toBe(edge.body.code);
    }
  });

  it("Next and Edge both accept case-insensitive match", () => {
    const next = nextSchemas.assertRestaurantIdMatches(
      RESTAURANT_ID.toUpperCase(),
      RESTAURANT_ID
    );
    const edge = edgeSchemas.assertRestaurantIdMatches(
      RESTAURANT_ID.toUpperCase(),
      RESTAURANT_ID
    );
    expect(next.ok).toBe(true);
    expect(edge.ok).toBe(true);
  });
});
