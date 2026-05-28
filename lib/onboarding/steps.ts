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
  restaurant_profile: "Add restaurant",
  menu_import: "Upload menu",
  voice_agent: "Connect agent",
  test_call: "Test call",
  go_live: "Open live orders",
};

/** One line per wizard step — keep short for sidebar and panel headers. */
export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStepKey, string> = {
  account: "Sign in and name your organization.",
  restaurant_profile:
    "Store name, phone, and timezone. Hours live on the kitchen screen after setup.",
  menu_import: "Scan a menu photo, or skip and add items in Menu & agent later.",
  voice_agent: "Paste your ElevenLabs agent id, or skip and connect later.",
  test_call: "Optional: one test order on your kitchen screen.",
  go_live: "Mark setup done and open Live orders.",
};

/** Owner-facing launch path (account is prerequisite). */
export const ONBOARDING_LAUNCH_STEPS = [
  "Add restaurant",
  "Upload menu",
  "Connect agent",
  "Open live orders",
] as const;
