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
    expect(elevenLabsMocks.createConvaiTool).toHaveBeenCalledTimes(3);

    const configs = elevenLabsMocks.createConvaiTool.mock.calls.map(
      (c) => c[0].tool_config as Record<string, unknown>
    );
    const names = configs.map((c) => c.name).sort();
    expect(names).toEqual([
      "finalize_order",
      "get_menu_items",
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
  });
});
