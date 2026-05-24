import { describe, expect, it } from "vitest";
import {
  evaluateRestaurantHours,
  formatExceptionsForPrompt,
} from "@/lib/restaurant-hours/core";
import { RestaurantHoursInputSchema } from "@/lib/restaurant-hours/schema";

const profile = {
  timezone: "America/Chicago",
  temporarily_closed: false,
  temporarily_closed_reason: null,
};

const weekly = [
  { day_of_week: 0, is_closed: true, open_time: null, close_time: null },
  { day_of_week: 1, is_closed: false, open_time: "11:00", close_time: "21:00" },
  { day_of_week: 2, is_closed: false, open_time: "11:00", close_time: "21:00" },
  { day_of_week: 3, is_closed: false, open_time: "11:00", close_time: "21:00" },
  { day_of_week: 4, is_closed: false, open_time: "11:00", close_time: "21:00" },
  { day_of_week: 5, is_closed: false, open_time: "11:00", close_time: "21:00" },
  { day_of_week: 6, is_closed: false, open_time: "11:00", close_time: "21:00" },
];

describe("evaluateRestaurantHours", () => {
  it("blocks orders when temporarily closed", () => {
    const result = evaluateRestaurantHours({
      profile: {
        ...profile,
        temporarily_closed: true,
        temporarily_closed_reason: "Kitchen repair",
      },
      weekly,
      exceptions: [],
    });
    expect(result.ordering_allowed).toBe(false);
    expect(result.status).toBe("temporarily_closed");
    expect(result.message).toContain("Kitchen repair");
  });

  it("uses holiday exception over weekly hours", () => {
    const at = new Date("2026-12-25T18:00:00Z");
    const result = evaluateRestaurantHours({
      profile,
      weekly,
      exceptions: [
        {
          exception_date: "2026-12-25",
          label: "Christmas",
          is_closed: true,
          open_time: null,
          close_time: null,
        },
      ],
      at,
    });
    expect(result.ordering_allowed).toBe(false);
    expect(result.message).toContain("Christmas");
  });
});

describe("RestaurantHoursInputSchema", () => {
  const baseWeekly = Array.from({ length: 7 }, (_, d) => ({
    day_of_week: d,
    is_closed: d === 0,
    open_time: d === 0 ? null : "11:00",
    close_time: d === 0 ? null : "21:00",
  }));

  it("rejects equal open and close times", () => {
    const result = RestaurantHoursInputSchema.safeParse({
      temporarily_closed: false,
      temporarily_closed_reason: null,
      weekly: baseWeekly.map((w) =>
        w.day_of_week === 1
          ? { ...w, open_time: "12:00", close_time: "12:00" }
          : w
      ),
      exceptions: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("same"))).toBe(
        true
      );
    }
  });

  it("allows overnight windows (close before open on clock)", () => {
    const result = RestaurantHoursInputSchema.safeParse({
      temporarily_closed: false,
      temporarily_closed_reason: null,
      weekly: baseWeekly.map((w) =>
        w.day_of_week === 1
          ? { ...w, open_time: "22:00", close_time: "02:00" }
          : w
      ),
      exceptions: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("formatExceptionsForPrompt", () => {
  it("omits past exceptions from prompt list", () => {
    const text = formatExceptionsForPrompt(
      [
        {
          exception_date: "2020-01-01",
          label: "Old",
          is_closed: true,
          open_time: null,
          close_time: null,
        },
        {
          exception_date: "2030-01-01",
          label: "Future",
          is_closed: true,
          open_time: null,
          close_time: null,
        },
      ],
      { fromDate: "2026-01-01" }
    );
    expect(text).not.toContain("2020-01-01");
    expect(text).toContain("2030-01-01");
  });
});
