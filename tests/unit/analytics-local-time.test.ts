import { describe, expect, it } from "vitest";
import {
  buildDaySeries,
  dayKeyInZone,
  hourLabel,
  localTimeParts,
} from "@/lib/analytics/range";
import {
  bucketOrderSessionsByDay,
  peakCallHoursFromEvents,
  peakCallWindowsFromEvents,
  peakOrderHoursFromReceipts,
} from "@/lib/analytics/phone-ops-metrics";
import type { AgentCallEventAnalyticsRow } from "@/lib/analytics/aggregate";

const call = (startedAt: string): AgentCallEventAnalyticsRow => ({
  restaurant_id: "r1",
  status: "ended",
  outcome: "no_order",
  started_at: startedAt,
  ended_at: null,
});

describe("analytics local time", () => {
  it("labels hours like an owner reads a clock", () => {
    expect(hourLabel(0)).toBe("12 AM");
    expect(hourLabel(12)).toBe("12 PM");
    expect(hourLabel(19)).toBe("7 PM");
  });

  it("converts an instant to the restaurant's day, weekday and hour", () => {
    // Thu Oct 29 2026 00:30 UTC is Wed Oct 28, 8 PM in New York (EDT).
    expect(localTimeParts("2026-10-29T00:30:00.000Z", "America/New_York")).toEqual({
      dayKey: "2026-10-28",
      dayOfWeek: 3,
      hour: 20,
    });
    // Same instant in Los Angeles is 5 PM.
    expect(localTimeParts("2026-10-29T00:30:00.000Z", "America/Los_Angeles")?.hour).toBe(17);
  });

  it("follows daylight saving time", () => {
    // January: EST (UTC-5). 23:00 UTC = 6 PM.
    expect(localTimeParts("2026-01-15T23:00:00.000Z", "America/New_York")?.hour).toBe(18);
    // July: EDT (UTC-4). 23:00 UTC = 7 PM.
    expect(localTimeParts("2026-07-15T23:00:00.000Z", "America/New_York")?.hour).toBe(19);
  });

  it("falls back to Eastern for a missing or bad zone", () => {
    expect(localTimeParts("2026-07-15T23:00:00.000Z", "Not/AZone")?.hour).toBe(19);
    expect(localTimeParts("2026-07-15T23:00:00.000Z", null)?.hour).toBe(19);
  });

  it("buckets days by the local calendar", () => {
    expect(dayKeyInZone("2026-10-29T02:00:00.000Z", "America/New_York")).toBe("2026-10-28");
    expect(dayKeyInZone("2026-10-29T02:00:00.000Z")).toBe("2026-10-29");
    expect(
      buildDaySeries(
        new Date("2026-10-27T02:00:00.000Z"),
        new Date("2026-10-29T02:00:00.000Z"),
        "America/New_York"
      )
    ).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
  });

  it("reports busiest hours and windows in local time", () => {
    // 23:xx UTC on Wed Oct 28 = 7 PM Wed in New York.
    const events = [
      call("2026-10-28T23:05:00.000Z"),
      call("2026-10-28T23:40:00.000Z"),
      call("2026-10-28T16:00:00.000Z"),
    ];
    expect(peakCallHoursFromEvents(events, 3, "America/New_York")[0]).toEqual({
      hour: 19,
      label: "7 PM",
      orderCount: 2,
    });
    expect(peakCallWindowsFromEvents(events, new Set(), 6, "America/New_York")[0]).toMatchObject({
      dayLabel: "Wed",
      hourLabel: "7 PM",
      callCount: 2,
    });
    expect(
      peakOrderHoursFromReceipts(
        [{ restaurant_id: "r1", session_id: "s1", items: [], created_at: "2026-10-28T23:05:00.000Z" }],
        3,
        "America/Chicago"
      )[0]?.label
    ).toBe("6 PM");
    // Default stays UTC for other callers (kitchen screen).
    expect(peakCallHoursFromEvents(events)[0]?.label).toBe("11 PM");
  });

  it("counts calls and orders per local day", () => {
    const series = bucketOrderSessionsByDay(
      [],
      [{ restaurant_id: "r1", session_id: "s1", items: [], created_at: "2026-10-29T01:00:00.000Z" }],
      [],
      ["2026-10-28", "2026-10-29"],
      new Set(["r1"]),
      { timeZone: "America/New_York", callEvents: [call("2026-10-29T00:55:00.000Z")] }
    );
    expect(series[0]).toMatchObject({ date: "2026-10-28", calls: 1, completed: 1 });
    expect(series[1]).toMatchObject({ date: "2026-10-29", calls: 0, completed: 0 });
  });
});
