import { describe, expect, it, vi } from "vitest";
import { recordUsageEvent } from "@/lib/usage/record";
import { RESTAURANT_ID } from "../fixtures/menu";

describe("recordUsageEvent", () => {
  it("inserts scoped payload with sanitized metadata", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ insert }),
    } as never;

    await recordUsageEvent(supabase, {
      eventType: "tool_call",
      organizationId: "00000000-0000-4000-8000-000000000001",
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_123",
      userId: "user_1",
      metadata: {
        tool: "finalize_order",
        http_status: 422,
        outcome: "error",
        authorization: "Bearer secret",
      },
    });

    expect(insert).toHaveBeenCalledOnce();
    const row = insert.mock.calls[0][0];
    expect(row.event_type).toBe("tool_call");
    expect(row.organization_id).toBe("00000000-0000-4000-8000-000000000001");
    expect(row.restaurant_id).toBe(RESTAURANT_ID);
    expect(row.session_id).toBe("conv_123");
    expect(row.user_id).toBe("user_1");
    expect(row.metadata.authorization).toBe("[redacted]");
    expect(row.metadata.tool).toBe("finalize_order");
  });

  it("skips insert when organization id missing", async () => {
    const insert = vi.fn();
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as never;
    await recordUsageEvent(supabase, {
      eventType: "menu_scan",
      organizationId: "",
      restaurantId: RESTAURANT_ID,
    });
    expect(insert).not.toHaveBeenCalled();
  });
});
