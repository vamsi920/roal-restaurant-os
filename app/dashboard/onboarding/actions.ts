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
  getRestaurantOnboarding,
  updateOrganizationOnboardingStep,
  updateRestaurantOnboardingStep,
} from "@/lib/onboarding/helpers";
import type { RestaurantOnboardingStepKey } from "@/lib/onboarding/steps";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";
import { loadOnboardingWizardState } from "@/lib/onboarding/wizard-state.server";
import { emitGoLiveIfTransition } from "@/lib/notifications/operational-events";
import { loadRestaurantCardStats } from "@/lib/restaurant-list/card-stats";
import {
  getRestaurantProfile,
  upsertRestaurantProfile,
} from "@/lib/restaurant-profile/helpers";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { applyDefaultOrganizationMenuTemplate } from "@/lib/menu-editor/copy-menu";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  provisionRestaurantVoiceAgent,
  tryProvisionVoiceAgentForNewRestaurant,
} from "@/lib/voice-agent/provision-restaurant-voice-agent";
import { runRestaurantVoiceAgentSync } from "@/lib/voice-agent/run-restaurant-voice-agent-sync";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import { getElevenLabsAgentId } from "@/lib/env.server";

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
  const { context } = await requireOrgMembership(input.organizationId);
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

  await applyDefaultOrganizationMenuTemplate(supabase, {
    organizationId: input.organizationId,
    targetRestaurantId: data.id,
  });

  const provision = await tryProvisionVoiceAgentForNewRestaurant({
    restaurantId: data.id,
    restaurantName: name,
    organizationId: input.organizationId,
    userId: context.user.id,
  });

  if (provision.ok) {
    await updateRestaurantOnboardingStep(
      supabase,
      data.id,
      input.organizationId,
      "voice_agent",
      "completed",
      { agent_id: provision.agent_id, source: "auto_on_create" }
    );
  } else if ("skipped" in provision && provision.skipped) {
    await updateRestaurantOnboardingStep(
      supabase,
      data.id,
      input.organizationId,
      "voice_agent",
      "in_progress",
      {
        provision_skipped: true,
        provision_error: provision.warning,
      }
    );
  } else if (!provision.ok) {
    const phase = "phase" in provision ? provision.phase : "provision";
    await updateRestaurantOnboardingStep(
      supabase,
      data.id,
      input.organizationId,
      "voice_agent",
      "in_progress",
      {
        provision_error: provision.warning,
        phase,
      }
    );
  }

  revalidatePath("/dashboard/onboarding");
  return { restaurantId: data.id, voiceProvision: provision };
}

export async function retryRestaurantVoiceAgentProvisionAction(input: {
  restaurantId: string;
  organizationId: string;
}) {
  const { context } = await requireOrgMembership(input.organizationId);
  const supabase = await createServerSupabase();

  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name, organization_id")
    .eq("id", input.restaurantId)
    .maybeSingle();
  if (restErr) throw new Error(formatSupabaseClientError(restErr.message));
  if (!restaurant || restaurant.organization_id !== input.organizationId) {
    throw new Error("Restaurant does not belong to this organization.");
  }

  if (!getElevenLabsAgentId()) {
    throw new Error(
      "Voice agent auto-setup is not configured. Connect manually from Live Agent."
    );
  }

  await updateRestaurantOnboardingStep(
    supabase,
    input.restaurantId,
    input.organizationId,
    "voice_agent",
    "in_progress",
    { retry: true }
  );

  const result = await provisionRestaurantVoiceAgent(
    input.restaurantId,
    restaurant.name,
    input.organizationId,
    context.user.id
  );

  if (!result.ok) {
    await updateRestaurantOnboardingStep(
      supabase,
      input.restaurantId,
      input.organizationId,
      "voice_agent",
      "in_progress",
      { provision_error: result.error, phase: result.phase, agent_id: result.agentId }
    );
    revalidatePath("/dashboard/onboarding");
    throw new Error(result.error);
  }

  await updateRestaurantOnboardingStep(
    supabase,
    input.restaurantId,
    input.organizationId,
    "voice_agent",
    "completed",
    { agent_id: result.agentId, source: "onboarding_retry" }
  );

  revalidatePath("/dashboard/onboarding");
  revalidatePath(`/dashboard/restaurants/${input.restaurantId}/agent`);
  return { agentId: result.agentId };
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
    handoff_catering_route: null,
    handoff_complaint_route: null,
    handoff_unavailable_item_behavior: null,
    handoff_unavailable_item_notes: null,
    closed_hours_message: null,
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
  const { context } = await requireOrgMembership(input.organizationId);
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
      .select("id, name, organization_id")
      .eq("id", input.restaurantId)
      .maybeSingle();
    if (restErr) throw new Error(formatSupabaseClientError(restErr.message));
    if (!restaurant || restaurant.organization_id !== input.organizationId) {
      throw new Error("Restaurant does not belong to this organization.");
    }

    const onboardingBefore = await getRestaurantOnboarding(
      supabase,
      input.restaurantId
    );
    const previousGoLiveStatus = onboardingBefore?.steps.go_live?.status;

    await updateRestaurantOnboardingStep(
      supabase,
      input.restaurantId,
      input.organizationId,
      input.step as RestaurantOnboardingStepKey,
      input.status,
      input.metadata
    );

    if (input.step === "go_live" && input.status === "completed") {
      void emitGoLiveIfTransition(supabase, {
        restaurantId: input.restaurantId,
        organizationId: input.organizationId,
        restaurantName: restaurant.name as string,
        userId: context.user.id,
        previousGoLiveStatus,
      });
    }
  }

  revalidatePath("/dashboard/onboarding");
}

