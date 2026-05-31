import { vi } from "vitest";
import type { RunRestaurantVoiceAgentSyncResult } from "@/lib/voice-agent/run-restaurant-voice-agent-sync";
import type { SyncRestaurantAgentAfterContentChangeResult } from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

export const MOCK_AGENT_ID = "agent_test_01";

export function createMockSyncSupabase(options?: {
  agentId?: string | null;
  restaurantName?: string;
  restaurantId?: string;
}) {
  const agentId = options?.agentId === undefined ? MOCK_AGENT_ID : options.agentId;
  const restaurantId = options?.restaurantId ?? "00000000-0000-4000-8000-000000000099";
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
                data: { name: options?.restaurantName ?? "Test Kitchen" },
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
                data: {
                  elevenlabs_agent_id: agentId,
                  elevenlabs_menu_auto_sync_status: null,
                },
                error: null,
              }),
            })),
          })),
          update: chain.update,
        };
      }
      if (table === "restaurants") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: restaurantId,
                  name: options?.restaurantName ?? "Test Kitchen",
                  organization_id: "00000000-0000-4000-8000-000000000001",
                },
                error: null,
              }),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { client, updates, chain };
}

export function mockRunSyncSuccess(
  overrides?: Partial<RunRestaurantVoiceAgentSyncResult>
): RunRestaurantVoiceAgentSyncResult {
  return {
    sync: { ok: true } as RunRestaurantVoiceAgentSyncResult["sync"],
    profile: { ok: true } as RunRestaurantVoiceAgentSyncResult["profile"],
    summary: {
      tools: [],
      tool_ids_on_agent: ["tool_1"],
      restaurant_placeholders_updated: true,
      first_message_updated: true,
      restaurant_tools_baked: true,
      knowledge_base_doc_attached: true,
      phone_personalization_webhook: null,
      ...(overrides?.summary ?? {}),
    },
    ...overrides,
  };
}

export function mockSyncResult(
  partial: Partial<SyncRestaurantAgentAfterContentChangeResult>
): SyncRestaurantAgentAfterContentChangeResult {
  return {
    ok: false,
    skipped: false,
    skipReason: null,
    agentId: MOCK_AGENT_ID,
    error: null,
    trigger: "menu",
    summary: null,
    ...partial,
  };
}
