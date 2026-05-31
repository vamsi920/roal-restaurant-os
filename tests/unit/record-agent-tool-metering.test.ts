import { describe, expect, it, vi } from "vitest";
import { recordAgentToolMetering } from "../../supabase/functions/_shared/record-usage";
import { RESTAURANT_ID } from "../fixtures/menu";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const SESSION_ID = "conv_meter_pass53";

function mockSupabaseForUsage() {
  const inserts: Record<string, unknown>[] = [];
  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "usage_events") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        insert: vi.fn((row: Record<string, unknown>) => {
          inserts.push(row);
          return Promise.resolve({ error: null });
        }),
      };
    }),
    inserts,
  };
  return supabase;
}

describe("recordAgentToolMetering (Edge finalize billing)", () => {
  it("records order_completed only for successful finalize with line items", async () => {
    const supabase = mockSupabaseForUsage();

    await recordAgentToolMetering(supabase as never, {
      organizationId: ORG_ID,
      restaurantId: RESTAURANT_ID,
      sessionId: SESSION_ID,
      tool: "finalize_order",
      httpStatus: 200,
      lineCount: 2,
      recordOrderCompleted: true,
      orderStatus: "new",
    });

    const types = supabase.inserts.map((r) => r.event_type);
    expect(types).toContain("tool_call");
    expect(types).toContain("order_completed");
    expect(types.filter((t) => t === "order_completed")).toHaveLength(1);
  });

  it("does not record order_completed on validation failure", async () => {
    const supabase = mockSupabaseForUsage();

    await recordAgentToolMetering(supabase as never, {
      organizationId: ORG_ID,
      restaurantId: RESTAURANT_ID,
      sessionId: SESSION_ID,
      tool: "finalize_order",
      httpStatus: 422,
      lineCount: 0,
      recordOrderCompleted: true,
    });

    const types = supabase.inserts.map((r) => r.event_type);
    expect(types).toContain("tool_call");
    expect(types).not.toContain("order_completed");
  });

  it("does not record order_completed when line count is zero on success", async () => {
    const supabase = mockSupabaseForUsage();

    await recordAgentToolMetering(supabase as never, {
      organizationId: ORG_ID,
      restaurantId: RESTAURANT_ID,
      sessionId: SESSION_ID,
      tool: "finalize_order",
      httpStatus: 200,
      lineCount: 0,
      recordOrderCompleted: true,
    });

    expect(supabase.inserts.map((r) => r.event_type)).not.toContain(
      "order_completed"
    );
  });

  it("records voice_order on sync only when cart has lines", async () => {
    const supabase = mockSupabaseForUsage();

    await recordAgentToolMetering(supabase as never, {
      organizationId: ORG_ID,
      restaurantId: RESTAURANT_ID,
      sessionId: SESSION_ID,
      tool: "sync_draft_order",
      httpStatus: 200,
      lineCount: 0,
      recordVoiceOrder: true,
      orderStatus: "draft",
    });

    expect(supabase.inserts.map((r) => r.event_type)).not.toContain("voice_order");

    await recordAgentToolMetering(supabase as never, {
      organizationId: ORG_ID,
      restaurantId: RESTAURANT_ID,
      sessionId: SESSION_ID,
      tool: "sync_draft_order",
      httpStatus: 200,
      lineCount: 1,
      recordVoiceOrder: true,
      orderStatus: "draft",
    });

    expect(supabase.inserts.map((r) => r.event_type)).toContain("voice_order");
  });
});
