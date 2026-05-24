import { describe, expect, it } from "vitest";
import {
  canApplyOrderAction,
  getOrderActionsForStatus,
  isVoiceCartStatus,
  normalizeOrderStatus,
} from "@/lib/order-status";

describe("order-status", () => {
  it("normalizes legacy confirmed to new", () => {
    expect(normalizeOrderStatus("confirmed")).toBe("new");
  });

  it("keeps voice cart as draft", () => {
    expect(isVoiceCartStatus("draft")).toBe(true);
    expect(normalizeOrderStatus("draft")).toBe("draft");
  });

  it("exposes kitchen actions for new orders", () => {
    expect(getOrderActionsForStatus("new")).toEqual(["accept", "cancel"]);
    expect(canApplyOrderAction("new", "accept")).toBe(true);
    expect(canApplyOrderAction("new", "complete")).toBe(false);
  });

  it("allows complete from ready", () => {
    expect(canApplyOrderAction("ready", "complete")).toBe(true);
  });
});
