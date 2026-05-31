import { describe, expect, it, vi, beforeEach } from "vitest";
import { getElevenLabsAgentId } from "@/lib/env.server";
import {
  syncRestaurantAgentAfterContentChange,
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS,
} from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

vi.mock("@/lib/env.server", () => ({
  getElevenLabsAgentId: vi.fn(() => null),
}));

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000099";
const AGENT_ID = "agent_linked_01";
const TEMPLATE_AGENT_ID = "agent_template_global_roal";

function mockSupabase(agentId: string | null) {
  const updates: Record<string, unknown>[] = [];
  const chain = {
    update: vi.fn((patch: Record<string, unknown>) => {
      updates.push(patch);
      return chain;
    }),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === "restaurants") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { name: "Test Kitchen" },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "restaurant_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { elevenlabs_agent_id: agentId },
                error: null,
              }),
            })),
          })),
          update: chain.update,
        };
      }
      throw new Error(table);
    }),
  };

  return { client, updates };
}

describe("syncRestaurantAgentAfterContentChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips menu auto-sync when profile links the shared template agent", async () => {
    vi.mocked(getElevenLabsAgentId).mockReturnValue(TEMPLATE_AGENT_ID);
    const { client } = mockSupabase(TEMPLATE_AGENT_ID);
    const runSync = vi.fn();

    const result = await syncRestaurantAgentAfterContentChange(
      {
        restaurantId: RESTAURANT_ID,
        trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu,
      },
      { getSupabase: async () => client as never, runSync }
    );

    expect(result).toMatchObject({
      ok: true,
      skipped: true,
      skipReason: "shared_template_agent",
      agentId: TEMPLATE_AGENT_ID,
    });
    expect(runSync).not.toHaveBeenCalled();
  });

  it("skips when no linked agent", async () => {
    const { client } = mockSupabase(null);
    const runSync = vi.fn();

    const result = await syncRestaurantAgentAfterContentChange(
      {
        restaurantId: RESTAURANT_ID,
        trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu,
      },
      { getSupabase: async () => client as never, runSync }
    );

    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("no_linked_agent");
    expect(runSync).not.toHaveBeenCalled();
  });

  it("marks succeeded and stores summary on full sync", async () => {
    const { client, updates } = mockSupabase(AGENT_ID);
    const runSync = vi.fn().mockResolvedValue({
      sync: { ok: true },
      profile: { ok: true },
      summary: {
        tools: [],
        tool_ids_on_agent: ["t1"],
        restaurant_placeholders_updated: true,
        first_message_updated: true,
        restaurant_tools_baked: true,
        knowledge_base_doc_attached: true,
        phone_personalization_webhook: null,
      },
    });

    const result = await syncRestaurantAgentAfterContentChange(
      {
        restaurantId: RESTAURANT_ID,
        trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.hours,
        restaurantName: "Hours Test",
      },
      { getSupabase: async () => client as never, runSync }
    );

    expect(result.ok).toBe(true);
    expect(result.agentId).toBe(AGENT_ID);
    expect(runSync).toHaveBeenCalledWith({
      agentId: AGENT_ID,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Hours Test",
    });

    expect(updates.some((u) => u.elevenlabs_menu_auto_sync_status === "syncing")).toBe(
      true
    );
    const success = updates.find(
      (u) => u.elevenlabs_menu_auto_sync_status === "succeeded"
    );
    expect(success).toBeDefined();
    expect(success?.elevenlabs_last_sync_summary).toMatchObject({
      content_change_trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.hours,
    });
  });

  it("captures sync errors without throwing", async () => {
    const { client, updates } = mockSupabase(AGENT_ID);
    const runSync = vi.fn().mockRejectedValue(new Error("ElevenLabs down"));

    const result = await syncRestaurantAgentAfterContentChange(
      {
        restaurantId: RESTAURANT_ID,
        trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.profile,
      },
      { getSupabase: async () => client as never, runSync }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/down/i);
    expect(updates.some((u) => u.elevenlabs_menu_auto_sync_status === "failed")).toBe(
      true
    );
  });
});
