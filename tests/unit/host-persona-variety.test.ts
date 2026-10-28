import { describe, expect, it } from "vitest";
import { cuisineFromPlaceTypes } from "@/lib/restaurant-lookup/places";
import { findTrialVoice, resolveTrialPersona, voiceFromMenuItems } from "@/lib/trial/voices";

const INDIAN = ["Dosa Hut", "Kati Roll Company", "Bombay Grill", "Curry Palace", "Taj Mahal", "Masala Twist", "Desi Galli", "Biryani Pot"];

describe("host persona", () => {
  it("gives Indian restaurants Indian-accent hosts with different names", () => {
    const names = INDIAN.map((n) => resolveTrialPersona(null, n, "indian"));
    for (const p of names) expect(findTrialVoice(p.voiceId)?.accent).toBe("Indian");
    expect(new Set(names.map((p) => p.agentName)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(names.map((p) => p.voiceId)).size).toBe(2);
  });

  it("is stable for the same restaurant", () => {
    expect(resolveTrialPersona(null, "Dosa Hut", "indian")).toEqual(resolveTrialPersona(null, "Dosa Hut", "indian"));
  });

  it("keeps a saved name and an owner-picked voice", () => {
    const p = resolveTrialPersona({ agentName: "Sunny", voiceId: "g6xIsTj2HwM6VR4iXFCw" }, "Dosa Hut", "indian");
    expect(p).toMatchObject({ agentName: "Sunny", voiceLabel: "Jessica" });
  });

  it("names match the voice's gender", () => {
    for (const n of INDIAN) {
      const p = resolveTrialPersona(null, n, "indian");
      const female = ["Priya", "Anika", "Meera", "Kavya", "Diya", "Nisha", "Riya", "Asha", "Pooja", "Lakshmi"].includes(p.agentName);
      expect(female).toBe(findTrialVoice(p.voiceId)?.gender === "female");
    }
  });

  it("reads cuisine from the menu only with a clear majority", () => {
    expect(voiceFromMenuItems(["Masala Dosa", "Paneer Tikka", "Chicken Biryani", "Coke"])?.accent).toBe("Indian");
    expect(voiceFromMenuItems(["Burger", "Fish Taco", "Fries"])).toBeNull();
  });

  it("reads cuisine from Google place types", () => {
    expect(cuisineFromPlaceTypes({ primaryType: "south_indian_restaurant" })).toBe("south indian");
    expect(cuisineFromPlaceTypes({ primaryType: "restaurant", types: ["meal_takeaway"] })).toBeNull();
  });
});
