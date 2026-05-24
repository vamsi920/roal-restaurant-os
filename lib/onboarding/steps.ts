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
  account: "Account & organization",
  restaurant_profile: "Restaurant profile",
  menu_import: "Menu import",
  voice_agent: "Voice agent",
  test_call: "Test call",
  go_live: "Go live",
};

export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStepKey, string> = {
  account: "Sign up and create your organization.",
  restaurant_profile:
    "Name, phone, timezone, and address. Set weekly hours on your kitchen workspace after setup.",
  menu_import:
    "Scan a menu photo to import items, or skip and add the menu later from your workspace.",
  voice_agent:
    "Connect your ElevenLabs agent now, or skip and connect from the kitchen workspace later.",
  test_call:
    "Optional: place a test call and confirm the order appears on your kitchen screen.",
  go_live: "Finish setup and open your kitchen display for live orders.",
};
