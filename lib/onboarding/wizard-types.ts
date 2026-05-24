import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import type {
  OnboardingProgressSummary,
  OrganizationOnboarding,
  RestaurantOnboarding,
} from "@/lib/onboarding/types";
import type { Restaurant } from "@/lib/types";

export const WIZARD_STEP_ORDER: OnboardingStepKey[] = [
  "account",
  "restaurant_profile",
  "menu_import",
  "voice_agent",
  "test_call",
  "go_live",
];

export type OnboardingWizardState = {
  userEmail: string | null;
  organization: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  organizationOnboarding: OrganizationOnboarding | null;
  orgProgress: OnboardingProgressSummary;
  restaurants: Pick<Restaurant, "id" | "name" | "organization_id">[];
  activeRestaurant: Restaurant | null;
  restaurantOnboarding: RestaurantOnboarding | null;
  restaurantProgress: OnboardingProgressSummary;
  menuCategoryCount: number;
  activeRestaurantProfile: {
    phone: string | null;
    timezone: string;
    address_line1: string | null;
  } | null;
  activeStep: OnboardingStepKey;
  supabaseRef: string | null;
  edgeBase: string | null;
};
