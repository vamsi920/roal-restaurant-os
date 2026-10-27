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
import { getDb } from "@/lib/db";
import {
  provisionRestaurantVoiceAgent,
  tryProvisionVoiceAgentForNewRestaurant,
} from "@/lib/voice-agent/provision-restaurant-voice-agent";
import { runRestaurantVoiceAgentSync } from "@/lib/voice-agent/run-restaurant-voice-agent-sync";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import { getElevenLabsAgentId, getElevenLabsAgentPhoneNumberId } from "@/lib/env.server";
import { getConvaiSignedUrl, startConvaiOutboundCall } from "@/lib/elevenlabs";
import { commitMenuToRestaurant } from "@/lib/scanner/commit-menu";
import { importWebsiteMenuFromUrl } from "@/lib/restaurant-lookup/import-website-menu";
import { loadPlaceSnapshot } from "@/lib/restaurant-lookup/places";
import { readPendingRestaurantLookup } from "@/lib/restaurant-lookup/pending";
import {
  profileInputFromSnapshot,
  saveWeeklyHoursFromLookup,
} from "@/lib/restaurant-lookup/profile";

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

  const supabase = getDb();
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
  const supabase = getDb();
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

  const supabase = getDb();
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

async function persistVoiceProvisionOnboarding(
  supabase: Awaited<ReturnType<typeof getDb>>,
  restaurantId: string,
  organizationId: string,
  provision: Awaited<ReturnType<typeof tryProvisionVoiceAgentForNewRestaurant>>,
  source: string
) {
  if (provision.ok) {
    await updateRestaurantOnboardingStep(
      supabase,
      restaurantId,
      organizationId,
      "voice_agent",
      "completed",
      { agent_id: provision.agent_id, source }
    );
  } else if ("skipped" in provision && provision.skipped) {
    await updateRestaurantOnboardingStep(
      supabase,
      restaurantId,
      organizationId,
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
      restaurantId,
      organizationId,
      "voice_agent",
      "in_progress",
      {
        provision_error: provision.warning,
        phase,
      }
    );
  }
}

export async function applyRestaurantLookupAction(input: {
  organizationId: string;
  restaurantId?: string | null;
}) {
  const { context } = await requireOrgMembership(input.organizationId);
  const pending = readPendingRestaurantLookup();
  if (!pending) {
    throw new Error("No restaurant listing saved. Search again from the homepage.");
  }

  const snapshot = await loadPlaceSnapshot(pending.placeId, pending.name);
  if (!snapshot) {
    throw new Error("Could not reload that restaurant listing. Search again.");
  }

  const supabase = getDb();
  let restaurantId = input.restaurantId?.trim() || "";
  let created = false;

  if (restaurantId) {
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id, organization_id")
      .eq("id", restaurantId)
      .maybeSingle();
    if (restErr) throw new Error(formatSupabaseClientError(restErr.message));
    if (!restaurant || restaurant.organization_id !== input.organizationId) {
      throw new Error("Restaurant does not belong to this organization.");
    }
  } else {
    const { data, error } = await supabase
      .from("restaurants")
      .insert({ name: snapshot.profile.name, organization_id: input.organizationId })
      .select("id")
      .single();
    if (error) throw new Error(formatSupabaseClientError(error.message));
    restaurantId = data.id;
    created = true;
    await ensureRestaurantOnboarding(supabase, restaurantId, input.organizationId);
  }

  const profileInput = profileInputFromSnapshot(snapshot);
  await upsertRestaurantProfile(
    supabase,
    restaurantId,
    input.organizationId,
    profileInput
  );

  if (snapshot.weekly_hours) {
    await saveWeeklyHoursFromLookup(supabase, restaurantId, snapshot.weekly_hours);
  }

  await updateRestaurantOnboardingStep(
    supabase,
    restaurantId,
    input.organizationId,
    "restaurant_profile",
    "completed",
    {
      source: "places_lookup",
      place_id: snapshot.place_id,
      phone: profileInput.phone,
      timezone: profileInput.timezone,
    }
  );

  let menuImported = false;
  let menuFallbackMessage: string | null = null;
  const imported = await importWebsiteMenuFromUrl(snapshot.profile.website);
  if (imported.ok) {
    await commitMenuToRestaurant(restaurantId, imported.menu);
    menuImported = true;
    await updateRestaurantOnboardingStep(
      supabase,
      restaurantId,
      input.organizationId,
      "menu_import",
      "completed",
      { source: "website", source_url: imported.sourceUrl }
    );
  } else {
    menuFallbackMessage = imported.message;
  }

  let provision: Awaited<ReturnType<typeof tryProvisionVoiceAgentForNewRestaurant>> | null =
    null;
  if (created) {
    provision = await tryProvisionVoiceAgentForNewRestaurant({
      restaurantId,
      restaurantName: snapshot.profile.name,
      organizationId: input.organizationId,
      userId: context.user.id,
    });
    await persistVoiceProvisionOnboarding(
      supabase,
      restaurantId,
      input.organizationId,
      provision,
      "auto_on_lookup"
    );
  }

  const profile = await getRestaurantProfile(supabase, restaurantId);
  const agentId = profile?.elevenlabs_agent_id?.trim();
  if (agentId && menuImported) {
    try {
      await runRestaurantVoiceAgentSync({
        agentId,
        restaurantId,
        restaurantName: snapshot.profile.name,
      });
    } catch (e) {
      console.error(
        "[lookup apply sync]",
        e instanceof Error ? e.message : e
      );
    }
  }

  revalidatePath("/dashboard/onboarding");
  revalidatePath(`/dashboard/restaurants/${restaurantId}`);
  return {
    restaurantId,
    menuImported,
    menuFallbackMessage,
    voiceProvision: provision,
  };
}

