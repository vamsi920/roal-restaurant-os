import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RestaurantProfile } from "@/lib/types";
import type { RestaurantKnowledgeEntry } from "@/lib/restaurant-knowledge/schema";
import type { RestaurantUpsellRule } from "@/lib/restaurant-upsell/schema";

const RESTAURANT_ID = "00000000-0000-4000-8000-000000000088";
const DEDICATED_AGENT_ID = "agent_location_dedicated";
const TEMPLATE_AGENT_ID = "agent_template_global";

const profile: RestaurantProfile = {
  restaurant_id: RESTAURANT_ID,
  organization_id: "00000000-0000-4000-8000-000000000001",
  phone: "555-0100",
  address_line1: "1 Main St",
  address_line2: null,
  city: "Austin",
  region: "TX",
  postal_code: "78701",
  country: "US",
  timezone: "America/Chicago",
  cuisine: "Italian",
  website: null,
  allows_pickup: true,
  allows_delivery: true,
  prep_time_minutes: 35,
  tax_rate_percent: 8.25,
  service_fee_percent: 0,
  escalation_name: "Manager",
  escalation_phone: null,
  escalation_email: null,
  handoff_catering_route: null,
  handoff_complaint_route: null,
  handoff_unavailable_item_behavior: null,
  handoff_unavailable_item_notes: null,
  closed_hours_message: null,
  temporarily_closed: false,
  temporarily_closed_reason: null,
  elevenlabs_agent_id: DEDICATED_AGENT_ID,
  elevenlabs_provision_status: "ready",
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

const knowledgeEntries: RestaurantKnowledgeEntry[] = [
  {
    id: "k1",
    restaurant_id: RESTAURANT_ID,
    organization_id: profile.organization_id,
    category: "directions",
    question: "Where do guests park?",
    answer: "Use the lot behind the building.",
    sort_order: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
  },
];

const upsellRules: RestaurantUpsellRule[] = [
  {
    id: "u1",
    restaurant_id: RESTAURANT_ID,
    organization_id: profile.organization_id,
    trigger_text: "pizza order",
    offer_text: "Offer garlic knots if available.",
    sort_order: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
  },
];

const patchConvaiAgent = vi.fn().mockResolvedValue({ agent_id: DEDICATED_AGENT_ID });

vi.mock("@/lib/env.server", () => ({
  requireElevenLabsApiKey: vi.fn(() => "test-key"),
  getElevenLabsApiKey: vi.fn(() => "test-key"),
  getElevenLabsAgentId: vi.fn(() => TEMPLATE_AGENT_ID),
  requireElevenLabsAgentId: vi.fn((fallback?: string | null) => {
    const id = fallback?.trim() || TEMPLATE_AGENT_ID;
    if (!id) throw new Error("missing agent");
    return id;
  }),
  getRestaurantAgentTimezone: vi.fn(() => "America/Chicago"),
  isRoalOrderKbEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/elevenlabs", () => ({
  getElevenLabsApiKey: vi.fn(() => "test-key"),
  getConvaiAgent: vi.fn(() =>
    Promise.resolve({
      agent_id: DEDICATED_AGENT_ID,
      conversation_config: {
        agent: {
          language: "en",
          prompt: { prompt: "stale prompt", tool_ids: [] },
        },
      },
    })
  ),
  patchConvaiAgent: (...args: unknown[]) => patchConvaiAgent(...args),
  createKnowledgeBaseTextDocument: vi.fn(),
  listAllKnowledgeBaseDocuments: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleSupabase: vi.fn(() => ({})),
  createServerSupabase: vi.fn(async () => ({})),
}));

vi.mock("@/lib/restaurant-profile/helpers", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/restaurant-profile/helpers")
  >();
  return {
    ...actual,
    getRestaurantProfile: vi.fn(() => Promise.resolve(profile)),
  };
});

vi.mock("@/lib/restaurant-hours/helpers", () => ({
  loadRestaurantHoursBundle: vi.fn(() =>
    Promise.resolve({
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
    })
  ),
  buildAgentHoursPromptFromBundle: vi.fn(() => "## Hours and ordering availability\n- Open now."),
}));

vi.mock("@/lib/elevenlabs/load-menu-prompt-snapshot", () => ({
  loadMenuPromptSnapshot: vi.fn(() =>
    Promise.resolve({ categoryCount: 2, itemCount: 8, modifierCount: 1 })
  ),
}));

vi.mock("@/lib/restaurant-knowledge/helpers", () => ({
  loadRestaurantKnowledgeEntries: vi.fn(() => Promise.resolve(knowledgeEntries)),
}));

vi.mock("@/lib/restaurant-upsell/helpers", () => ({
  loadRestaurantUpsellRules: vi.fn(() => Promise.resolve(upsellRules)),
}));

import { applyRestaurantOrderAgentProfile } from "@/lib/elevenlabs-restaurant-agent-profile";
import { getConvaiAgent } from "@/lib/elevenlabs";

describe("restaurant profile/knowledge/upsell voice content sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patchConvaiAgent.mockResolvedValue({ agent_id: DEDICATED_AGENT_ID });
    vi.mocked(getConvaiAgent).mockResolvedValue({
      agent_id: DEDICATED_AGENT_ID,
      conversation_config: {
        agent: {
          language: "en",
          prompt: { prompt: "stale prompt", tool_ids: [] },
        },
      },
    });
  });

  it("patches the dedicated agent prompt with profile, FAQ, and upsell content", async () => {
    await applyRestaurantOrderAgentProfile({
      agentId: DEDICATED_AGENT_ID,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Voice Test Kitchen",
    });

    expect(patchConvaiAgent).toHaveBeenCalledTimes(1);
    expect(patchConvaiAgent).toHaveBeenCalledWith(
      DEDICATED_AGENT_ID,
      expect.any(Object)
    );
    expect(patchConvaiAgent).not.toHaveBeenCalledWith(
      TEMPLATE_AGENT_ID,
      expect.anything()
    );

    const body = patchConvaiAgent.mock.calls[0]?.[1] as {
      conversation_config?: {
        agent?: { prompt?: { prompt?: string } };
      };
    };
    const prompt = body.conversation_config?.agent?.prompt?.prompt ?? "";

    expect(prompt).toContain("Both pickup and delivery");
    expect(prompt).toContain("about 35 minutes");
    expect(prompt).toContain("Restaurant knowledge base");
    expect(prompt).toContain("Where do guests park?");
    expect(prompt).toContain("lot behind the building");
    expect(prompt).toContain("Upsell rules");
    expect(prompt).toContain("pizza order");
    expect(prompt).toContain("garlic knots");
    expect(prompt).toContain("Hours and ordering availability");
  });

  it("refuses to patch the shared template agent when restaurant context is set", async () => {
    await expect(
      applyRestaurantOrderAgentProfile({
        agentId: TEMPLATE_AGENT_ID,
        restaurantId: RESTAURANT_ID,
        restaurantName: "Voice Test Kitchen",
      })
    ).rejects.toThrow(/shared template agent/i);

    expect(patchConvaiAgent).not.toHaveBeenCalled();
  });
});
