import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOrderCompletedCallEventRow,
  markAgentCallOrderCompleted,
} from "@/lib/agent-calls/mark-call-order-completed";
import { persistElevenLabsConversationStarted } from "@/lib/elevenlabs/conversation-init";

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleSupabase: vi.fn(),
}));

import { getServiceRoleSupabase } from "@/lib/supabase/server";

const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const AGENT_ID = "agent_dedicated_01";
const SESSION_ID = "CA_active_call_lifecycle";

describe("active call lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates active in-progress call row on conversation start", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getServiceRoleSupabase).mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    } as never);

    const result = await persistElevenLabsConversationStarted({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: AGENT_ID,
      sessionId: SESSION_ID,
      callerPhone: "+15551234567",
      calledNumber: "+15559876543",
      resolvedVia: "agent_id",
    });

    expect(result).toEqual({ stored: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        outcome: "in_progress",
        ended_at: null,
      }),
      { onConflict: "restaurant_id,session_id" }
    );
  });

  it("marks harness sessions as test data on conversation start", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getServiceRoleSupabase).mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    } as never);

    await persistElevenLabsConversationStarted({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: AGENT_ID,
      sessionId: "roal-harness-abc123",
      resolvedVia: "agent_id",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript_metadata: expect.objectContaining({
          is_test_harness: true,
        }),
      }),
      expect.any(Object)
    );
  });

  it("clears active state and records order_completed on finalize", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        agent_id: AGENT_ID,
        caller_phone: "+15551234567",
        started_at: "2026-05-30T12:00:00.000Z",
        transcript_metadata: { event_type: "conversation_init" },
      },
      error: null,
    });
    vi.mocked(getServiceRoleSupabase).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle })),
          })),
        })),
        upsert,
      })),
    } as never);

    const result = await markAgentCallOrderCompleted(
      getServiceRoleSupabase()!,
      {
        restaurantId: RESTAURANT_ID,
        sessionId: SESSION_ID,
        completedAt: "2026-05-30T12:05:00.000Z",
      }
    );

    expect(result).toEqual({ stored: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_ID,
        status: "ended",
        outcome: "order_completed",
        ended_at: "2026-05-30T12:05:00.000Z",
        transcript_metadata: expect.objectContaining({
          order_finalized_at: "2026-05-30T12:05:00.000Z",
        }),
      }),
      { onConflict: "restaurant_id,session_id" }
    );
  });

  it("buildOrderCompletedCallEventRow preserves harness flag", () => {
    const row = buildOrderCompletedCallEventRow({
      restaurantId: RESTAURANT_ID,
      sessionId: "roal-harness-finalize",
      now: "2026-05-30T12:05:00.000Z",
    });

    expect(row).toMatchObject({
      status: "ended",
      outcome: "order_completed",
      transcript_metadata: expect.objectContaining({
        is_test_harness: true,
      }),
    });
  });
});
