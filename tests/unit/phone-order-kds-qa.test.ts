import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeFetchedDraftOrders } from "@/lib/orders/merge-fetched-orders";
import {
  getOrderActionsForStatus,
  isQueuedKitchenStatus,
  isTerminalOrderStatus,
  isVoiceCartStatus,
  normalizeOrderStatus,
} from "@/lib/order-status";

const REPO = join(import.meta.dirname, "../..");

describe("phone order → KDS tab bucketing", () => {
  it("routes draft to live carts and new to kitchen queue", () => {
    expect(isVoiceCartStatus("draft")).toBe(true);
    expect(isQueuedKitchenStatus("draft")).toBe(false);
    expect(isVoiceCartStatus("new")).toBe(false);
    expect(isQueuedKitchenStatus("new")).toBe(true);
  });

  it("exposes kitchen actions only for active queue statuses", () => {
    expect(getOrderActionsForStatus("new")).toEqual(["accept", "cancel"]);
    expect(getOrderActionsForStatus("accepted")).toEqual(["start", "cancel"]);
    expect(getOrderActionsForStatus("in_progress")).toEqual([
      "mark_ready",
      "cancel",
    ]);
    expect(getOrderActionsForStatus("ready")).toEqual(["complete", "cancel"]);
    expect(getOrderActionsForStatus("draft")).toEqual([]);
    expect(getOrderActionsForStatus("completed")).toEqual([]);
  });

  it("normalizes legacy confirmed to new", () => {
    expect(normalizeOrderStatus("confirmed")).toBe("new");
  });

  it("terminal orders leave kitchen queue", () => {
    expect(isTerminalOrderStatus("completed")).toBe(true);
    expect(isQueuedKitchenStatus("completed")).toBe(false);
  });
});

describe("KDS poll merge (launch 14)", () => {
  it("preserves optimistic accept during stale poll", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const prev = [
      {
        id,
        restaurant_id: "r1",
        session_id: "s1",
        status: "accepted",
        items: [],
        customer_name: "Guest",
        customer_phone: "555",
        created_at: "2026-01-01T12:00:00.000Z",
        updated_at: "2026-01-01T12:05:00.000Z",
        accepted_at: "2026-01-01T12:05:00.000Z",
        in_progress_at: null,
        ready_at: null,
        completed_at: null,
        canceled_at: null,
      },
    ];
    const fetched = [{ ...prev[0], status: "new", updated_at: "2026-01-01T12:00:00.000Z" }];
    const merged = mergeFetchedDraftOrders(prev, fetched, new Set([id]));
    expect(merged[0].status).toBe("accepted");
  });
});

describe("KDS orders panel UX (launch 14)", () => {
  it("refetches on tab visibility and degraded poll", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("visibilitychange");
    expect(panel).toContain("mergeFetchedDraftOrders");
    expect(panel).toContain("startPoll(6000)");
    expect(panel).toContain('role="alert"');
  });

  it("ships phone-order KDS flow QA script", () => {
    const script = readFileSync(
      join(REPO, "scripts/qa-phone-order-kds-flow.mjs"),
      "utf8"
    );
    expect(script).toContain("sync-draft-order");
    expect(script).toContain("finalize-order");
    expect(script).toContain("kdsTabForStatus");
  });
});
