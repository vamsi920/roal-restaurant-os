import type { Db } from "@/lib/db";
import { commitMenuToRestaurant } from "@/lib/scanner/commit-menu";
import {
  completeOrganizationAccountStep,
  ensureOrganizationOnboarding,
  ensureRestaurantOnboarding,
  updateRestaurantOnboardingStep,
} from "@/lib/onboarding/helpers";
import { replaceRestaurantKnowledgeEntries } from "@/lib/restaurant-knowledge/helpers";
import { saveWeeklyHoursFromLookup } from "@/lib/restaurant-lookup/profile";
import { upsertRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { ensureVoiceReady } from "@/lib/trial/elevenlabs";
import { getTrial, updateTrial } from "@/lib/trial/store";
import type { TrialRecord } from "@/lib/trial/types";
import { resolveTrialPersona } from "@/lib/trial/voices";
import type { VoiceAgentProvisionApiResult } from "@/lib/voice-agent/provision-restaurant-voice-agent";

export type ClaimTrialInput = {
  trialId: string;
  userId: string;
  /** Existing organization to add the restaurant to; null creates one named after the restaurant. */
  organizationId: string | null;
};

export type ClaimTrialResult = {
  restaurantId: string;
  organizationId: string;
  restaurantName: string;
  menuImported: boolean;
  menuItemCount: number;
  hoursSaved: boolean;
  knowledgeSaved: number;
  voiceProvision: VoiceAgentProvisionApiResult;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "restaurant";
}

async function createOrganizationForTrial(
  supabase: Db,
  userId: string,
  restaurantName: string
): Promise<string> {
  const slug = `${slugify(restaurantName)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: restaurantName, slug })
    .select("id")
    .single();
  if (orgErr) throw new Error(orgErr.message);

  const { error: memberErr } = await supabase.from("memberships").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
  });
  if (memberErr) throw new Error(memberErr.message);

  await ensureOrganizationOnboarding(supabase, org.id);
  await completeOrganizationAccountStep(supabase, org.id);
  return org.id as string;
}

/**
 * Promote an anonymous trial into a real restaurant: org (if needed), restaurant,
 * profile + persona, hours, menu, knowledge, onboarding steps, dedicated agent.
 * `supabase` must be the signed-in user's client (RLS), with a profile row ensured.
 */
export async function claimTrial(
  supabase: Db,
  input: ClaimTrialInput
): Promise<ClaimTrialResult> {
  const trial = await getTrial(input.trialId);
  if (!trial) throw new Error("That test session has expired. Start again from the homepage.");
  if (trial.status === "claimed" && trial.claimed_restaurant_id && trial.claimed_organization_id) {
    return {
      restaurantId: trial.claimed_restaurant_id,
      organizationId: trial.claimed_organization_id,
      restaurantName: trial.restaurant_name ?? "Restaurant",
      menuImported: false,
      menuItemCount: 0,
      hoursSaved: false,
      knowledgeSaved: 0,
      voiceProvision: { ok: false, warning: "Already claimed.", skipped: true },
    };
  }
  if (!trial.profile) {
    throw new Error("This test session never found a restaurant. Start again.");
  }

  const restaurantName = (trial.restaurant_name ?? trial.profile.name ?? "Restaurant").trim();
  if (input.organizationId) {
    const existing = await findExistingLocation(supabase, input.organizationId, trial);
    if (existing) {
      throw new Error(
        `${existing.name}${existing.address ? ` at ${existing.address}` : ""} is already in your account. ` +
          "To add another branch, paste that location's Google Maps link."
      );
    }
  }
  const organizationId =
    input.organizationId ?? (await createOrganizationForTrial(supabase, input.userId, restaurantName));

  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .insert({ name: restaurantName, organization_id: organizationId })
    .select("id")
    .single();
  if (restErr) throw new Error(restErr.message);
  const restaurantId = restaurant.id as string;

  await ensureRestaurantOnboarding(supabase, restaurantId, organizationId);

  const p = trial.profile;
  const offersDelivery = Boolean((trial.persona as { offersDelivery?: boolean }).offersDelivery);
  await upsertRestaurantProfile(supabase, restaurantId, organizationId, {
    name: restaurantName,
    phone: p.phone,
    address_line1: p.address_line1,
    address_line2: p.address_line2,
    city: p.city,
    region: p.region,
    postal_code: p.postal_code,
    country: p.country || "US",
    timezone: p.timezone || "America/Chicago",
    cuisine: p.cuisine,
    website: p.website,
    allows_pickup: true,
    allows_delivery: offersDelivery,
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

  const persona = resolveTrialPersona(trial.persona, restaurantName, trial.profile?.cuisine);
  await supabase
    .from("restaurant_profiles")
    .update({
      agent_display_name: persona.agentName,
      agent_voice_id: await ensureVoiceReady(persona.voiceId),
      agent_voice_label: persona.voiceLabel,
      trial_scorecard: trial.scorecard,
      source_trial_id: trial.id,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  await updateRestaurantOnboardingStep(
    supabase,
    restaurantId,
    organizationId,
    "restaurant_profile",
    "completed",
    { source: "trial", source_kind: trial.source_kind, place_id: trial.place_id }
  );

  let hoursSaved = false;
  if (trial.weekly_hours && trial.weekly_hours.length > 0) {
    await saveWeeklyHoursFromLookup(supabase, restaurantId, trial.weekly_hours);
    hoursSaved = true;
  }

  let knowledgeSaved = 0;
  if (trial.knowledge.length > 0) {
    const saved = await replaceRestaurantKnowledgeEntries(supabase, {
      restaurantId,
      organizationId,
      entries: trial.knowledge.map((k) => ({ ...k, is_active: true })),
    });
    knowledgeSaved = saved.length;
  }

  let menuImported = false;
  let menuItemCount = 0;
  if (trial.menu && trial.menu_source !== "sample") {
    const { stats } = await commitMenuToRestaurant(restaurantId, trial.menu);
    menuImported = stats.items > 0;
    menuItemCount = stats.items;
    await updateRestaurantOnboardingStep(
      supabase,
      restaurantId,
      organizationId,
      "menu_import",
      "completed",
      { source: trial.menu_source, source_url: trial.menu_source_url, item_count: stats.items }
    );
  }

  // Creating the dedicated host takes ~12s on top of everything above, which pushed this
  // request past the serverless time limit. The dashboard's VoiceHostKeeper creates and syncs
  // it in its own request right after the owner lands (lib/voice-agent/ensure-voice-host).
  const voiceProvision: VoiceAgentProvisionApiResult = {
    ok: false,
    skipped: true,
    warning: "Setting up the phone host in the background.",
  };
  await updateRestaurantOnboardingStep(supabase, restaurantId, organizationId, "voice_agent", "in_progress", {
    source: "trial_claim",
    queued: true,
  });

  if (trial.call_count > 0) {
    await updateRestaurantOnboardingStep(
      supabase,
      restaurantId,
      organizationId,
      "test_call",
      "completed",
      { source: "trial_browser_call", calls: trial.call_count, scorecard: trial.scorecard }
    );
  }

  await updateTrial(trial.id, {
    status: "claimed",
    claimed_restaurant_id: restaurantId,
    claimed_organization_id: organizationId,
    claimed_at: new Date().toISOString(),
  });

  return {
    restaurantId,
    organizationId,
    restaurantName,
    menuImported,
    menuItemCount,
    hoursSaved,
    knowledgeSaved,
    voiceProvision,
  };
}

const normLoc = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|suite|ste|drive|dr)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * The same restaurant at the same address already in this organization. Another branch of the
 * same brand (different address) is not a duplicate: franchises add one location per branch.
 */
export async function findExistingLocation(
  supabase: Db,
  organizationId: string,
  trial: Pick<TrialRecord, "restaurant_name" | "profile">
): Promise<{ id: string; name: string; address: string | null } | null> {
  const name = normLoc(trial.restaurant_name ?? trial.profile?.name);
  if (!name) return null;
  const { data: restaurants } = await supabase.from("restaurants").select("id, name").eq("organization_id", organizationId);
  const sameName = (restaurants ?? []).filter((r) => normLoc(r.name as string) === name);
  if (!sameName.length) return null;
  const { data: profiles } = await supabase
    .from("restaurant_profiles")
    .select("restaurant_id, address_line1")
    .in("restaurant_id", sameName.map((r) => r.id as string));
  const address = normLoc(trial.profile?.address_line1);
  for (const r of sameName) {
    const existing = (profiles ?? []).find((pr) => pr.restaurant_id === r.id)?.address_line1 as string | null | undefined;
    // Same address, or neither side knows its address: treat as the same location.
    if (normLoc(existing) === address) return { id: r.id as string, name: r.name as string, address: existing ?? null };
  }
  return null;
}

export function trialNeedsClaim(trial: TrialRecord | null): boolean {
  return Boolean(trial && trial.status !== "claimed" && trial.profile);
}
