import { describe, expect, it } from "vitest";
import { buildOrderStatusHistory } from "@/lib/orders/status-history";
import type { DraftOrderRow } from "@/lib/types";

describe("buildOrderStatusHistory", () => {
  it("orders milestones chronologically", () => {
    const history = buildOrderStatusHistory({
      id: "1",
      restaurant_id: "r",
      session_id: "s",
      status: "completed",
      items: [],
      customer_name: null,
      customer_phone: null,
      created_at: "2026-01-01T12:00:00.000Z",
      updated_at: "2026-01-01T12:30:00.000Z",
      accepted_at: "2026-01-01T12:05:00.000Z",
      in_progress_at: "2026-01-01T12:10:00.000Z",
      ready_at: "2026-01-01T12:20:00.000Z",
      completed_at: "2026-01-01T12:25:00.000Z",
      canceled_at: null,
    } as DraftOrderRow);

    expect(history.map((h) => h.label)).toEqual([
      "Order placed",
      "Accepted",
      "In progress",
      "Ready",
      "Completed",
    ]);
  });
});
