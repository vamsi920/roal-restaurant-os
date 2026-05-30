import { describe, expect, it } from "vitest";
import { buildRestaurantOrderAgentPrompt } from "@/lib/elevenlabs/agent-prompt";
import { buildHoursPromptSection } from "@/lib/restaurant-hours/core";
import type { RestaurantProfile } from "@/lib/types";

const fullHandoffProfile: RestaurantProfile = {
  restaurant_id: "r-snap",
  organization_id: "o1",
  name: "Snapshot Kitchen",
  cuisine: "American",
  phone: "+15551230000",
  address_line1: "100 Test Ave",
  address_line2: null,
  city: "Austin",
  region: "TX",
  postal_code: "78701",
  country: "US",
  timezone: "America/Chicago",
  website: "https://snapshot-kitchen.example",
  allows_pickup: true,
  allows_delivery: false,
  prep_time_minutes: 20,
  tax_rate_percent: 8.25,
  service_fee_percent: 0,
  escalation_name: "Alex Manager",
  escalation_phone: "+15559870000",
  escalation_email: "manager@snapshot.example",
  handoff_catering_route:
    "Capture date, headcount, and callback; no catering quotes on the call.",
  handoff_complaint_route:
    "Apologize; note order number; manager callback within one business day.",
  handoff_unavailable_item_behavior: "offer_alternative",
  handoff_unavailable_item_notes: null,
  closed_hours_message:
    "We are closed right now. Our hours are listed online—call back during open hours to order.",
  temporarily_closed: false,
  temporarily_closed_reason: null,
  elevenlabs_agent_id: null,
  elevenlabs_provision_status: null,
  elevenlabs_provision_error: null,
  elevenlabs_provisioned_at: null,
  elevenlabs_menu_auto_sync_status: null,
  elevenlabs_menu_auto_sync_error: null,
  elevenlabs_last_sync_at: null,
  elevenlabs_last_sync_error: null,
  elevenlabs_last_sync_summary: null,
  created_at: "",
  updated_at: "",
};

function openHoursSection() {
  return buildHoursPromptSection({
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
      message: "Open now for orders.",
      local_date: "2026-05-30",
      local_time: "12:00",
      local_day_of_week: 1,
    },
  });
}

function closedHoursSection() {
  return buildHoursPromptSection({
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
      ordering_allowed: false,
      is_open_now: false,
      status: "closed",
      message: "Closed for the night.",
      local_date: "2026-05-30",
      local_time: "22:30",
      local_day_of_week: 1,
    },
  });
}

describe("buildRestaurantOrderAgentPrompt snapshots", () => {
  it("open pickup-only restaurant with full handoff and hours", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Snapshot Kitchen",
      profile: fullHandoffProfile,
      hoursPromptSection: openHoursSection(),
      menu: { categoryCount: 4, itemCount: 24, modifierCount: 8 },
    });
    expect(prompt).toMatchSnapshot();
  });

  it("closed with custom closed-hours message and handoff routes", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Snapshot Kitchen",
      profile: fullHandoffProfile,
      hoursPromptSection: closedHoursSection(),
      menu: { categoryCount: 4, itemCount: 24, modifierCount: 8 },
    });
    expect(prompt).toMatchSnapshot();
  });

  it("minimal null profile (scripts default shape)", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "the restaurant",
      profile: null,
      hoursPromptSection: null,
      menu: null,
    });
    expect(prompt).toMatchSnapshot();
  });
});
