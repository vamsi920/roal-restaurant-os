import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/env.server", () => ({
  getElevenLabsAgentId: vi.fn(),
}));

vi.mock("@/lib/env.public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  }),
}));

vi.mock("@/lib/voice-agent/run-restaurant-voice-agent-sync", () => ({
  runRestaurantVoiceAgentSync: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/voice-agent/load-control-center", () => ({
  loadVoiceAgentControlCenter: vi.fn().mockResolvedValue({ connectionStatus: "connected" }),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getElevenLabsAgentId } from "@/lib/env.server";
import { createServerSupabase } from "@/lib/supabase/server";
import { connectVoiceAgentAction } from "@/app/dashboard/restaurants/[id]/voice-agent-actions";

const TEMPLATE = "agent_template_shared";
const DEDICATED = "agent_location_dedicated";
const RESTAURANT_ID = "00000000-0000-4000-8000-000000000099";

describe("connectVoiceAgentAction dedicated agent guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getElevenLabsAgentId).mockReturnValue(TEMPLATE);
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      errorResponse: null,
      access: {
        restaurant: {
          id: RESTAURANT_ID,
          name: "Test",
          organization_id: "00000000-0000-4000-8000-000000000001",
        },
        role: "owner",
      },
      context: { user: { id: "user" } },
    } as never);
  });

  it("rejects connecting the shared template agent id", async () => {
    await expect(
      connectVoiceAgentAction({
        agentId: TEMPLATE,
        restaurantId: RESTAURANT_ID,
        restaurantName: "Test",
      })
    ).rejects.toThrow(/dedicated ElevenLabs agent/i);
  });

  it("allows a non-template agent id", async () => {
    const chain = {
      update: vi.fn(function (this: unknown) {
        return chain;
      }),
      eq: vi.fn(function (this: unknown) {
        return chain;
      }),
      select: vi.fn(function (this: unknown) {
        return chain;
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { elevenlabs_last_sync_error: null },
        error: null,
      }),
    };
    vi.mocked(createServerSupabase).mockResolvedValue({
      from: vi.fn(() => chain),
    } as never);

    const { runRestaurantVoiceAgentSync } = await import(
      "@/lib/voice-agent/run-restaurant-voice-agent-sync"
    );
    vi.mocked(runRestaurantVoiceAgentSync).mockResolvedValue({
      sync: { ok: true, agent_id: DEDICATED, tools: [] } as never,
      profile: { ok: true } as never,
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

    await expect(
      connectVoiceAgentAction({
        agentId: DEDICATED,
        restaurantId: RESTAURANT_ID,
        restaurantName: "Test",
      })
    ).resolves.toMatchObject({ ok: true });
  });
});
