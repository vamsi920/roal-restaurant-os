import { describe, expect, it } from "vitest";
import { resolveWizardActiveStep } from "@/lib/onboarding/wizard-state.server";
import type { OrganizationOnboardingSteps } from "@/lib/onboarding/types";

describe("resolveWizardActiveStep", () => {
  const accountDone: OrganizationOnboardingSteps = {
    account: { status: "completed" },
  };

  it("starts at account without org", () => {
    expect(
      resolveWizardActiveStep({
        hasOrganization: false,
        orgSteps: {},
        activeRestaurant: null,
        restaurantSteps: null,
      })
    ).toBe("account");
  });

  it("waits for account completion", () => {
    expect(
      resolveWizardActiveStep({
        hasOrganization: true,
        orgSteps: { account: { status: "in_progress" } },
        activeRestaurant: null,
        restaurantSteps: null,
      })
    ).toBe("account");
  });

  it("moves to restaurant_profile when no location", () => {
    expect(
      resolveWizardActiveStep({
        hasOrganization: true,
        orgSteps: accountDone,
        activeRestaurant: null,
        restaurantSteps: null,
      })
    ).toBe("restaurant_profile");
  });

  it("resumes first incomplete restaurant step", () => {
    expect(
      resolveWizardActiveStep({
        hasOrganization: true,
        orgSteps: accountDone,
        activeRestaurant: {
          id: "r1",
          name: "Test",
          organization_id: "o1",
          created_at: "",
        },
        restaurantSteps: {
          restaurant_profile: { status: "completed" },
          menu_import: { status: "pending" },
          voice_agent: { status: "pending" },
          test_call: { status: "pending" },
          go_live: { status: "pending" },
        },
      })
    ).toBe("menu_import");
  });

  it("lands on go_live when all restaurant steps terminal", () => {
    expect(
      resolveWizardActiveStep({
        hasOrganization: true,
        orgSteps: accountDone,
        activeRestaurant: {
          id: "r1",
          name: "Test",
          organization_id: "o1",
          created_at: "",
        },
        restaurantSteps: {
          restaurant_profile: { status: "completed" },
          menu_import: { status: "completed" },
          voice_agent: { status: "skipped" },
          test_call: { status: "completed" },
          go_live: { status: "pending" },
        },
      })
    ).toBe("go_live");
  });
});
