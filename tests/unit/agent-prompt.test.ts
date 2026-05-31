import { describe, expect, it } from "vitest";
import {
  buildRestaurantOrderAgentPrompt,
  buildRestaurantOrderFirstMessage,
  buildRestaurantVoicemailMessage,
  buildRoalKbPlaybook,
} from "@/lib/elevenlabs/agent-prompt";
import { buildHoursPromptSection } from "@/lib/restaurant-hours/core";

const baseProfile = {
  id: "r1",
  organization_id: "o1",
  name: "QA Bistro",
  cuisine: "Italian",
  phone: "+15551234567",
  address_line1: "1 Main St",
  address_line2: null,
  city: "Austin",
  state: "TX",
  postal_code: "78701",
  country: "US",
  allows_pickup: true,
  allows_delivery: false,
  prep_time_minutes: 25,
  tax_rate_percent: 8.25,
  service_fee_percent: 0,
  temporarily_closed: false,
  temporarily_closed_reason: null,
  escalation_name: "Manager",
  escalation_phone: "+15559876543",
  escalation_email: null,
  handoff_catering_route: null,
  handoff_complaint_route: null,
  handoff_unavailable_item_behavior: null,
  handoff_unavailable_item_notes: null,
  closed_hours_message: null,
  created_at: "",
  updated_at: "",
};

describe("buildRestaurantOrderAgentPrompt", () => {
  it("includes identity, policy, menu, customer, handoff, and hours", () => {
    const hours = buildHoursPromptSection({
      profile: {
        timezone: "America/Chicago",
        temporarily_closed: false,
        temporarily_closed_reason: null,
      },
      weekly: [
        {
          day_of_week: 1,
          is_closed: false,
          open_time: "11:00",
          close_time: "21:00",
        },
      ],
      exceptions: [],
      evaluation: {
        ordering_allowed: true,
        is_open_now: true,
        status: "open",
        message: "Open now.",
        local_date: "2026-05-19",
        local_time: "12:00",
        local_day_of_week: 1,
      },
    });

    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "QA Bistro",
      profile: baseProfile,
      hoursPromptSection: hours,
      menu: { categoryCount: 2, itemCount: 10, modifierCount: 4 },
      knowledgeEntries: [
        {
          category: "allergens",
          question: "Do you have gluten-free options?",
          answer:
            "Mention marked gluten-friendly items only; do not guarantee no cross-contact.",
        },
        {
          category: "directions",
          question: "Where do pickup guests park?",
          answer: "Use the short-term spaces behind the building.",
        },
      ],
      upsellRules: [
        {
          trigger_text: "Biryani order",
          offer_text: "Offer mango lassi or raita if available.",
        },
      ],
    });

    expect(prompt).toContain("QA Bistro");
    expect(prompt).toContain("Never invent menu items");
    expect(prompt).toContain("Pickup only");
    expect(prompt).toMatch(/never offer delivery/i);
    expect(prompt).toContain("about 25 minutes");
    expect(prompt).toContain("tax 8.25%");
    expect(prompt).toContain("get_menu_items");
    expect(prompt).toContain("customer_name and customer_phone");
    expect(prompt).toContain("Call purpose");
    expect(prompt).toContain("Guest questions (hours, directions, menu)");
    expect(prompt).toContain("Restaurant knowledge base");
    expect(prompt).toContain("Do you have gluten-free options?");
    expect(prompt).toContain("do not guarantee no cross-contact");
    expect(prompt).toContain("Where do pickup guests park?");
    expect(prompt).toContain("Upsell rules");
    expect(prompt).toContain("Biryani order");
    expect(prompt).toContain("Offer mango lassi or raita");
    expect(prompt).toMatch(/Never invent add-ons/i);
    expect(prompt).toMatch(/voicemail\/callback/i);
    expect(prompt).toContain("Closed hours behavior");
    expect(prompt).toContain("Unsupported requests");
    expect(prompt).toContain("Handoff and escalation");
    expect(prompt).toContain("Routing: manager or human");
    expect(prompt).toContain("Manager / staff escalation");
    expect(prompt).toContain("Manager");
    expect(prompt).toContain("Hours and ordering availability");
    expect(prompt).toContain("Live gate");
    expect(prompt).not.toMatch(/online if available/i);
    expect(prompt).not.toMatch(/appetizer and two fitting main/i);
  });

  it("requires menu-first, per-change sync, and real guest identity (prompt 41)", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Test Diner",
      profile: null,
      hoursPromptSection: null,
      menu: { categoryCount: 3, itemCount: 12, modifierCount: 6 },
    });

    expect(prompt).toMatch(/call get_menu_items/i);
    expect(prompt).toMatch(/first chance to act/i);
    expect(prompt).toContain("sync_draft_order");
    expect(prompt).toMatch(/After every cart change/i);
    expect(prompt).toMatch(
      /Never pass fictional|never placeholders|Never invent/i
    );
    expect(prompt).toContain("dynamic_variable_placeholders");
    expect(prompt).toContain("Menu size hint: 3 categories, 12 items");
    expect(prompt).toContain("6 modifier options");
  });

  it("requires live menu operations over stale hours snapshot", () => {
    const hours = buildHoursPromptSection({
      profile: {
        timezone: "America/Chicago",
        temporarily_closed: false,
        temporarily_closed_reason: null,
      },
      weekly: [],
      exceptions: [],
      evaluation: {
        ordering_allowed: false,
        is_open_now: false,
        status: "closed",
        message: "Closed for the night.",
        local_date: "2026-05-19",
        local_time: "22:00",
        local_day_of_week: 1,
      },
    });

    expect(hours).toContain("get_menu_items operations.ordering_allowed");
    expect(hours.toLowerCase()).toContain("do not guess holiday hours");
  });

  it("prioritizes phone ordering and routes non-order topics via handoff", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "QA Bistro",
      profile: baseProfile,
      hoursPromptSection: null,
      menu: null,
    });

    expect(prompt).toMatch(/Primary goal: complete accurate pickup or delivery phone orders/i);
    expect(prompt).toContain("Catering / large party → Catering route");
    expect(prompt).toContain("Refunds, chargebacks");
    expect(prompt).toContain("do not call sync_draft_order or finalize_order");
  });

  it("never offers disabled fulfillment modes", () => {
    const pickupOnly = buildRestaurantOrderAgentPrompt({
      restaurantName: "QA Bistro",
      profile: { ...baseProfile, allows_pickup: true, allows_delivery: false },
      hoursPromptSection: null,
      menu: null,
    });
    expect(pickupOnly).toMatch(/never offer delivery/i);

    const deliveryOnly = buildRestaurantOrderAgentPrompt({
      restaurantName: "QA Bistro",
      profile: { ...baseProfile, allows_pickup: false, allows_delivery: true },
      hoursPromptSection: null,
      menu: null,
    });
    expect(deliveryOnly).toMatch(/never offer pickup/i);
  });

  it("includes catering, complaint, closed-hours, and unavailable-item rules when set", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "QA Bistro",
      profile: {
        ...baseProfile,
        handoff_catering_route: "Take headcount and date; manager calls back.",
        handoff_complaint_route: "Apologize; capture order #; manager callback.",
        closed_hours_message: "We're closed—hours are on the website.",
        handoff_unavailable_item_behavior: "decline_skip",
        handoff_unavailable_item_notes: "Offer a side instead.",
      },
      hoursPromptSection: null,
      menu: null,
    });

    expect(prompt).toContain("Catering & large-party requests: Take headcount");
    expect(prompt).toContain("Complaints & service issues: Apologize");
    expect(prompt).toContain("When closed per hours");
    expect(prompt).toContain("We're closed—hours are on the website");
    expect(prompt).toMatch(/move on without adding/i);
    expect(prompt).toContain("Offer a side instead");
  });
});

