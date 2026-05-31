import type { OnboardingReadinessSnapshot } from "@/lib/onboarding/readiness";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { WIZARD_STEP_ORDER } from "@/lib/onboarding/wizard-types";

export function onboardingStepIndex(key: OnboardingStepKey): number {
  return WIZARD_STEP_ORDER.indexOf(key);
}

function stepRequiresRestaurant(key: OnboardingStepKey): boolean {
  return key !== "account" && key !== "restaurant_profile";
}

function readinessBlocksVoiceAgent(
  readiness: OnboardingReadinessSnapshot | null | undefined
): boolean {
  if (!readiness) return false;
  return (
    readiness.blockers.includes("missing_menu") ||
    readiness.blockers.includes("missing_hours")
  );
}

/** Block jumping ahead of the server resume step (completed/skipped steps stay reachable). */
export function isOnboardingStepNavDisabled(
  key: OnboardingStepKey,
  input: {
    orgId: string | null;
    restaurantId: string | null;
    resumeStep: OnboardingStepKey;
    stepStatus: (key: OnboardingStepKey) => OnboardingStepStatus;
    readiness?: OnboardingReadinessSnapshot | null;
    menuItemCount?: number;
  }
): boolean {
  if (key !== "account" && !input.orgId) return true;
  if (stepRequiresRestaurant(key) && !input.restaurantId) return true;

  const status = input.stepStatus(key);
  if (status === "completed" || status === "skipped") return false;

  if (
    key === "voice_agent" &&
    ((input.menuItemCount ?? 0) < 1 || readinessBlocksVoiceAgent(input.readiness))
  ) {
    return onboardingStepIndex(key) > onboardingStepIndex(input.resumeStep);
  }

  return onboardingStepIndex(key) > onboardingStepIndex(input.resumeStep);
}
