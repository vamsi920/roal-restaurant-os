export const ORGANIZATION_ONBOARDING_STEPS = ["account"] as const;

export const RESTAURANT_ONBOARDING_STEPS = [
  "restaurant_profile",
  "menu_import",
  "voice_agent",
  "test_call",
  "go_live",
] as const;

export type OrganizationOnboardingStepKey =
  (typeof ORGANIZATION_ONBOARDING_STEPS)[number];

export type RestaurantOnboardingStepKey =
  (typeof RESTAURANT_ONBOARDING_STEPS)[number];

export type OnboardingStepKey =
  | OrganizationOnboardingStepKey
  | RestaurantOnboardingStepKey;

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepKey, string> = {
  account: "Account",
  restaurant_profile: "Store profile",
  menu_import: "Menu",
  voice_agent: "Voice agent",
  test_call: "Test call",
  go_live: "Go live",
};

/** One line per wizard step — keep short for sidebar and panel headers. */
export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStepKey, string> = {
  account: "Sign in and name your organization.",
  restaurant_profile:
    "This location’s name, phone, timezone, and address. Hours are set in Menu setup.",
  menu_import:
    "Add items for this location — scan a photo here or finish in Menu setup.",
  voice_agent:
    "ROAL provisions a dedicated ElevenLabs agent for this location and syncs order tools.",
  test_call:
    "Run one test order for this location before you forward live guest calls.",
  go_live: "When the launch checklist is green, open Live orders for this location.",
};

/** Owner-facing launch path (account is prerequisite). */
export const ONBOARDING_LAUNCH_STEPS = [
  "Store profile",
  "Menu",
  "Voice agent",
  "Test call",
  "Go live",
] as const;
