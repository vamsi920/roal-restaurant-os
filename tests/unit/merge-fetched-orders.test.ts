import { describe, expect, it } from "vitest";
import { mergeFetchedDraftOrders } from "@/lib/orders/merge-fetched-orders";
import type { DraftOrderRow } from "@/lib/types";

const id = "00000000-0000-4000-8000-000000000001";

function row(status: string, updated_at: string): DraftOrderRow {
  return {
    id,
    restaurant_id: "r1",
    session_id: "s1",
    status,
    items: [],
    customer_name: null,
    customer_phone: null,
    created_at: updated_at,
    updated_at,
    accepted_at: null,
    in_progress_at: null,
    ready_at: null,
    completed_at: null,
    canceled_at: null,
  };
}

describe("mergeFetchedDraftOrders", () => {
  it("returns fetched rows when nothing is pending", () => {
    const fetched = [row("accepted", "2026-01-01T12:01:00.000Z")];
    expect(mergeFetchedDraftOrders([], fetched, new Set())).toEqual(fetched);
  });

  it("keeps newer local optimistic row during pending", () => {
    const prev = [row("accepted", "2026-01-01T12:05:00.000Z")];
    const fetched = [row("new", "2026-01-01T12:00:00.000Z")];
    const merged = mergeFetchedDraftOrders(prev, fetched, new Set([id]));
    expect(merged[0].status).toBe("accepted");
  });
});
