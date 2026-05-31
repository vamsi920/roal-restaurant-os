import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROAL_RESTAURANT_ID_HEADER } from "@/lib/sync-elevenlabs-roal-tools";

const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const AGENT_ID = "agent_baked_test";
const EDGE_BASE = "https://test.supabase.co";

const elevenLabsMocks = vi.hoisted(() => ({
  createConvaiTool: vi.fn(),
  patchConvaiTool: vi.fn(),
  listAllConvaiTools: vi.fn(),
  getConvaiAgent: vi.fn(),
  patchConvaiAgent: vi.fn(),
}));

vi.mock("@/lib/env.server", () => ({
  requireElevenLabsAgentId: vi.fn(() => AGENT_ID),
  requireRoalToolSecrets: vi.fn(() => ({
    agentToolSecret: "legacy-secret",
    supabaseAnonKey: "anon-key",
    edgeBase: EDGE_BASE,
  })),
}));

vi.mock("@/lib/elevenlabs", () => ({
  getElevenLabsApiKey: vi.fn(() => "xi-key"),
  createConvaiTool: elevenLabsMocks.createConvaiTool,
  patchConvaiTool: elevenLabsMocks.patchConvaiTool,
  listAllConvaiTools: elevenLabsMocks.listAllConvaiTools,
  getConvaiAgent: elevenLabsMocks.getConvaiAgent,
  patchConvaiAgent: elevenLabsMocks.patchConvaiAgent,
}));

vi.mock("@/lib/restaurant-profile/helpers", () => ({
  getRestaurantProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleSupabase: vi.fn().mockResolvedValue(null),
}));

import { syncRoalElevenLabsTools } from "@/lib/sync-elevenlabs-roal-tools";

