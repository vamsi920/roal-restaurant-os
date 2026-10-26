import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env.server", () => ({
  hasGooglePlacesApiKey: vi.fn(),
}));

vi.mock("@/lib/restaurant-lookup/places", () => ({
  searchRestaurantPlaces: vi.fn(),
}));

vi.mock("@/lib/restaurant-lookup/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/restaurant-lookup/rate-limit")>();
  return {
    ...actual,
    lookupRateLimiter: {
      check: vi.fn(),
    },
  };
});

import { POST } from "@/app/api/restaurants/lookup/route";
import { hasGooglePlacesApiKey } from "@/lib/env.server";
import { searchRestaurantPlaces } from "@/lib/restaurant-lookup/places";
import { lookupRateLimiter } from "@/lib/restaurant-lookup/rate-limit";

describe("POST /api/restaurants/lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasGooglePlacesApiKey).mockReturnValue(true);
    vi.mocked(lookupRateLimiter.check).mockReturnValue({ allowed: true, remaining: 9 });
  });

  it("returns 400 when city is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/restaurants/lookup", {
        method: "POST",
        body: JSON.stringify({ name: "Joe's Pizza" }),
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "City is required." });
    expect(searchRestaurantPlaces).not.toHaveBeenCalled();
  });

  it("returns 429 when the lookup window is full", async () => {
    vi.mocked(lookupRateLimiter.check).mockReturnValue({ allowed: false, remaining: 0 });
    const res = await POST(
      new Request("http://localhost/api/restaurants/lookup", {
        method: "POST",
        body: JSON.stringify({ name: "Joe's", city: "Austin" }),
      })
    );
    expect(res.status).toBe(429);
    expect(searchRestaurantPlaces).not.toHaveBeenCalled();
  });

  it("returns matching places", async () => {
    vi.mocked(searchRestaurantPlaces).mockResolvedValue([
      {
        place_id: "p1",
        name: "Joe's Pizza",
        address: "1 Main",
        phone: null,
        website: null,
        maps_url: null,
      },
    ]);
    const res = await POST(
      new Request("http://localhost/api/restaurants/lookup", {
        method: "POST",
        body: JSON.stringify({ name: "Joe's", city: "Austin" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      city: "Austin",
      places: [{ place_id: "p1" }],
    });
  });
});
