import { describe, expect, it } from "vitest";
import { RestaurantProfileInputSchema } from "@/lib/restaurant-profile/schema";
import {
  parseKnowledgeText,
  serializeKnowledgeEntries,
} from "@/lib/restaurant-knowledge/schema";
import {
  parseUpsellRulesText,
  serializeUpsellRules,
} from "@/lib/restaurant-upsell/schema";

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
      knowledge_base_text:
        "[policies] Do you take reservations? => This phone line handles pickup orders. For reservations, call during open hours.",
      upsell_rules_text: "Pizza => Offer garlic knots if available.",
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

describe("restaurant upsell rules text", () => {
  it("parses trigger-to-offer rules and skips malformed text", () => {
    const rules = parseUpsellRulesText(`
      Biryani order => Offer mango lassi or raita if available.
      when large pizza -> Ask if they want garlic knots.
      no separator here
    `);

    expect(rules).toEqual([
      {
        trigger_text: "Biryani order",
        offer_text: "Offer mango lassi or raita if available.",
      },
      {
        trigger_text: "large pizza",
        offer_text: "Ask if they want garlic knots.",
      },
    ]);
  });

  it("serializes upsell rules for the dashboard textarea", () => {
    expect(
      serializeUpsellRules([
        {
          trigger_text: "Burger",
          offer_text: "Offer fries if available.",
        },
      ])
    ).toBe("Burger => Offer fries if available.");
  });
});

describe("restaurant knowledge text", () => {
  it("parses category-prefixed FAQ lines and skips malformed text", () => {
    const entries = parseKnowledgeText(`
      [allergens] Gluten free? => Mention marked gluten-friendly items only.
      [directions] Parking? -> Use short-term spaces behind the building.
      bad line without separator
    `);

    expect(entries).toEqual([
      {
        category: "allergens",
        question: "Gluten free?",
        answer: "Mention marked gluten-friendly items only.",
      },
      {
        category: "directions",
        question: "Parking?",
        answer: "Use short-term spaces behind the building.",
      },
    ]);
  });

  it("serializes active entries for the dashboard textarea", () => {
    expect(
      serializeKnowledgeEntries([
        {
          category: "policies",
          question: "Do you take reservations?",
          answer: "This line handles pickup orders.",
          is_active: true,
        },
        {
          category: "hours",
          question: "Hidden draft",
          answer: "Not live yet.",
          is_active: false,
        },
      ])
    ).toBe("[policies] Do you take reservations? => This line handles pickup orders.");
  });

  it("accepts structured knowledge_entries with active state", () => {
    const result = RestaurantProfileInputSchema.safeParse({
      ...base,
      knowledge_entries: [
        {
          category: "allergens",
          question: "Nut-free?",
          answer: "We cannot guarantee nut-free preparation.",
          is_active: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
