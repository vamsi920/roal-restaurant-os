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
});
