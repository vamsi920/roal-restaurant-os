import { describe, expect, it } from "vitest";
import {
  decodeLookupCookie,
  encodeLookupCookie,
} from "@/lib/restaurant-lookup/cookie";
import { weeklyHoursFromPlacesPeriods } from "@/lib/restaurant-lookup/hours";
import { parseLookupInput } from "@/lib/restaurant-lookup/input";
import { htmlToPlainText, priceSignalScore } from "@/lib/restaurant-lookup/html-to-text";
import { scannedMenuHasPricedItems } from "@/lib/restaurant-lookup/priced-menu";
import { SlidingWindowRateLimiter } from "@/lib/restaurant-lookup/rate-limit";
import { snapshotFromPlace } from "@/lib/restaurant-lookup/places";
import type { ScannedMenu } from "@/lib/menu-import/types";

const SECRET = "lookup-test-secret";

describe("parseLookupInput", () => {
  it("requires city and name", () => {
    expect(parseLookupInput({ name: "Joe's" })).toEqual({
      error: "City is required.",
    });
    expect(parseLookupInput({ city: "Austin" })).toEqual({
      error: "Restaurant name is required.",
    });
  });

  it("accepts trimmed name and city", () => {
    expect(parseLookupInput({ name: "  Joe's Pizza ", city: " Austin " })).toEqual({
      name: "Joe's Pizza",
      city: "Austin",
    });
  });
});

describe("weeklyHoursFromPlacesPeriods", () => {
  it("maps open days and marks missing days closed", () => {
    const weekly = weeklyHoursFromPlacesPeriods([
      { open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 21, minute: 0 } },
      { open: { day: 2, hour: 11, minute: 0 }, close: { day: 2, hour: 21, minute: 0 } },
    ]);
    expect(weekly).toHaveLength(7);
    expect(weekly?.[0]).toEqual({
      day_of_week: 0,
      is_closed: true,
      open_time: null,
      close_time: null,
    });
    expect(weekly?.[1]).toEqual({
      day_of_week: 1,
      is_closed: false,
      open_time: "11:00",
      close_time: "21:00",
    });
  });
});

describe("scannedMenuHasPricedItems", () => {
  it("is false for empty or unpriced menus", () => {
    expect(scannedMenuHasPricedItems({ categories: [] } as unknown as ScannedMenu)).toBe(
      false
    );
    expect(
      scannedMenuHasPricedItems({
        categories: [{ name: "Mains", items: [{ name: "Burger", modifiers: [] }] }],
      } as ScannedMenu)
    ).toBe(false);
  });

  it("is true when any item has a price", () => {
    expect(
      scannedMenuHasPricedItems({
        categories: [
          {
            name: "Mains",
            items: [{ name: "Burger", price: 12, modifiers: [] }],
          },
        ],
      } as ScannedMenu)
    ).toBe(true);
  });
});

describe("lookup cookie", () => {
  it("round-trips a signed payload and rejects expiry", () => {
    const token = encodeLookupCookie(
      {
        placeId: "abc",
        name: "Joe's",
        city: "Austin",
        address: "1 Main",
        phone: "+15551212",
        website: "https://joes.example",
      },
      1_000_000,
      SECRET
    );
    expect(token).toBeTruthy();
    const decoded = decodeLookupCookie(token, 1_000_000, SECRET);
    expect(decoded?.placeId).toBe("abc");
    expect(decodeLookupCookie(token, 1_000_000 + 31 * 60 * 1000, SECRET)).toBeNull();
  });
});

describe("rate limiter", () => {
  it("blocks after the window fills", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1_000);
    expect(limiter.check("ip", 0).allowed).toBe(true);
    expect(limiter.check("ip", 10).allowed).toBe(true);
    expect(limiter.check("ip", 20).allowed).toBe(false);
    expect(limiter.check("ip", 1_020).allowed).toBe(true);
  });
});

describe("htmlToPlainText", () => {
  it("strips scripts and keeps readable text", () => {
    const text = htmlToPlainText(
      "<script>alert(1)</script><h1>Menu</h1><p>Burger $12</p>"
    );
    expect(text).toContain("Menu");
    expect(text).toContain("Burger $12");
    expect(text).not.toContain("alert");
    expect(priceSignalScore(text)).toBeGreaterThan(0);
  });
});

describe("snapshotFromPlace", () => {
  it("builds profile fields from Places address components", () => {
    const snapshot = snapshotFromPlace(
      {
        id: "places/xyz",
        displayName: { text: "Joe's Pizza" },
        formattedAddress: "1 Main St, Austin, TX 78701, USA",
        internationalPhoneNumber: "+1 512-555-0100",
        websiteUri: "https://joespizza.example",
        googleMapsUri: "https://maps.google.com/?cid=1",
        timeZone: { id: "America/Chicago" },
        addressComponents: [
          { longText: "1", types: ["street_number"] },
          { longText: "Main St", types: ["route"] },
          { longText: "Austin", types: ["locality"] },
          { shortText: "TX", types: ["administrative_area_level_1"] },
          { longText: "78701", types: ["postal_code"] },
          { shortText: "US", types: ["country"] },
        ],
        regularOpeningHours: {
          periods: [
            { open: { day: 0, hour: 12, minute: 0 }, close: { day: 0, hour: 20, minute: 0 } },
          ],
        },
      },
      "Fallback"
    );
    expect(snapshot?.profile).toMatchObject({
      name: "Joe's Pizza",
      city: "Austin",
      region: "TX",
      postal_code: "78701",
      timezone: "America/Chicago",
    });
    expect(snapshot?.weekly_hours?.[0]?.is_closed).toBe(false);
    expect(snapshot?.weekly_hours?.[1]?.is_closed).toBe(true);
  });
});