export async function completeMenuImportStepAction(input: {
  restaurantId: string;
  organizationId: string;
}) {
  await requireOrgMembership(input.organizationId);
  const supabase = await createServerSupabase();
  const stats = await loadRestaurantCardStats(supabase, [input.restaurantId], {});
  const menuItemCount = stats[input.restaurantId]?.menuItemCount ?? 0;

  if (menuItemCount < 1) {
    throw new Error("Add at least one menu item for this location before continuing.");
  }

  await updateRestaurantOnboardingStep(
    supabase,
    input.restaurantId,
    input.organizationId,
    "menu_import",
    "completed",
    { menu_item_count: menuItemCount }
  );

  revalidatePath("/dashboard/onboarding");
}

export async function syncRestaurantVoiceAgentOnboardingAction(input: {
  restaurantId: string;
  organizationId: string;
}) {
  await requireOrgMembership(input.organizationId);
  const supabase = await createServerSupabase();

  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name, organization_id")
    .eq("id", input.restaurantId)
    .maybeSingle();
  if (restErr) throw new Error(formatSupabaseClientError(restErr.message));
  if (!restaurant || restaurant.organization_id !== input.organizationId) {
    throw new Error("Restaurant does not belong to this organization.");
  }

  const profile = await getRestaurantProfile(supabase, input.restaurantId);
  const agentId = profile?.elevenlabs_agent_id?.trim();
  if (!agentId) {
    throw new Error("Provision the voice agent before syncing tools.");
  }

  try {
    const { summary } = await runRestaurantVoiceAgentSync({
      agentId,
      restaurantId: input.restaurantId,
      restaurantName: restaurant.name as string,
    });
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("restaurant_profiles")
      .update({
        elevenlabs_provision_status: "ready",
        elevenlabs_provision_error: null,
        elevenlabs_menu_auto_sync_status: "succeeded",
        elevenlabs_menu_auto_sync_error: null,
        elevenlabs_last_sync_at: now,
        elevenlabs_last_sync_error: null,
        elevenlabs_last_sync_summary: summary,
        updated_at: now,
      })
      .eq("restaurant_id", input.restaurantId);
    if (error) throw new Error(formatSupabaseClientError(error.message));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    const safeMessage =
      sanitizeVoiceAgentDisplayError(message) ?? "Sync failed";
    await supabase
      .from("restaurant_profiles")
      .update({
        elevenlabs_last_sync_error: safeMessage.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("restaurant_id", input.restaurantId);
    revalidatePath("/dashboard/onboarding");
    revalidatePath(`/dashboard/restaurants/${input.restaurantId}/agent`);
    throw new Error(safeMessage);
  }

  await updateRestaurantOnboardingStep(
    supabase,
    input.restaurantId,
    input.organizationId,
    "voice_agent",
    "completed",
    { agent_id: agentId, source: "onboarding_sync" }
  );

  revalidatePath("/dashboard/onboarding");
  revalidatePath(`/dashboard/restaurants/${input.restaurantId}/agent`);
  return { agentId };
}
