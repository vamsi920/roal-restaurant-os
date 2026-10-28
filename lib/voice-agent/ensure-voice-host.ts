import type { Db } from "@/lib/db";
import { getElevenLabsAgentId } from "@/lib/env.server";
import {
  areToolsSynced,
  isDedicatedAgentProvisioned,
  parseVoiceAgentSyncSummary,
} from "@/lib/restaurant-launch/evaluate-checklist";
import type { RestaurantProfile } from "@/lib/types";
import { tryProvisionVoiceAgentForNewRestaurant } from "@/lib/voice-agent/provision-restaurant-voice-agent";

/**
 * Owners never set up the phone host by hand. Creating a restaurant only queues it; the
 * dashboard then calls this (its own request, so it gets a full function budget) and we
 * create the dedicated host, link the menu and tools, and keep it in sync. Idempotent:
 * a host that is already set up costs one profile read.
 */

export type VoiceHostState = "ready" | "setting_up" | "failed";

/** A second dashboard tab shouldn't clone a second host while the first is still working. */
const SETUP_LOCK_MS = 90_000;

export function voiceHostStateFromProfile(
  profile: Pick<
    RestaurantProfile,
    | "elevenlabs_agent_id"
    | "elevenlabs_provision_status"
    | "elevenlabs_last_sync_summary"
    | "elevenlabs_last_sync_error"
  > | null,
  templateAgentId: string | null
): VoiceHostState {
  if (!profile) return "setting_up";
  const ready =
    isDedicatedAgentProvisioned(profile as RestaurantProfile, templateAgentId) &&
    areToolsSynced(parseVoiceAgentSyncSummary(profile.elevenlabs_last_sync_summary), profile.elevenlabs_last_sync_error);
  if (ready) return "ready";
  return profile.elevenlabs_provision_status === "failed" ? "failed" : "setting_up";
}

export async function ensureRestaurantVoiceHost(
  db: Db,
  input: { restaurantId: string; userId: string },
  deps: { provision?: typeof tryProvisionVoiceAgentForNewRestaurant; now?: () => number } = {}
): Promise<{ state: VoiceHostState; started: boolean }> {
  const provision = deps.provision ?? tryProvisionVoiceAgentForNewRestaurant;
  const now = deps.now ?? Date.now;

  const { data: restaurant } = await db
    .from("restaurants")
    .select("id, name, organization_id")
    .eq("id", input.restaurantId)
    .maybeSingle();
  if (!restaurant) throw new Error("Restaurant not found");

  const { data: profile } = await db
    .from("restaurant_profiles")
    .select("*")
    .eq("restaurant_id", input.restaurantId)
    .maybeSingle<RestaurantProfile & { voice_host_setup_started_at?: string | null }>();

  const template = getElevenLabsAgentId();
  const current = voiceHostStateFromProfile(profile ?? null, template);
  if (current === "ready") return { state: "ready", started: false };

  const startedAt = profile?.voice_host_setup_started_at ? Date.parse(profile.voice_host_setup_started_at) : 0;
  if (startedAt && now() - startedAt < SETUP_LOCK_MS) return { state: "setting_up", started: false };

  if (profile) {
    await db
      .from("restaurant_profiles")
      .update({ voice_host_setup_started_at: new Date(now()).toISOString() })
      .eq("restaurant_id", input.restaurantId);
  }

  // Creates the dedicated host if missing (or reuses it) and syncs menu, tools and call-in setup.
  const result = await provision({
    restaurantId: restaurant.id as string,
    restaurantName: restaurant.name as string,
    organizationId: restaurant.organization_id as string,
    userId: input.userId,
  });

  await db
    .from("restaurant_profiles")
    .update({ voice_host_setup_started_at: null })
    .eq("restaurant_id", input.restaurantId);

  return { state: result.ok ? "ready" : "failed", started: true };
}
