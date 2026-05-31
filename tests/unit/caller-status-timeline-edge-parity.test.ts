import { describe, expect, it } from "vitest";
import { buildCallerOrderStatusTimeline as buildNext } from "@/lib/orders/status-history";
import { buildCallerOrderStatusTimeline as buildEdge } from "../../supabase/functions/_shared/caller-status-timeline";
import type { DraftOrderRow } from "@/lib/types";

const readyOrder = {
  status: "ready",
  items: [{ name: "Margherita", quantity: 1 }],
  fulfillment_type: "pickup",
  created_at: "2026-05-30T17:00:00.000Z",
  updated_at: "2026-05-30T18:00:00.000Z",
  accepted_at: "2026-05-30T17:30:00.000Z",
  in_progress_at: "2026-05-30T17:45:00.000Z",
  ready_at: "2026-05-30T18:00:00.000Z",
  completed_at: null,
  canceled_at: null,
} as DraftOrderRow;

describe("caller status timeline Next vs Edge parity", () => {
  it("builds the same milestone labels", () => {
    const next = buildNext(readyOrder);
    const edge = buildEdge(readyOrder);
    expect(edge.map((e) => e.label)).toEqual(next.map((e) => e.label));
  });
});
