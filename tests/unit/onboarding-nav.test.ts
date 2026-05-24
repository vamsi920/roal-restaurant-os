import { describe, expect, it } from "vitest";
import { isOnboardingStepNavDisabled } from "@/lib/onboarding/nav";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";

function statuses(
  partial: Partial<Record<OnboardingStepKey, OnboardingStepStatus>>
): (key: OnboardingStepKey) => OnboardingStepStatus {
  return (key) => partial[key] ?? "pending";
}

describe("isOnboardingStepNavDisabled", () => {
  it("blocks restaurant steps until a location exists", () => {
    expect(
      isOnboardingStepNavDisabled("menu_import", {
        orgId: "org-1",
        restaurantId: null,
        resumeStep: "restaurant_profile",
        stepStatus: statuses({}),
      })
    ).toBe(true);
  });

  it("blocks steps ahead of the server resume step", () => {
    expect(
      isOnboardingStepNavDisabled("voice_agent", {
        orgId: "org-1",
        restaurantId: "r-1",
        resumeStep: "menu_import",
        stepStatus: statuses({
          restaurant_profile: "completed",
          menu_import: "pending",
        }),
      })
    ).toBe(true);
  });

  it("allows completed or skipped steps behind the resume point", () => {
    expect(
      isOnboardingStepNavDisabled("restaurant_profile", {
        orgId: "org-1",
        restaurantId: "r-1",
        resumeStep: "voice_agent",
        stepStatus: statuses({
          restaurant_profile: "completed",
          menu_import: "skipped",
        }),
      })
    ).toBe(false);
  });
});
