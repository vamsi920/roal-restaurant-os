import { describe, expect, it } from "vitest";
import { resolveRestaurantTimezone, timezoneForUsState } from "@/lib/restaurant-profile/timezone";
import { formatPhoneForDisplay } from "@/lib/phone/e164";
import { ownerSummary } from "@/components/call-history/RestaurantCallHistoryPanel";

describe("restaurant time zone", () => {
  it("maps US states, keeps a stated zone, defaults to Eastern", () => {
    expect(timezoneForUsState("NJ")).toBe("America/New_York");
    expect(timezoneForUsState("Texas")).toBe("America/Chicago");
    expect(timezoneForUsState("CA")).toBe("America/Los_Angeles");
    expect(resolveRestaurantTimezone({ timezone: "America/Denver", region: "NJ" })).toBe("America/Denver");
    expect(resolveRestaurantTimezone({ timezone: "Not/AZone", region: "TX" })).toBe("America/Chicago");
    expect(resolveRestaurantTimezone({})).toBe("America/New_York");
  });
});

describe("display helpers", () => {
  it("formats US phone numbers", () => {
    expect(formatPhoneForDisplay("+12017444665")).toBe("(201) 744-4665");
    expect(formatPhoneForDisplay("2011744465")).toBe("(201) 174-4465");
    expect(formatPhoneForDisplay("+44 20 7946 0958")).toBe("+44 20 7946 0958");
    expect(formatPhoneForDisplay(null)).toBeNull();
  });

  it("rewrites call summaries in owner words", () => {
    expect(ownerSummary("The user called. The agent offered a roll; the user's name was Sam.", "Anika")).toBe(
      "The caller called. Anika offered a roll; the caller's name was Sam."
    );
  });
});
