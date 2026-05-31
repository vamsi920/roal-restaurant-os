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
      "Call received",
      "Kitchen accepted",
      "Preparing order",
      "Ready for pickup",
      "Order completed",
    ]);
    expect(history.map((h) => h.tone)).toEqual([
      "call",
      "kitchen",
      "kitchen",
      "kitchen",
      "done",
    ]);
    expect(history[0]?.description).toMatch(/live phone cart/i);
  });

  it("shows an active call cart before kitchen finalization", () => {
    const history = buildOrderStatusHistory({
      id: "1",
      restaurant_id: "r",
      session_id: "s",
      status: "draft",
      items: [{ name: "Pizza", quantity: 2 }],
      customer_name: null,
      customer_phone: null,
      fulfillment_type: "pickup",
      delivery_address: null,
      delivery_instructions: null,
      created_at: "2026-01-01T12:00:00.000Z",
      updated_at: "2026-01-01T12:03:00.000Z",
      accepted_at: null,
      in_progress_at: null,
      ready_at: null,
      completed_at: null,
      canceled_at: null,
    } as DraftOrderRow);

    expect(history.map((h) => h.label)).toEqual([
      "Call received",
      "Guest is building an order",
    ]);
    expect(history[1]?.description).toContain("2 items captured");
  });

  it("uses delivery-aware ready and complete labels", () => {
    const history = buildOrderStatusHistory({
      id: "1",
      restaurant_id: "r",
      session_id: "s",
      status: "ready",
      items: [],
      customer_name: null,
      customer_phone: null,
      fulfillment_type: "delivery",
      delivery_address: "1 Main St",
      delivery_instructions: null,
      created_at: "2026-01-01T12:00:00.000Z",
      updated_at: "2026-01-01T12:05:00.000Z",
      accepted_at: "2026-01-01T12:02:00.000Z",
      in_progress_at: "2026-01-01T12:03:00.000Z",
      ready_at: "2026-01-01T12:04:00.000Z",
      completed_at: null,
      canceled_at: null,
    } as DraftOrderRow);

    expect(history.map((h) => h.label)).toContain("Ready for delivery");
  });
});