describe("buildRestaurantOrderFirstMessage", () => {
  it("never emits mustache templates when name is empty", () => {
    const msg = buildRestaurantOrderFirstMessage(null, "");
    expect(msg).not.toMatch(/\{\{/);
    expect(msg).toContain("the restaurant");
  });

  it("does not invite menu Q&A when temporarily closed", () => {
    const msg = buildRestaurantOrderFirstMessage(
      { ...baseProfile, temporarily_closed: true },
      "QA Bistro"
    );
    expect(msg).toContain("QA Bistro");
    expect(msg).not.toMatch(/answer quick questions/i);
  });
});

describe("buildRestaurantVoicemailMessage", () => {
  it("does not mention online ordering", () => {
    expect(buildRestaurantVoicemailMessage("QA Bistro")).not.toMatch(/online/i);
  });
});

describe("buildRoalKbPlaybook", () => {
  it("anchors authority on get_menu_items", () => {
    const kb = buildRoalKbPlaybook();
    expect(kb).toContain("get_menu_items");
    expect(kb).toContain("Never invent");
  });

  it("reinforces sync_draft_order on every cart change", () => {
    const kb = buildRoalKbPlaybook();
    expect(kb).toContain("sync_draft_order");
    expect(kb).toMatch(/Every change uses sync_draft_order/);
    expect(kb).toMatch(/No fabricated customer_name or customer_phone/);
  });
});
