import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/restaurant-profile/helpers", () => ({
  ensureRestaurantProfile: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/notifications/operational-events", () => ({
  emitProvisionFailureIfTransition: vi.fn().mockResolvedValue(false),
  emitMenuAutoSyncFailureIfTransition: vi.fn().mockResolvedValue(false),
}));

import { provisionRestaurantConvaiAgent } from "@/lib/elevenlabs/agent-provision";
import { provisionRestaurantVoiceAgent } from "@/lib/voice-agent/provision-restaurant-voice-agent";

const TEMPLATE_AGENT_ID = "agent_template_env";
const CLONED_AGENT_ID = "agent_restaurant_dedicated";
const RESTAURANT_ID = "00000000-0000-4000-8000-000000000099";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";

describe("ElevenLabs clone provisioning (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("duplicates from template id and returns new agent id only", async () => {
    const duplicateConvaiAgent = vi.fn().mockResolvedValue({
      agent_id: CLONED_AGENT_ID,
    });
    const getConvaiAgent = vi.fn();
    const createConvaiAgent = vi.fn();

    const result = await provisionRestaurantConvaiAgent(
      {
        restaurantId: RESTAURANT_ID,
        restaurantName: "North",
        templateAgentId: TEMPLATE_AGENT_ID,
      },
      {
        getTemplateAgentId: () => TEMPLATE_AGENT_ID,
        getConvaiAgent,
        duplicateConvaiAgent,
        createConvaiAgent,
      }
    );

    expect(result.agent_id).toBe(CLONED_AGENT_ID);
    expect(result.template_agent_id).toBe(TEMPLATE_AGENT_ID);
    expect(duplicateConvaiAgent).toHaveBeenCalledTimes(1);
    expect(duplicateConvaiAgent).toHaveBeenCalledWith(
      TEMPLATE_AGENT_ID,
      expect.objectContaining({ name: expect.stringContaining("North") })
    );
    expect(getConvaiAgent).not.toHaveBeenCalled();
    expect(createConvaiAgent).not.toHaveBeenCalled();
  });

  it("runSync receives cloned id, never template id", async () => {
    const profileUpdates: Record<string, unknown>[] = [];
    const chain = {
      update: vi.fn((patch: Record<string, unknown>) => {
        profileUpdates.push(patch);
        return chain;
      }),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const client = {
      from: vi.fn(() => chain),
    };

    const runSync = vi.fn().mockResolvedValue({
      sync: { ok: true, agent_id: CLONED_AGENT_ID, tools: [] },
      profile: {
        ok: true,
        agent_id: CLONED_AGENT_ID,
        knowledge_base_doc_attached: false,
        restaurant_placeholders_updated: true,
        patched_keys: [],
      },
      summary: {
        tools: [],
        tool_ids_on_agent: [],
        restaurant_placeholders_updated: true,
        first_message_updated: true,
        restaurant_tools_baked: true,
        knowledge_base_doc_attached: false,
        phone_personalization_webhook: null,
      },
    });

    await provisionRestaurantVoiceAgent(
      RESTAURANT_ID,
      "South",
      ORG_ID,
      USER_ID,
      {
        getSupabase: async () => client as never,
        provisionConvaiAgent: vi.fn().mockResolvedValue({
          agent_id: CLONED_AGENT_ID,
          agent_name: "ROAL — South",
          template_agent_id: TEMPLATE_AGENT_ID,
          method: "duplicate",
        }),
        runSync,
      }
    );

    expect(runSync).toHaveBeenCalledWith({
      agentId: CLONED_AGENT_ID,
      restaurantId: RESTAURANT_ID,
      restaurantName: "South",
    });
    expect(runSync).not.toHaveBeenCalledWith(
      expect.objectContaining({ agentId: TEMPLATE_AGENT_ID })
    );

    expect(
      profileUpdates.some(
        (u) =>
          u.elevenlabs_agent_id === CLONED_AGENT_ID &&
          u.elevenlabs_provision_status === "ready"
      )
    ).toBe(true);
    expect(
      profileUpdates.some((u) => u.elevenlabs_agent_id === TEMPLATE_AGENT_ID)
    ).toBe(false);
  });
});
