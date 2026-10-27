import {
  getOrganizationOnboarding,
  getRestaurantOnboarding,
  ensureOrganizationOnboarding,
  ensureRestaurantOnboarding,
  updateOrganizationOnboardingStep,
  updateRestaurantOnboardingStep,
  completeOrganizationAccountStep,
  organizationOnboardingProgress,
  restaurantOnboardingProgress,
} from "@/lib/onboarding/helpers";
import type {
  OrganizationOnboardingStepKey,
  RestaurantOnboardingStepKey,
} from "@/lib/onboarding/steps";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";
import { getDb } from "@/lib/db";

export async function getOrganizationOnboardingForOrg(organizationId: string) {
  const supabase = getDb();
  return getOrganizationOnboarding(supabase, organizationId);
}

export async function getRestaurantOnboardingForRestaurant(restaurantId: string) {
  const supabase = getDb();
  return getRestaurantOnboarding(supabase, restaurantId);
}

export async function ensureOrganizationOnboardingForOrg(organizationId: string) {
  const supabase = getDb();
  return ensureOrganizationOnboarding(supabase, organizationId);
}

export async function ensureRestaurantOnboardingForRestaurant(
  restaurantId: string,
  organizationId: string
) {
  const supabase = getDb();
  return ensureRestaurantOnboarding(supabase, restaurantId, organizationId);
}

export async function setOrganizationOnboardingStep(
  organizationId: string,
  stepKey: OrganizationOnboardingStepKey,
  status: OnboardingStepStatus,
  metadata?: Record<string, unknown>
) {
  const supabase = getDb();
  return updateOrganizationOnboardingStep(
    supabase,
    organizationId,
    stepKey,
    status,
    metadata
  );
}

export async function setRestaurantOnboardingStep(
  restaurantId: string,
  organizationId: string,
  stepKey: RestaurantOnboardingStepKey,
  status: OnboardingStepStatus,
  metadata?: Record<string, unknown>
) {
  const supabase = getDb();
  return updateRestaurantOnboardingStep(
    supabase,
    restaurantId,
    organizationId,
    stepKey,
    status,
    metadata
  );
}

export async function completeOrganizationAccountStepForOrg(
  organizationId: string
) {
  const supabase = getDb();
  return completeOrganizationAccountStep(supabase, organizationId);
}

export {
  organizationOnboardingProgress,
  restaurantOnboardingProgress,
};
