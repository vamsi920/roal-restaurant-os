import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("@/lib/auth/context-server", () => ({
  getAuthContext: vi.fn(),
  findMembershipForOrg: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/voice-agent/provision-restaurant-voice-agent", () => ({
  provisionRestaurantVoiceAgent: vi.fn(),
  tryProvisionVoiceAgentForNewRestaurant: vi.fn(),
}));

vi.mock("@/lib/onboarding/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/onboarding/helpers")>();
  return {
    ...actual,
    updateRestaurantOnboardingStep: vi.fn(),
    getRestaurantOnboarding: vi.fn(),
  };
});

import { findMembershipForOrg, getAuthContext } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { retryRestaurantVoiceAgentProvisionAction } from "@/app/dashboard/onboarding/actions";

describe("onboarding voice provision actions tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthContext).mockResolvedValue({
      user: { id: USER_ID, email: "owner@test.com" },
      memberships: [{ organization_id: ORG_A, role: "owner" }],
    } as never);
    vi.mocked(findMembershipForOrg).mockReturnValue({
      organization_id: ORG_A,
      role: "owner",
    } as never);
    vi.mocked(createServerSupabase).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: REST_B,
                name: "Foreign",
                organization_id: ORG_B,
              },
              error: null,
            }),
          }),
        }),
      }),
    } as never);
  });

  it("rejects retry when restaurant belongs to another organization", async () => {
    await expect(
      retryRestaurantVoiceAgentProvisionAction({
        restaurantId: REST_B,
        organizationId: ORG_A,
      })
    ).rejects.toThrow(/does not belong/i);
  });
});
