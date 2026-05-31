import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  lookupRestaurantByCalledNumber,
  resolveRestaurantForElevenLabsConversationInit,
} from "@/lib/elevenlabs/conversation-init";
import { persistElevenLabsPostCallEvent } from "@/lib/elevenlabs/post-call-webhook";

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleSupabase: vi.fn(),
}));

vi.mock("@/lib/env.server", () => ({
  getElevenLabsAgentId: vi.fn(() => "agent_template_global"),
}));

import { getServiceRoleSupabase } from "@/lib/supabase/server";

const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const DEDICATED_AGENT = "agent_dedicated_inbound";
const TEMPLATE_AGENT = "agent_template_global";
const CALLED = "+15559876543";

function mockSupabaseProfiles(
  profiles: {
    restaurant_id: string;
    phone: string | null;
    elevenlabs_agent_id: string | null;
  }[]
) {
  const restaurants = new Map<string, { name: string }>([
    [RESTAURANT_ID, { name: "Test Bistro" }],
  ]);

  vi.mocked(getServiceRoleSupabase).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "restaurant_profiles") {
        return {
          select: vi.fn((cols: string) => {
            const fields = cols.split(",").map((c) => c.trim());
            if (fields.includes("phone")) {
              return {
                not: vi.fn().mockResolvedValue({ data: profiles, error: null }),
              };
            }
            return {
              eq: vi.fn((_field: string, value: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    profiles.find((p) => p.elevenlabs_agent_id === value) ??
                    null,
                  error: null,
                }),
              })),
            };
          }),
        };
      }
      if (table === "restaurants") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockImplementation(async () => ({
                data: restaurants.get(RESTAURANT_ID) ?? null,
                error: null,
              })),
            })),
          })),
        };
      }
      throw new Error(table);
    }),
  } as never);
}

function mockMultiLocationProfiles(
  profiles: {
    restaurant_id: string;
    phone: string | null;
    elevenlabs_agent_id: string | null;
  }[]
) {
  vi.mocked(getServiceRoleSupabase).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "restaurant_profiles") {
        return {
          select: vi.fn(() => ({
            not: vi.fn().mockResolvedValue({ data: profiles, error: null }),
          })),
        };
      }
      if (table === "restaurants") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_field: string, id: string) => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { name: `Restaurant ${id.slice(0, 4)}` },
                error: null,
              }),
            })),
          })),
        };
      }
      throw new Error(table);
    }),
  } as never);
}

describe("inbound call routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves exactly one restaurant by dedicated elevenlabs_agent_id", async () => {
    mockSupabaseProfiles([
      {
        restaurant_id: RESTAURANT_ID,
        elevenlabs_agent_id: DEDICATED_AGENT,
        phone: CALLED,
      },
    ]);

    const resolved = await resolveRestaurantForElevenLabsConversationInit({
      agentId: DEDICATED_AGENT,
      calledNumber: "",
    });

    expect(resolved).toMatchObject({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: DEDICATED_AGENT,
      resolvedVia: "agent_id",
    });
  });

  it("rejects shared template agent id without called-number fallback", async () => {
    mockSupabaseProfiles([
      {
        restaurant_id: RESTAURANT_ID,
        elevenlabs_agent_id: DEDICATED_AGENT,
        phone: CALLED,
      },
    ]);

    const resolved = await resolveRestaurantForElevenLabsConversationInit({
      agentId: TEMPLATE_AGENT,
      calledNumber: "",
    });

    expect(resolved).toBeNull();
  });

  it("resolves by called number when uniquely mapped", async () => {
    mockSupabaseProfiles([
      {
        restaurant_id: RESTAURANT_ID,
        elevenlabs_agent_id: DEDICATED_AGENT,
        phone: CALLED,
      },
    ]);

    const resolved = await resolveRestaurantForElevenLabsConversationInit({
      agentId: "",
      calledNumber: CALLED,
    });

    expect(resolved).toMatchObject({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: DEDICATED_AGENT,
      resolvedVia: "called_number",
    });
  });

  it("fails safely when called number matches multiple restaurants", async () => {
    mockMultiLocationProfiles([
      {
        restaurant_id: RESTAURANT_ID,
        elevenlabs_agent_id: DEDICATED_AGENT,
        phone: CALLED,
      },
      {
        restaurant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        elevenlabs_agent_id: "agent_other",
        phone: CALLED,
      },
    ]);

    expect(await lookupRestaurantByCalledNumber(CALLED)).toBeNull();
    expect(
      await resolveRestaurantForElevenLabsConversationInit({
        agentId: "",
        calledNumber: CALLED,
      })
    ).toBeNull();
  });

  it("post-call webhook does not write tenant data when routing fails", async () => {
    const upsert = vi.fn();
    vi.mocked(getServiceRoleSupabase).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "restaurant_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        if (table === "agent_call_events") {
          return { upsert };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as never);

    const result = await persistElevenLabsPostCallEvent({
      type: "post_call_transcription",
      event_timestamp: 1_700_000_000,
      data: {
        agent_id: "agent_unknown",
        conversation_id: "conv_unrouted",
      },
    });

    expect(result.stored).toBe(false);
    expect(result.reason).toBe("unresolved_event");
    expect(upsert).not.toHaveBeenCalled();
  });
});
