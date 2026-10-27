import { describe, expect, it } from "vitest";
import type { ScannedMenu } from "@/lib/menu-import/types";
import type { WeeklyHourInput } from "@/lib/restaurant-hours/core";
import {
  buildTrialAgentPrompt,
  buildTrialGreeting,
  formatMenuForPrompt,
} from "@/lib/trial/prompt";
import { buildSampleMenu } from "@/lib/trial/sample-menu";
import type { TrialPersona, TrialProfile } from "@/lib/trial/types";

const persona: TrialPersona = {
  agentName: "Addy",
  voiceId: "OYTbf65OHHFELVut7v2H",
  voiceLabel: "Hope",
  language: "en",
};

const profile: TrialProfile = {
  name: "Joe's Pizza",
  phone: "+15125550100",
  address_line1: "123 Main St",
  address_line2: null,
  city: "Austin",
  region: "TX",
  postal_code: "78701",
  country: "US",
  timezone: "America/Chicago",
  website: "https://joespizza.com",
  cuisine: "pizza",
  tagline: "Wood-fired since 1998.",
};

/** Mon-Fri 11:00-22:00, closed Sat/Sun. */
const weekdayHours: WeeklyHourInput[] = Array.from({ length: 7 }, (_, day) => {
  const open = day >= 1 && day <= 5;
  return {
    day_of_week: day,
    is_closed: !open,
    open_time: open ? "11:00" : null,
    close_time: open ? "22:00" : null,
  };
});

describe("formatMenuForPrompt", () => {
  it("renders categories, prices, descriptions and options", () => {
    const menu = buildSampleMenu("pizza");
    const text = formatMenuForPrompt(menu);
    expect(text).toContain("### Pizzas");
    expect(text).toContain("- Margherita: $14 — Tomato, mozzarella, basil");
    expect(text).toContain("- Fountain Soda: $2.50");
    expect(text).not.toContain("SOLD OUT");
  });

  it("marks sold-out items and lists modifier prices", () => {
    const menu: ScannedMenu = {
      categories: [
        {
          name: "Mains",
          sort_order: 1,
          items: [
            {
              name: "Brisket Plate",
              description: null,
              price: 18,
              base_availability: false,
              modifiers: [
                { group_name: "Sides", modifier_name: "Mac and cheese", extra_price: 2.5, min_selection: 0, max_selection: 1 },
                { group_name: "Sides", modifier_name: "Slaw", extra_price: 0, min_selection: 0, max_selection: 1 },
              ],
            },
            { name: "Mystery Special", description: null, price: null, base_availability: true, modifiers: [] },
          ],
        },
      ],
    };
    const text = formatMenuForPrompt(menu);
    expect(text).toContain("- Brisket Plate: $18 · options: Mac and cheese (+$2.50), Slaw [SOLD OUT today]");
    expect(text).toContain("- Mystery Special: price not listed");
  });

  it("caps the number of items", () => {
    const menu: ScannedMenu = {
      categories: [
        {
          name: "Big",
          sort_order: 1,
          items: Array.from({ length: 10 }, (_, i) => ({
            name: `Item ${i}`,
            description: null,
            price: i,
            base_availability: true,
            modifiers: [],
          })),
        },
      ],
    };
    const text = formatMenuForPrompt(menu, 3);
    expect(text).toContain("Item 2");
    expect(text).not.toContain("Item 3");
  });
});

