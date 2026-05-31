import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ONBOARDING_LAUNCH_STEPS,
  ONBOARDING_STEP_DESCRIPTIONS,
  ONBOARDING_STEP_LABELS,
} from "@/lib/onboarding/steps";

const REPO = join(import.meta.dirname, "../..");

describe("onboarding UX (launch 11)", () => {
  it("maps launch path to short step labels", () => {
    expect(ONBOARDING_LAUNCH_STEPS).toEqual([
      "Store profile",
      "Menu",
      "Voice agent",
      "Test call",
      "Go live",
    ]);
    expect(ONBOARDING_STEP_LABELS.restaurant_profile).toBe("Store profile");
    expect(ONBOARDING_STEP_LABELS.menu_import).toBe("Menu");
    expect(ONBOARDING_STEP_LABELS.voice_agent).toBe("Voice agent");
    expect(ONBOARDING_STEP_LABELS.go_live).toBe("Go live");
  });

  it("does not promise hours UI in restaurant profile step copy", () => {
    const copy = ONBOARDING_STEP_DESCRIPTIONS.restaurant_profile;
    expect(copy).not.toMatch(/\bhours\b.*\band\b.*\bphone\b/i);
    expect(copy).toMatch(/Menu setup/i);
  });

  it("wizard supports menu and test-call skip", () => {
    const wizard = readFileSync(
      join(REPO, "components/onboarding/onboarding-wizard.tsx"),
      "utf8"
    );
    expect(wizard).toContain('step: "menu_import"');
    expect(wizard).toContain('status: "skipped"');
    expect(wizard).toContain('step: "test_call"');
    expect(wizard).toContain("OnboardingVoiceAgentStep");
    const voiceStep = readFileSync(
      join(REPO, "components/onboarding/onboarding-voice-agent-step.tsx"),
      "utf8"
    );
    expect(voiceStep).toContain("retryRestaurantVoiceAgentProvisionAction");
    expect(voiceStep).toContain("syncRestaurantVoiceAgentOnboardingAction");
    expect(wizard).toContain("OnboardingReadinessPanel");
    expect(wizard).toContain("Skip for now");
    expect(wizard).toContain("isOnboardingStepNavDisabled");
    expect(wizard).toContain('role="alert"');
    expect(wizard).toContain("ONBOARDING_LAUNCH_STEPS");
    expect(wizard).toContain("RESTAURANT_LIVE_ORDERS_LABEL");
    expect(wizard).not.toMatch(/\bKDS\b/);
  });

  it("onboarding page redirects guests to login with next", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/onboarding/page.tsx"),
      "utf8"
    );
    expect(page).toContain("/login?next=/dashboard/onboarding");
  });
});
