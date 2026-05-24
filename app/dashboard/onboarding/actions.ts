"use server";

import { revalidatePath } from "next/cache";
import {
  findMembershipForOrg,
  getAuthContext,
} from "@/lib/auth/context-server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import {
  completeOrganizationAccountStep,
  ensureOrganizationOnboarding,
  ensureRestaurantOnboarding,
  updateOrganizationOnboardingStep,
  updateRestaurantOnboardingStep,
} from "@/lib/onboarding/helpers";
import type { RestaurantOnboardingStepKey } from "@/lib/onboarding/steps";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";
import { loadOnboardingWizardState } from "@/lib/onboarding/wizard-state.server";
import { upsertRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { createServerSupabase } from "@/lib/supabase/server";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function requireOrgMembership(organizationId: string) {
  const context = await getAuthContext();
  if (!context) throw new Error("Sign in to continue onboarding.");
  const membership = findMembershipForOrg(context, organizationId);
  if (!membership) {
    throw new Error("You are not a member of that organization.");
  }
  return { context, membership };
}

export async function refreshOnboardingWizardState(restaurantId?: string | null) {
  return loadOnboardingWizardState(restaurantId);
}

export async function createOrganizationAction(input: {
  name: string;
  slug?: string;
}) {
  const context = await getAuthContext();
  if (!context) throw new Error("Sign in to create an organization.");

  const name = input.name.trim();
  if (!name) throw new Error("Organization name is required.");

  const slug = (input.slug?.trim() || slugify(name)) || slugify("org");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  }

  const supabase = await createServerSupabase();
  await ensureUserProfile(supabase, context.user);
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name, slug })
    .select("id")
    .single();

  if (orgErr) throw new Error(formatSupabaseClientError(orgErr.message));

  const { error: memberErr } = await supabase.from("memberships").insert({
    organization_id: org.id,
    user_id: context.user.id,
    role: "owner",
  });

  if (memberErr) throw new Error(formatSupabaseClientError(memberErr.message));

  await ensureOrganizationOnboarding(supabase, org.id);
  await completeOrganizationAccountStep(supabase, org.id);

  revalidatePath("/dashboard/onboarding");
  return { organizationId: org.id };
}

export async function completeAccountStepAction(organizationId: string) {
  await requireOrgMembership(organizationId);
  const supabase = await createServerSupabase();
  await completeOrganizationAccountStep(supabase, organizationId);
  revalidatePath("/dashboard/onboarding");
}

export async function createRestaurantWizardAction(input: {
  name: string;
  organizationId: string;
}) {
  await requireOrgMembership(input.organizationId);
  const name = input.name.trim();
  if (!name) throw new Error("Restaurant name is required.");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("restaurants")
    .insert({ name, organization_id: input.organizationId })
    .select("*")
    .single();

  if (error) throw new Error(formatSupabaseClientError(error.message));

  await ensureRestaurantOnboarding(supabase, data.id, input.organizationId);

  revalidatePath("/dashboard/onboarding");
  return { restaurantId: data.id };
}

export async function saveRestaurantProfileAction(input: {
  restaurantId: string;
  organizationId: string;
  name: string;
  phone?: string;
  timezone?: string;
  address?: string;
}) {
  await requireOrgMembership(input.organizationId);
  const name = input.name.trim();
  if (!name) throw new Error("Restaurant name is required.");
  const timezone = input.timezone?.trim() || "America/Chicago";
  if (!timezone) throw new Error("Timezone is required.");

  const supabase = await createServerSupabase();
  const address = input.address?.trim() || null;
  await upsertRestaurantProfile(supabase, input.restaurantId, input.organizationId, {
    name,
    phone: input.phone?.trim() || null,
    address_line1: address,
    address_line2: null,
    city: null,
    region: null,
    postal_code: null,
    country: "US",
    timezone,
    cuisine: null,
    website: null,
    allows_pickup: true,
    allows_delivery: false,
    prep_time_minutes: 20,
    tax_rate_percent: 0,
    service_fee_percent: 0,
    escalation_name: null,
    escalation_phone: null,
    escalation_email: null,
  });

  await updateRestaurantOnboardingStep(
    supabase,
    input.restaurantId,
    input.organizationId,
    "restaurant_profile",
    "completed",
    {
      phone: input.phone?.trim() || null,
      timezone,
      address,
    }
  );

  revalidatePath("/dashboard/onboarding");
}

export async function setWizardStepStatusAction(input: {
  scope: "organization" | "restaurant";
  organizationId: string;
  restaurantId?: string;
  step: string;
  status: OnboardingStepStatus;
  metadata?: Record<string, unknown>;
}) {
  await requireOrgMembership(input.organizationId);
  const supabase = await createServerSupabase();

  if (input.scope === "organization") {
    await updateOrganizationOnboardingStep(
      supabase,
      input.organizationId,
      "account",
      input.status,
      input.metadata
    );
  } else {
    if (!input.restaurantId) throw new Error("Restaurant is required.");
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("organization_id")
      .eq("id", input.restaurantId)
      .maybeSingle();
    if (restErr) throw new Error(formatSupabaseClientError(restErr.message));
    if (!restaurant || restaurant.organization_id !== input.organizationId) {
      throw new Error("Restaurant does not belong to this organization.");
    }
    await updateRestaurantOnboardingStep(
      supabase,
      input.restaurantId,
      input.organizationId,
      input.step as RestaurantOnboardingStepKey,
      input.status,
      input.metadata
    );
  }

  revalidatePath("/dashboard/onboarding");
}

export async function completeMenuImportStepAction(input: {
  restaurantId: string;
  organizationId: string;
}) {
  await requireOrgMembership(input.organizationId);
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", input.restaurantId);

  if (!count || count < 1) {
    throw new Error("Upload and scan a menu before continuing.");
  }

  await updateRestaurantOnboardingStep(
    supabase,
    input.restaurantId,
    input.organizationId,
    "menu_import",
    "completed",
    { category_count: count }
  );

  revalidatePath("/dashboard/onboarding");
}