describe("syncRoalElevenLabsTools baked config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    elevenLabsMocks.listAllConvaiTools.mockResolvedValue([]);
    elevenLabsMocks.createConvaiTool.mockImplementation(
      async ({ tool_config }: { tool_config: { name: string } }) => ({
        id: `tool-${tool_config.name}`,
        tool_config,
      })
    );
    elevenLabsMocks.getConvaiAgent.mockResolvedValue({
      conversation_config: {
        agent: { dynamic_variables: { dynamic_variable_placeholders: {} } },
      },
    });
    elevenLabsMocks.patchConvaiAgent.mockResolvedValue({});
  });

  it("creates ROAL tool webhooks with baked headers and stable names", async () => {
    const result = await syncRoalElevenLabsTools({
      agentId: AGENT_ID,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Egg Mania",
    });

    expect(result.ok).toBe(true);
    expect(result.restaurant_tools_baked).toBe(true);
    expect(elevenLabsMocks.createConvaiTool).toHaveBeenCalledTimes(7);

    const configs = elevenLabsMocks.createConvaiTool.mock.calls.map(
      (c) => c[0].tool_config as Record<string, unknown>
    );
    const names = configs.map((c) => c.name).sort();
    expect(names).toEqual([
      "finalize_order",
      "get_caller_history",
      "get_menu_items",
      "get_order_status",
      "get_restaurant_info",
      "submit_reservation_request",
      "sync_draft_order",
    ]);

    const getMenu = configs.find((c) => c.name === "get_menu_items")!;
    const apiSchema = getMenu.api_schema as {
      url: string;
      method: string;
      request_headers: Record<string, string>;
    };
    expect(apiSchema.method).toBe("GET");
    expect(apiSchema.url).toContain("/functions/v1/get-menu");
    expect(apiSchema.url).toContain(
      `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
    );
    expect(apiSchema.request_headers[ROAL_RESTAURANT_ID_HEADER]).toBe(
      RESTAURANT_ID
    );
    expect(apiSchema.request_headers.Authorization).toMatch(/^Bearer /);

    const restaurantInfo = configs.find((c) => c.name === "get_restaurant_info")!;
    const infoSchema = restaurantInfo.api_schema as {
      url: string;
      method: string;
      request_headers: Record<string, string>;
    };
    expect(infoSchema.method).toBe("GET");
    expect(infoSchema.url).toContain("/functions/v1/get-restaurant-info");
    expect(infoSchema.url).toContain(
      `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
    );
    expect(infoSchema.request_headers[ROAL_RESTAURANT_ID_HEADER]).toBe(
      RESTAURANT_ID
    );

    const syncDraft = configs.find((c) => c.name === "sync_draft_order")!;
    const syncSchema = syncDraft.api_schema as {
      url: string;
      request_headers: Record<string, string>;
      request_body_schema: {
        required: string[];
        properties: Record<string, unknown>;
      };
    };
    expect(syncSchema.url).toContain("/functions/v1/sync-draft-order");
    expect(syncSchema.url).toContain(
      `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
    );
    expect(syncSchema.request_headers[ROAL_RESTAURANT_ID_HEADER]).toBe(
      RESTAURANT_ID
    );
    expect(syncSchema.request_body_schema.required).toEqual([
      "session_id",
      "status",
      "items",
    ]);
    expect(syncSchema.request_body_schema.properties).not.toHaveProperty(
      "restaurant_id"
    );
    expect(syncSchema.request_body_schema.properties).toHaveProperty(
      "fulfillment_type"
    );
    expect(syncSchema.request_body_schema.properties).toHaveProperty(
      "delivery_address"
    );

    const finalize = configs.find((c) => c.name === "finalize_order")!;
    const finSchema = finalize.api_schema as {
      url: string;
      request_body_schema: { properties: Record<string, unknown> };
    };
    expect(finSchema.url).toContain("/functions/v1/finalize-order");
    expect(finSchema.url).toContain(
      `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
    );
    expect(finSchema.request_body_schema.properties).not.toHaveProperty(
      "restaurant_id"
    );
    expect(finSchema.request_body_schema.properties).toHaveProperty(
      "fulfillment_type"
    );
    expect(finSchema.request_body_schema.properties).toHaveProperty(
      "delivery_address"
    );

    const orderStatus = configs.find((c) => c.name === "get_order_status")!;
    const statusSchema = orderStatus.api_schema as {
      url: string;
      request_headers: Record<string, string>;
      request_body_schema: {
        properties: Record<string, unknown>;
      };
    };
    expect(statusSchema.url).toContain("/functions/v1/get-order-status");
    expect(statusSchema.url).toContain(
      `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
    );
    expect(statusSchema.request_headers[ROAL_RESTAURANT_ID_HEADER]).toBe(
      RESTAURANT_ID
    );
    expect(statusSchema.request_body_schema.properties).not.toHaveProperty(
      "restaurant_id"
    );
    expect(statusSchema.request_body_schema.properties).toHaveProperty(
      "customer_phone"
    );

    const callerHistory = configs.find((c) => c.name === "get_caller_history")!;
    const callerSchema = callerHistory.api_schema as {
      url: string;
      request_headers: Record<string, string>;
      request_body_schema: {
        properties: Record<string, unknown>;
      };
    };
    expect(callerSchema.url).toContain("/functions/v1/get-caller-history");
    expect(callerSchema.url).toContain(
      `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
    );
    expect(callerSchema.request_headers[ROAL_RESTAURANT_ID_HEADER]).toBe(
      RESTAURANT_ID
    );
    expect(callerSchema.request_body_schema.properties).not.toHaveProperty(
      "restaurant_id"
    );
    expect(callerSchema.request_body_schema.properties).toHaveProperty(
      "customer_phone"
    );

    const reservation = configs.find((c) => c.name === "submit_reservation_request")!;
    const reservationSchema = reservation.api_schema as {
      url: string;
      request_headers: Record<string, string>;
      request_body_schema: {
        required: string[];
        properties: Record<string, unknown>;
      };
    };
    expect(reservationSchema.url).toContain(
      "/functions/v1/submit-reservation-request"
    );
    expect(reservationSchema.url).toContain(
      `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
    );
    expect(reservationSchema.request_headers[ROAL_RESTAURANT_ID_HEADER]).toBe(
      RESTAURANT_ID
    );
    expect(reservationSchema.request_body_schema.properties).not.toHaveProperty(
      "restaurant_id"
    );
    expect(reservationSchema.request_body_schema.required).toEqual([
      "customer_name",
      "customer_phone",
      "party_size",
      "requested_date",
      "requested_time",
    ]);
  });
});
