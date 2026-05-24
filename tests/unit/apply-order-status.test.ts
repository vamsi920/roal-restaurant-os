import { describe, expect, it } from "vitest";
import {
  applyOrderStatusLocally,
  buildOrderStatusPatch,
} from "@/lib/orders/apply-order-status";
import type { DraftOrderRow } from "@/lib/types";

function order(partial: Partial<DraftOrderRow> & Pick<DraftOrderRow, "status">): DraftOrderRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    restaurant_id: "00000000-0000-4000-8000-000000000002",
    session_id: "sess-1",
    status: partial.status,
    items: [],
    customer_name: null,
    customer_phone: null,
    created_at: "2026-01-01T12:00:00.000Z",
    updated_at: "2026-01-01T12:00:00.000Z",
    accepted_at: null,
    in_progress_at: null,
    ready_at: null,
    completed_at: null,
    canceled_at: null,
    ...partial,
  };
}

describe("apply-order-status", () => {
  it("accepts from legacy confirmed and sets accepted_at once", () => {
    const built = buildOrderStatusPatch(order({ status: "confirmed" }), "accept");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.patch.status).toBe("accepted");
    expect(built.patch.accepted_at).toBeTruthy();
  });

  it("rejects invalid transitions", () => {
    const built = buildOrderStatusPatch(order({ status: "completed" }), "accept");
    expect(built.ok).toBe(false);
  });

  it("sets milestone timestamps through the lifecycle", () => {
    let row = order({ status: "new" });
    row = applyOrderStatusLocally(row, "accept")!;
    expect(row.status).toBe("accepted");
    expect(row.accepted_at).toBeTruthy();

    row = applyOrderStatusLocally(row, "start")!;
    expect(row.status).toBe("in_progress");
    expect(row.in_progress_at).toBeTruthy();

    row = applyOrderStatusLocally(row, "mark_ready")!;
    expect(row.status).toBe("ready");

    row = applyOrderStatusLocally(row, "complete")!;
    expect(row.status).toBe("completed");
    expect(row.completed_at).toBeTruthy();
  });

  it("does not overwrite existing milestone timestamps", () => {
    const acceptedAt = "2026-01-01T12:05:00.000Z";
    const built = buildOrderStatusPatch(
      order({ status: "accepted", accepted_at: acceptedAt }),
      "start"
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.patch.accepted_at).toBeUndefined();
    expect(built.patch.in_progress_at).toBeTruthy();
  });
});
