import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLL_TIMING,
  connectionStateAfter,
  nextPollDelay,
} from "@/lib/live/poll-schedule";
import { liveEndpoints } from "@/lib/live/endpoints";

describe("live poll schedule", () => {
  it("polls every 3s while visible and backs off to 15s when hidden", () => {
    expect(nextPollDelay({ visible: true, consecutiveFailures: 0 })).toBe(3_000);
    expect(nextPollDelay({ visible: false, consecutiveFailures: 0 })).toBe(15_000);
  });

  it("backs off exponentially on failures, capped at 30s", () => {
    expect(nextPollDelay({ visible: true, consecutiveFailures: 1 })).toBe(6_000);
    expect(nextPollDelay({ visible: true, consecutiveFailures: 2 })).toBe(12_000);
    expect(nextPollDelay({ visible: true, consecutiveFailures: 3 })).toBe(24_000);
    expect(nextPollDelay({ visible: true, consecutiveFailures: 9 })).toBe(DEFAULT_POLL_TIMING.maxBackoffMs);
    // Hidden + failing never polls faster than the hidden cadence.
    expect(nextPollDelay({ visible: false, consecutiveFailures: 1 })).toBe(15_000);
  });

  it("respects custom timing", () => {
    const timing = { ...DEFAULT_POLL_TIMING, intervalMs: 10_000, hiddenIntervalMs: 30_000 };
    expect(nextPollDelay({ visible: true, consecutiveFailures: 0 }, timing)).toBe(10_000);
    expect(nextPollDelay({ visible: false, consecutiveFailures: 0 }, timing)).toBe(30_000);
  });

  it("flips Live -> Reconnecting only after repeated failures", () => {
    expect(connectionStateAfter("connecting", "ok", 0)).toBe("live");
    expect(connectionStateAfter("live", "error", 1)).toBe("live");
    expect(connectionStateAfter("live", "error", 2)).toBe("degraded");
    expect(connectionStateAfter("degraded", "ok", 0)).toBe("live");
    expect(connectionStateAfter("connecting", "error", 1)).toBe("connecting");
  });

  it("builds restaurant-scoped endpoint URLs", () => {
    expect(liveEndpoints.orders("r 1")).toBe("/api/restaurants/r%201/live/orders");
    expect(liveEndpoints.menu("abc")).toBe("/api/restaurants/abc/live/menu");
    expect(liveEndpoints.callStatus("abc")).toBe("/api/restaurants/abc/live/call-status");
    expect(liveEndpoints.locations()).toBe("/api/restaurants/locations");
  });
});
