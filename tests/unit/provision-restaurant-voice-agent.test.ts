import { describe, expect, it, vi, beforeEach } from "vitest";
import { getElevenLabsAgentId } from "@/lib/env.server";
import {
  provisionRestaurantVoiceAgent,
  tryProvisionVoiceAgentForNewRestaurant,
} from "@/lib/voice-agent/provision-restaurant-voice-agent";

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000099";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";

function mockSupabase() {
  const updates: Record<string, unknown>[] = [];
  const chain = {
    update: vi.fn((patch: Record<string, unknown>) => {
      updates.push(patch);
      return chain;
    }),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({
        data: {
          elevenlabs_provision_status: null,
          elevenlabs_menu_auto_sync_status: null,
        },
        error: null,
      }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    client: {
      from: vi.fn(() => chain),
    } as unknown as import("@supabase/supabase-js").SupabaseClient,
    updates,
    chain,
  };
}

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

vi.mock("@/lib/env.server", () => ({
  getElevenLabsAgentId: vi.fn(),
}));

describe("tryProvisionVoiceAgentForNewRestaurant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getElevenLabsAgentId).mockReturnValue("agent_template");
  });

  it("returns skipped when template agent env is unset", async () => {
    vi.mocked(getElevenLabsAgentId).mockReturnValue(null);
    const result = await tryProvisionVoiceAgentForNewRestaurant({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Skip",
      organizationId: ORG_ID,
      userId: USER_ID,
    });
    expect(result.ok).toBe(false);
    if (result.ok || !("skipped" in result)) return;
    expect(result.skipped).toBe(true);
  });
});

describe("provisionRestaurantVoiceAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists ready + summary on full success", async () => {
    const { client, updates } = mockSupabase();
    const provisionConvaiAgent = vi.fn().mockResolvedValue({
      agent_id: "agent_new_01",
      agent_name: "ROAL — Test",
      template_agent_id: "agent_template",
      method: "duplicate",
    });
    const runSync = vi.fn().mockResolvedValue({
      sync: { ok: true, agent_id: "agent_new_01", tools: [] },
      profile: {
        ok: true,
        agent_id: "agent_new_01",
        knowledge_base_doc_attached: true,
        restaurant_placeholders_updated: true,
        patched_keys: [],
      },
      summary: {
        tools: [],
        tool_ids_on_agent: ["t1"],
        restaurant_placeholders_updated: true,
        first_message_updated: true,
        restaurant_tools_baked: true,
        knowledge_base_doc_attached: true,
        phone_personalization_webhook: "https://app.test/webhook",
      },
    });

    const result = await provisionRestaurantVoiceAgent(
      RESTAURANT_ID,
      "Test Kitchen",
      ORG_ID,
      USER_ID,
      {
        getSupabase: async () => client,
        provisionConvaiAgent,
        runSync,
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.agentId).toBe("agent_new_01");
    expect(result.summary.provision.method).toBe("duplicate");
    expect(provisionConvaiAgent).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Kitchen",
    });
    expect(runSync).toHaveBeenCalledWith({
      agentId: "agent_new_01",
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Kitchen",
    });

    const last = updates.at(-1);
    expect(last).toMatchObject({
      elevenlabs_agent_id: "agent_new_01",
      elevenlabs_provision_status: "ready",
      elevenlabs_menu_auto_sync_status: "succeeded",
      elevenlabs_last_sync_error: null,
    });
    expect(last?.elevenlabs_last_sync_summary).toMatchObject({
      provision: { method: "duplicate", template_agent_id: "agent_template" },
      phone_personalization_webhook: "https://app.test/webhook",
    });
  });

  it("returns provision phase failure without agent id", async () => {
    const { client, updates } = mockSupabase();
    const result = await provisionRestaurantVoiceAgent(
      RESTAURANT_ID,
      "Fail Clone",
      ORG_ID,
      USER_ID,
      {
        getSupabase: async () => client,
        provisionConvaiAgent: vi.fn().mockRejectedValue(new Error("clone failed")),
        runSync: vi.fn(),
      }
    );

    expect(result).toEqual({
      ok: false,
      error: "clone failed",
      phase: "provision",
      agentId: null,
    });
    expect(updates.some((u) => u.elevenlabs_provision_status === "failed")).toBe(
      true
    );
  });

  it("keeps agent id and marks sync failure when sync throws", async () => {
    const { client, updates } = mockSupabase();
    const result = await provisionRestaurantVoiceAgent(
      RESTAURANT_ID,
      "Sync Fail",
      ORG_ID,
      USER_ID,
      {
        getSupabase: async () => client,
        provisionConvaiAgent: vi.fn().mockResolvedValue({
          agent_id: "agent_partial",
          agent_name: "ROAL",
          template_agent_id: "tpl",
          method: "duplicate",
        }),
        runSync: vi.fn().mockRejectedValue(new Error("sync blew up")),
      }
    );

    expect(result).toMatchObject({
      ok: false,
      phase: "sync",
      agentId: "agent_partial",
    });
    expect(updates.some((u) => u.elevenlabs_agent_id === "agent_partial")).toBe(
      true
    );
    expect(
      updates.some(
        (u) =>
          u.elevenlabs_provision_status === "failed" &&
          u.elevenlabs_menu_auto_sync_status === "failed"
      )
    ).toBe(true);
  });
});
