import { describe, expect, it } from "vitest";
import { RestaurantProfileInputSchema } from "@/lib/restaurant-profile/schema";

const base = {
  name: "Test Kitchen",
  country: "US",
  timezone: "America/Chicago",
  allows_pickup: true,
  allows_delivery: false,
  prep_time_minutes: 20,
  tax_rate_percent: 8.25,
  service_fee_percent: 0,
};

describe("RestaurantProfileInputSchema", () => {
  it("accepts null optional fields from server actions", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      phone: null,
      cuisine: null,
      website: null,
      escalation_email: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when pickup and delivery are both disabled", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      allows_pickup: false,
      allows_delivery: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects prep time outside 5–240", () => {
    expect(
      RestaurantProfileInputSchema.safeParse({ ...base, prep_time_minutes: 4 })
        .success
    ).toBe(false);
    expect(
      RestaurantProfileInputSchema.safeParse({ ...base, prep_time_minutes: 241 })
        .success
    ).toBe(false);
  });

  it("rejects invalid escalation email", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      escalation_email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid website URL", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts handoff rules and normalizes empty strings to null", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      handoff_catering_route: "  Party of 20+ → manager callback  ",
      handoff_complaint_route: "",
      handoff_unavailable_item_behavior: "escalate_to_staff",
      handoff_unavailable_item_notes: "",
      closed_hours_message: "We reopen Tuesday at 11.",
      escalation_phone: "(512) 555-0100",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.handoff_catering_route).toBe(
        "Party of 20+ → manager callback"
      );
      expect(result.data.handoff_complaint_route).toBeNull();
      expect(result.data.handoff_unavailable_item_behavior).toBe(
        "escalate_to_staff"
      );
      expect(result.data.escalation_phone).toBe("(512) 555-0100");
    }
  });

  it("rejects invalid unavailable-item behavior", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      handoff_unavailable_item_behavior: "substitute_magic",
    });
    expect(result.success).toBe(false);
  });

  it("rejects escalation phone with too few digits", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      escalation_phone: "123",
    });
    expect(result.success).toBe(false);
  });
});
