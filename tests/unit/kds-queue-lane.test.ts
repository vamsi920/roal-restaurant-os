import { describe, expect, it } from "vitest";
import {
  classifyKdsQueueLane,
  isKdsStuckOrder,
  kdsLaneLabel,
} from "@/lib/orders/kds-queue-lane";
import type { DraftOrderRow } from "@/lib/types";

const NOW = new Date("2026-05-30T18:00:00.000Z");

function row(
  partial: Partial<DraftOrderRow> & Pick<DraftOrderRow, "status">
): DraftOrderRow {
  return {
    id: "o1",
    restaurant_id: "r1",
    session_id: "s1",
    items: partial.items ?? [],
    customer_name: null,
    customer_phone: null,
    created_at: "2026-05-30T17:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-05-30T17:50:00.000Z",
    accepted_at: null,
    in_progress_at: null,
    ready_at: null,
    completed_at: null,
    canceled_at: null,
    status: partial.status,
  };
}

describe("kds queue lane", () => {
  it("empty draft is live call lane", () => {
    expect(classifyKdsQueueLane(row({ status: "draft", items: [] }))).toBe(
      "live_call"
    );
    expect(kdsLaneLabel(row({ status: "draft", items: [] }))).toBe(
      "On the phone"
    );
  });

  it("draft with items is building", () => {
    expect(
      classifyKdsQueueLane(
        row({
          status: "draft",
          items: [{ name: "Burger", quantity: 1, customizations: [] }],
        })
      )
    ).toBe("building");
  });

  it("new status is confirmed ticket", () => {
    expect(classifyKdsQueueLane(row({ status: "new" }))).toBe("new_ticket");
  });

  it("flags stuck kitchen tickets", () => {
    expect(
      isKdsStuckOrder(
        row({
          status: "accepted",
          updated_at: "2026-05-30T17:30:00.000Z",
        }),
        { now: NOW, thresholdMinutes: 20 }
      )
    ).toBe(true);
  });

  it("ignores terminal orders", () => {
    expect(
      isKdsStuckOrder(
        row({
          status: "completed",
          updated_at: "2026-05-30T16:00:00.000Z",
        }),
        { now: NOW }
      )
    ).toBe(false);
  });
});
