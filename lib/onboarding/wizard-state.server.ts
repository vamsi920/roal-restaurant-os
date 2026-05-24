import {
  ORGANIZATION_ONBOARDING_STEPS,
  RESTAURANT_ONBOARDING_STEPS,
} from "@/lib/onboarding/steps";
import {
  ensureOrganizationOnboarding,
  ensureRestaurantOnboarding,
  getOrganizationOnboarding,
  getRestaurantOnboarding,
  normalizeOrganizationSteps,
  organizationOnboardingProgress,
  restaurantOnboardingProgress,
} from "@/lib/onboarding/helpers";
import type {
  OnboardingProgressSummary,
  OrganizationOnboarding,
  RestaurantOnboarding,
} from "@/lib/onboarding/types";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import type { OnboardingWizardState } from "@/lib/onboarding/wizard-types";
import { getAuthContext } from "@/lib/auth/context-server";
import { getPublicEnv } from "@/lib/env.public";
import { getRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import type { Restaurant } from "@/lib/types";

function isStepTerminal(
  steps: Record<string, { status?: string } | undefined>,
  key: string
): boolean {
  const s = steps[key]?.status;
  return s === "completed" || s === "skipped";
}

export function resolveWizardActiveStep(input: {
  hasOrganization: boolean;
  orgSteps: OrganizationOnboarding["steps"];
  activeRestaurant: Restaurant | null;
  restaurantSteps: RestaurantOnboarding["steps"] | null;
}): OnboardingStepKey {
  if (!input.hasOrganization) return "account";
  if (!isStepTerminal(input.orgSteps, "account")) return "account";
  if (!input.activeRestaurant) return "restaurant_profile";

  const rSteps = input.restaurantSteps ?? {};
  for (const key of RESTAURANT_ONBOARDING_STEPS) {
    if (!isStepTerminal(rSteps, key)) return key;
  }
  return "go_live";
}

export async function loadOnboardingWizardState(
  preferredRestaurantId?: string | null
): Promise<OnboardingWizardState | null> {
  const context = await getAuthContext();
  if (!context) return null;

  const supabase = await createServerSupabase();
  const primary = context.primaryMembership;
  const organization = primary?.organization ?? null;

  let organizationOnboarding: OrganizationOnboarding | null = null;
  let orgProgress: OnboardingProgressSummary = {
    completed: 0,
    total: ORGANIZATION_ONBOARDING_STEPS.length,
    percent: 0,
    nextStep: "account",
    isComplete: false,
  };

  if (organization) {
    organizationOnboarding =
      (await getOrganizationOnboarding(supabase, organization.id)) ??
      (await ensureOrganizationOnboarding(supabase, organization.id));
    orgProgress = organizationOnboardingProgress(organizationOnboarding);
  }

  let restaurants: Pick<Restaurant, "id" | "name" | "organization_id">[] = [];
  if (organization) {
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, organization_id")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });
    restaurants = data ?? [];
  }

  let activeRestaurant: Restaurant | null = null;
  if (organization && restaurants.length > 0) {
    const pickId =
      preferredRestaurantId &&
      restaurants.some((r) => r.id === preferredRestaurantId)
        ? preferredRestaurantId
        : restaurants[0].id;
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", pickId)
      .single();
    activeRestaurant = data;
  }

  let restaurantOnboarding: RestaurantOnboarding | null = null;
  let restaurantProgress: OnboardingProgressSummary = {
    completed: 0,
    total: RESTAURANT_ONBOARDING_STEPS.length,
    percent: 0,
    nextStep: "restaurant_profile",
    isComplete: false,
  };
  let menuCategoryCount = 0;
  let activeRestaurantProfile: OnboardingWizardState["activeRestaurantProfile"] = null;

  if (activeRestaurant && organization) {
    restaurantOnboarding =
      (await getRestaurantOnboarding(supabase, activeRestaurant.id)) ??
      (await ensureRestaurantOnboarding(
        supabase,
        activeRestaurant.id,
        organization.id
      ));
    restaurantProgress = restaurantOnboardingProgress(restaurantOnboarding);

    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", activeRestaurant.id);
    menuCategoryCount = count ?? 0;

    const profile = await getRestaurantProfile(supabase, activeRestaurant.id);
    if (profile) {
      activeRestaurantProfile = {
        phone: profile.phone,
        timezone: profile.timezone,
        address_line1: profile.address_line1,
      };
    }
  }

  const orgSteps = organizationOnboarding?.steps ?? normalizeOrganizationSteps({});
  const restaurantSteps = restaurantOnboarding?.steps ?? null;

  const activeStep = resolveWizardActiveStep({
    hasOrganization: Boolean(organization),
    orgSteps,
    activeRestaurant,
    restaurantSteps,
  });

  let supabaseRef: string | null = null;
  let edgeBase: string | null = null;
  try {
    const url = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
    supabaseRef = supabaseProjectRefFromUrl(url);
    edgeBase = url.replace(/\/$/, "");
  } catch {
    /* optional */
  }

  return {
    userEmail: context.user.email ?? null,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        }
      : null,
    organizationOnboarding,
    orgProgress,
    restaurants,
    activeRestaurant,
    restaurantOnboarding,
    restaurantProgress,
    menuCategoryCount,
    activeRestaurantProfile,
    activeStep,
    supabaseRef,
    edgeBase,
  };
}