describe("buildTrialAgentPrompt", () => {
  it("includes identity, address, phone, cuisine and the real menu without the sample caveat", () => {
    const prompt = buildTrialAgentPrompt({
      restaurantName: "Joe's Pizza",
      profile,
      weeklyHours: null,
      menu: buildSampleMenu("pizza"),
      menuIsSample: false,
      knowledge: [],
      persona,
    });
    expect(prompt).toContain("You are Addy, the phone host for Joe's Pizza. Joe's Pizza serves pizza. Wood-fired since 1998.");
    expect(prompt).toContain("Address: 123 Main St, Austin, TX, 78701.");
    expect(prompt).toContain("Restaurant phone: +15125550100.");
    expect(prompt).toContain("Service: pickup orders only (no delivery on this line)");
    expect(prompt).toContain("## Menu\n");
    expect(prompt).not.toContain("sample menu");
    expect(prompt).toContain("- Margherita: $14");
    expect(prompt).toContain("Hours are not on file yet");
    expect(prompt).toContain("## Knowledge entries\nNone yet.");
    expect(prompt).not.toMatch(/\{\{/);
  });

  it("adds the sample-menu caveat and marks sold-out items", () => {
    const menu = buildSampleMenu("pizza");
    menu.categories[0].items[0].base_availability = false;
    const prompt = buildTrialAgentPrompt({
      restaurantName: "Joe's Pizza",
      profile: null,
      weeklyHours: null,
      menu,
      menuIsSample: true,
      knowledge: [],
      persona,
    });
    expect(prompt).toContain("## Menu (sample menu — the owner has not uploaded theirs yet; say so if asked)");
    expect(prompt).toContain("- Margherita: $14 — Tomato, mozzarella, basil [SOLD OUT today]");
    expect(prompt).toContain("Address: not on file");
  });

  it("falls back to a no-menu note and lists knowledge entries", () => {
    const prompt = buildTrialAgentPrompt({
      restaurantName: "",
      profile: null,
      weeklyHours: null,
      menu: null,
      menuIsSample: false,
      knowledge: [{ category: "directions", question: "Is there parking?", answer: "Free lot behind the building." }],
      persona,
      offersDelivery: true,
    });
    expect(prompt).toContain("phone host for the restaurant.");
    expect(prompt).toContain("No menu is loaded.");
    expect(prompt).toContain("- Q: Is there parking?\n  A: Free lot behind the building.");
    expect(prompt).toContain("Service: pickup orders and delivery.");
  });

  it("renders the hours block with a closed note and strips tool-only instructions", () => {
    // Sunday 2026-10-25 15:00 America/Chicago (20:00Z) — closed on Sundays.
    const now = new Date("2026-10-25T20:00:00.000Z");
    const prompt = buildTrialAgentPrompt({
      restaurantName: "Joe's Pizza",
      profile,
      weeklyHours: weekdayHours,
      menu: buildSampleMenu("pizza"),
      menuIsSample: false,
      knowledge: [],
      persona,
      now,
    });
    expect(prompt).toContain("## Hours and ordering availability");
    expect(prompt).toContain("Timezone: America/Chicago");
    expect(prompt).toContain("Ordering allowed now: no");
    expect(prompt).toContain("If ordering is not allowed right now: say when you open next and offer to take a note.");
    expect(prompt).toContain("if the caller says they know you are closed and want to test an order anyway, go ahead and take it.");
    expect(prompt).not.toContain("get_menu_items");
    expect(prompt).not.toContain("sync_draft_order");
    expect(prompt).not.toContain("finalize_order");
    expect(prompt).not.toContain("If both allow ordering");
  });

  it("reports ordering allowed during open hours", () => {
    // Wednesday 2026-10-28 12:00 America/Chicago (17:00Z).
    const now = new Date("2026-10-28T17:00:00.000Z");
    const prompt = buildTrialAgentPrompt({
      restaurantName: "Joe's Pizza",
      profile,
      weeklyHours: weekdayHours,
      menu: null,
      menuIsSample: false,
      knowledge: [],
      persona,
      now,
    });
    expect(prompt).toContain("Ordering allowed now: yes");
  });
});

describe("buildTrialGreeting", () => {
  it("greets with restaurant and agent name for pickup only", () => {
    expect(buildTrialGreeting({ restaurantName: "Joe's Pizza", persona })).toBe(
      "Hi, thanks for calling Joe's Pizza, this is Addy. What can I get started for you?"
    );
  });

  it("asks pickup or delivery when delivery is offered", () => {
    expect(buildTrialGreeting({ restaurantName: "Joe's Pizza", persona, offersDelivery: true })).toBe(
      "Hi, thanks for calling Joe's Pizza, this is Addy. Are you picking up today, or would you like delivery?"
    );
  });

  it("uses a generic name when the restaurant name is blank", () => {
    expect(buildTrialGreeting({ restaurantName: "   ", persona })).toContain("thanks for calling the restaurant, this is Addy.");
  });
});

describe("buildSampleMenu", () => {
  it("picks a cuisine-matched menu and a generic fallback", () => {
    expect(buildSampleMenu("Italian").categories[0].name).toBe("Pizzas");
    expect(buildSampleMenu("Mexican street tacos").categories[0].name).toBe("Tacos");
    expect(buildSampleMenu(null).categories[0].name).toBe("Mains");
    expect(buildSampleMenu("sushi").categories[0].name).toBe("Mains");
  });
});
