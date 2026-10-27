import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/context-server", () => ({
  getAuthContext: vi.fn(),
  findMembershipForOrg: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/restaurant-lookup/pending", () => ({
  readPendingRestaurantLookup: vi.fn(),
}));

vi.mock("@/lib/restaurant-lookup/places", () => ({
  loadPlaceSnapshot: vi.fn(),
}));

vi.mock("@/lib/restaurant-lookup/import-website-menu", () => ({
  importWebsiteMenuFromUrl: vi.fn(),
}));

vi.mock("@/lib/scanner/commit-menu", () => ({
  commitMenuToRestaurant: vi.fn(),
}));

vi.mock("@/lib/restaurant-profile/helpers", () => ({
  getRestaurantProfile: vi.fn(),
  upsertRestaurantProfile: vi.fn(),
}));

vi.mock("@/lib/onboarding/helpers", () => ({
  ensureRestaurantOnboarding: vi.fn(),
  updateRestaurantOnboardingStep: vi.fn(),
  completeOrganizationAccountStep: vi.fn(),
  ensureOrganizationOnboarding: vi.fn(),
  getRestaurantOnboarding: vi.fn(),
  updateOrganizationOnboardingStep: vi.fn(),
}));

vi.mock("@/lib/voice-agent/provision-restaurant-voice-agent", () => ({
  tryProvisionVoiceAgentForNewRestaurant: vi.fn(),
  provisionRestaurantVoiceAgent: vi.fn(),
}));

vi.mock("@/lib/voice-agent/run-restaurant-voice-agent-sync", () => ({
  runRestaurantVoiceAgentSync: vi.fn(),
}));

import { applyRestaurantLookupAction } from "@/app/dashboard/onboarding/actions";
import { findMembershipForOrg, getAuthContext } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { readPendingRestaurantLookup } from "@/lib/restaurant-lookup/pending";
import { loadPlaceSnapshot } from "@/lib/restaurant-lookup/places";
import { importWebsiteMenuFromUrl } from "@/lib/restaurant-lookup/import-website-menu";
import { commitMenuToRestaurant } from "@/lib/scanner/commit-menu";
import { getRestaurantProfile, upsertRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { tryProvisionVoiceAgentForNewRestaurant } from "@/lib/voice-agent/provision-restaurant-voice-agent";
import { runRestaurantVoiceAgentSync } from "@/lib/voice-agent/run-restaurant-voice-agent-sync";

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REST_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function snapshot() {
  return {
    place_id: "place-1",
    maps_url: "https://maps.google.com/?cid=1",
    profile: {
      name: "Joe's Pizza",
      phone: "+15125550100",
      address_line1: "1 Main St",
      address_line2: null,
      city: "Austin",
      region: "TX",
      postal_code: "78701",
      country: "US",
      timezone: "America/Chicago",
      website: "https://joes.example",
    },
    weekly_hours: [
      { day_of_week: 0, is_closed: true, open_time: null, close_time: null },
      { day_of_week: 1, is_closed: false, open_time: "11:00", close_time: "21:00" },
      { day_of_week: 2, is_closed: false, open_time: "11:00", close_time: "21:00" },
      { day_of_week: 3, is_closed: false, open_time: "11:00", close_time: "21:00" },
      { day_of_week: 4, is_closed: false, open_time: "11:00", close_time: "21:00" },
      { day_of_week: 5, is_closed: false, open_time: "11:00", close_time: "21:00" },
      { day_of_week: 6, is_closed: false, open_time: "11:00", close_time: "21:00" },
    ],
  };
}

describe("applyRestaurantLookupAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthContext).mockResolvedValue({
      user: { id: USER_ID, email: "owner@test.com" },
      memberships: [{ organization_id: ORG_ID, role: "owner" }],
    } as never);
    vi.mocked(findMembershipForOrg).mockReturnValue({
      organization_id: ORG_ID,
      role: "owner",
    } as never);
    vi.mocked(readPendingRestaurantLookup).mockReturnValue({
      v: 1,
      placeId: "place-1",
      name: "Joe's Pizza",
      city: "Austin",
      address: "1 Main St",
      phone: "+15125550100",
      website: "https://joes.example",
      exp: Date.now() / 1000 + 1000,
    });
    vi.mocked(loadPlaceSnapshot).mockResolvedValue(snapshot());
    vi.mocked(importWebsiteMenuFromUrl).mockResolvedValue({
      ok: true,
      menu: {
        categories: [{ name: "Pies", items: [{ name: "Cheese", price: 18, modifiers: [] }] }],
      },
      sourceUrl: "https://joes.example/menu",
      modelUsed: "gemini-test",
    });
    vi.mocked(commitMenuToRestaurant).mockResolvedValue({
      stats: { categories: 1, items: 1, modifiers: 0 },
      menu: { categories: [] },
    } as never);
    vi.mocked(tryProvisionVoiceAgentForNewRestaurant).mockResolvedValue({
      ok: true,
      agent_id: "agent_auto_01",
      method: "duplicate",
    });
    vi.mocked(getRestaurantProfile).mockResolvedValue({
      elevenlabs_agent_id: "agent_auto_01",
    } as never);
    vi.mocked(upsertRestaurantProfile).mockResolvedValue({} as never);
    vi.mocked(runRestaurantVoiceAgentSync).mockResolvedValue({ summary: {} } as never);

    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getDb).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "restaurants") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: REST_ID },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "restaurant_weekly_hours") {
          return { upsert };
        }
        return {};
      }),
    } as never);
  });

  it("creates the restaurant, commits priced menu, and provisions the agent", async () => {
    const result = await applyRestaurantLookupAction({ organizationId: ORG_ID });
    expect(result.restaurantId).toBe(REST_ID);
    expect(result.menuImported).toBe(true);
    expect(tryProvisionVoiceAgentForNewRestaurant).toHaveBeenCalledWith({
      restaurantId: REST_ID,
      restaurantName: "Joe's Pizza",
      organizationId: ORG_ID,
      userId: USER_ID,
    });
    expect(commitMenuToRestaurant).toHaveBeenCalled();
    expect(runRestaurantVoiceAgentSync).toHaveBeenCalled();
  });

  it("does not commit when the website menu has no prices", async () => {
    vi.mocked(importWebsiteMenuFromUrl).mockResolvedValue({
      ok: false,
      reason: "unpriced",
      message: "No priced items on the website menu. Delivery-only pages need a photo scan.",
    });
    const result = await applyRestaurantLookupAction({ organizationId: ORG_ID });
    expect(result.menuImported).toBe(false);
    expect(commitMenuToRestaurant).not.toHaveBeenCalled();
    expect(tryProvisionVoiceAgentForNewRestaurant).toHaveBeenCalled();
  });
});