function toE164Phone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export async function createVoiceAgentBrowserCallAction(input: {
  restaurantId: string;
  organizationId: string;
}) {
  await requireOrgMembership(input.organizationId);
  const supabase = getDb();
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id, organization_id")
    .eq("id", input.restaurantId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseClientError(error.message));
  if (!restaurant || restaurant.organization_id !== input.organizationId) {
    throw new Error("Restaurant does not belong to this organization.");
  }
  const profile = await getRestaurantProfile(supabase, input.restaurantId);
  const agentId = profile?.elevenlabs_agent_id?.trim();
  if (!profile || !agentId) {
    throw new Error("Provision the voice agent before starting a call.");
  }
  const signedUrl = await getConvaiSignedUrl(agentId);
  return {
    signedUrl,
    agentId,
    outboundAvailable: Boolean(
      getElevenLabsAgentPhoneNumberId() && toE164Phone(profile.phone)
    ),
    restaurantPhone: profile.phone,
  };
}

export async function startVoiceAgentOutboundCallAction(input: {
  restaurantId: string;
  organizationId: string;
}) {
  await requireOrgMembership(input.organizationId);
  const phoneNumberId = getElevenLabsAgentPhoneNumberId();
  if (!phoneNumberId) {
    throw new Error("Outbound test calls are not configured.");
  }
  const supabase = getDb();
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id, organization_id")
    .eq("id", input.restaurantId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseClientError(error.message));
  if (!restaurant || restaurant.organization_id !== input.organizationId) {
    throw new Error("Restaurant does not belong to this organization.");
  }
  const profile = await getRestaurantProfile(supabase, input.restaurantId);
  const agentId = profile?.elevenlabs_agent_id?.trim();
  if (!profile || !agentId) {
    throw new Error("Provision the voice agent before starting a call.");
  }
  const toNumber = toE164Phone(profile.phone);
  if (!toNumber) {
    throw new Error("Add a valid restaurant phone number first.");
  }
  await startConvaiOutboundCall({
    agentId,
    agentPhoneNumberId: phoneNumberId,
    toNumber,
  });
  return { ok: true as const, toNumber };
}

export async function retryRestaurantVoiceAgentProvisionAction(input: {
  restaurantId: string;
  organizationId: string;
}) {
  const { context } = await requireOrgMembership(input.organizationId);
  const supabase = getDb();

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

  const supabase = getDb();
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
  const supabase = getDb();

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
  const supabase = getDb();
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
  const supabase = getDb();

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

/* ------------------------------------------------------------------------- */
/* Magic onboarding: claim a try-a-call trial into a real restaurant          */
/* ------------------------------------------------------------------------- */

export async function claimTrialAction(input: { trialId: string }) {
  const context = await getAuthContext();
  if (!context) throw new Error("Sign in to finish setup.");

  const { readPendingTrialFromCookie } = await import("@/lib/trial/auth");
  const pending = await readPendingTrialFromCookie();
  if (!pending || pending.id !== input.trialId) {
    throw new Error("That test session has expired. Start again from the homepage.");
  }

  const { claimTrial } = await import("@/lib/trial/claim");
  const supabase = getDb();
  await ensureUserProfile(supabase, context.user);

  const result = await claimTrial(supabase, {
    trialId: pending.id,
    userId: context.user.id,
    organizationId: context.primaryMembership?.organization.id ?? null,
  });

  const { cookies } = await import("next/headers");
  const { TRIAL_COOKIE_NAME } = await import("@/lib/trial/token");
  try {
    cookies().set(TRIAL_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  } catch {
    // Server action cookie writes can fail during render; cookie expires on its own.
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/restaurants");
  revalidatePath(`/dashboard/restaurants/${result.restaurantId}`);
  return result;
}

/** In-dashboard magic setup: start a trial for a signed-in user (same pipeline as the homepage). */
export async function startDashboardTrialAction(input: { input: string }) {
  const context = await getAuthContext();
  if (!context) throw new Error("Sign in to continue.");
  const { parseTrialInput } = await import("@/lib/trial/input");
  const parsed = parseTrialInput(input.input);
  if ("error" in parsed) throw new Error(parsed.error);

  const { insertTrial, toPublicView } = await import("@/lib/trial/store");
  const { encodeTrialCookie, generateTrialToken, hashTrialToken, TRIAL_COOKIE_NAME, trialCookieOptions } =
    await import("@/lib/trial/token");
  const { cookies } = await import("next/headers");

  const token = generateTrialToken();
  const trial = await insertTrial({
    tokenHash: hashTrialToken(token),
    sourceInput: parsed.kind === "name_city" ? [parsed.name, parsed.city].filter(Boolean).join(", ") : parsed.url,
    sourceKind: parsed.kind,
  });
  cookies().set(TRIAL_COOKIE_NAME, encodeTrialCookie(trial.id, token), trialCookieOptions());
  return { trial: toPublicView(trial) };
}
