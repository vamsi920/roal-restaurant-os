"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getElevenLabsAgentId } from "@/lib/env.server";
import { resolveDedicatedElevenLabsAgentId } from "@/lib/voice-agent/dedicated-agent-id";
import { loadVoiceAgentControlCenter } from "@/lib/voice-agent/load-control-center";
import { runRestaurantVoiceAgentSync } from "@/lib/voice-agent/run-restaurant-voice-agent-sync";
import type { VoiceAgentSyncSummary } from "@/lib/voice-agent/voice-agent-sync-summary";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
import {
  menuAutoSyncFromProfile,
  type MenuAutoSyncSnapshot,
} from "@/lib/voice-agent/menu-auto-sync-display";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import {
  syncRestaurantAgentAfterContentChange,
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS,
} from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";
import { writeAuditLog } from "@/lib/observability/audit";
import { notifySyncFailure } from "@/lib/notifications/helpers";
import { getDb } from "@/lib/db";
import type { RestaurantProfile } from "@/lib/types";

async function loadProfile(restaurantId: string) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle<RestaurantProfile>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Restaurant profile not found");
  return data;
}

async function saveSyncSuccess(
  restaurantId: string,
  organizationId: string,
  userId: string,
  agentId: string,
  summary: VoiceAgentSyncSummary
) {
  const supabase = getDb();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("restaurant_profiles")
    .update({
      elevenlabs_agent_id: agentId,
      elevenlabs_provision_status: "ready",
      elevenlabs_provision_error: null,
      elevenlabs_provisioned_at: now,
      elevenlabs_menu_auto_sync_status: "succeeded",
      elevenlabs_menu_auto_sync_error: null,
      elevenlabs_last_sync_at: now,
      elevenlabs_last_sync_error: null,
      elevenlabs_last_sync_summary: summary,
      updated_at: now,
    })
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(error.message);

  void writeAuditLog(supabase, {
    organizationId,
    restaurantId,
    userId,
    action: "voice_agent.sync_success",
    resourceType: "restaurant_profile",
    resourceId: restaurantId,
    outcome: "success",
    metadata: { agent_id: agentId, summary },
  });
}

async function saveSyncFailure(
  restaurantId: string,
  restaurantName: string,
  organizationId: string,
  userId: string,
  message: string
) {
  const safeMessage =
    sanitizeVoiceAgentDisplayError(message) ?? "Sync failed";
  const supabase = getDb();
  const profile = await loadProfile(restaurantId);
  const previousError = profile.elevenlabs_last_sync_error?.trim() || null;

  await supabase
    .from("restaurant_profiles")
    .update({
      elevenlabs_last_sync_error: safeMessage.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  if (!previousError) {
    void notifySyncFailure(supabase, {
      organizationId,
      restaurantId,
      restaurantName,
      message: safeMessage,
    });
  }
}

export async function getVoiceAgentControlCenterAction(
  restaurantId: string
): Promise<VoiceAgentControlCenterSnapshot> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const profile = await loadProfile(restaurantId);
  return loadVoiceAgentControlCenter({
    restaurantId,
    restaurantName: access.access.restaurant.name,
    profile,
  });
}

export type ConnectVoiceAgentInput = {
  agentId: string;
  restaurantId: string;
  restaurantName: string;
};

export async function connectVoiceAgentAction(input: ConnectVoiceAgentInput) {
  const agentId = input.agentId?.trim() ?? "";
  const restaurantId = input.restaurantId?.trim() ?? "";
  const restaurantName = (input.restaurantName ?? "").trim();

  if (!agentId) throw new Error("Enter an ElevenLabs agent id.");
  if (!restaurantId) throw new Error("Missing restaurant.");

  const templateAgentId = getElevenLabsAgentId();
  if (templateAgentId && agentId === templateAgentId) {
    throw new Error(
      "Cannot connect the shared template agent to this location. Each restaurant needs a dedicated ElevenLabs agent — use auto-provision when creating a location or Retry on the voice agent step."
    );
  }

  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  // Tenant isolation: an agent already linked to another location (possibly another
  // organization) must not be re-pointed at this one — the sync below rewrites the
  // agent's prompt, tools and phone webhook.
  const { data: boundProfiles, error: boundErr } = await getDb()
    .from("restaurant_profiles")
    .select("restaurant_id")
    .eq("elevenlabs_agent_id", agentId);
  if (boundErr) throw new Error("Could not verify that agent. Try again.");
  if ((boundProfiles ?? []).some((row) => String(row.restaurant_id) !== restaurantId)) {
    throw new Error(
      "That ElevenLabs agent is already connected to another location. Use a dedicated agent for this restaurant."
    );
  }

  try {
    const { sync, profile, summary } = await runRestaurantVoiceAgentSync({
      agentId,
      restaurantId,
      restaurantName,
    });
    await saveSyncSuccess(
      restaurantId,
      access.access.restaurant.organization_id,
      access.context.user.id,
      agentId,
      summary
    );
    const center = await getVoiceAgentControlCenterAction(restaurantId);
    return { ok: true as const, center, sync, profile };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connect failed";
    const safeMessage =
      sanitizeVoiceAgentDisplayError(message) ?? "Sync failed";
    await saveSyncFailure(
      restaurantId,
      restaurantName,
      access.access.restaurant.organization_id,
      access.context.user.id,
      message
    );
    throw new Error(safeMessage);
  }
}

export type ResyncRestaurantAgentMenuResult = {
  ok: boolean;
  skipped: boolean;
  skipReason: string | null;
  error: string | null;
  menuAutoSync: MenuAutoSyncSnapshot;
};

export async function resyncRestaurantAgentMenuAction(
  restaurantId: string,
  restaurantName: string
): Promise<ResyncRestaurantAgentMenuResult> {
  return publishRestaurantVoiceContentAction(restaurantId, restaurantName);
}

export async function publishRestaurantVoiceContentAction(
  restaurantId: string,
  restaurantName: string
): Promise<ResyncRestaurantAgentMenuResult> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const name = restaurantName.trim() || access.access.restaurant.name;
  const result = await syncRestaurantAgentAfterContentChange({
    restaurantId,
    restaurantName: name,
    trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.publish_to_voice,
    userId: access.context.user.id,
  });

  for (const path of [
    `/dashboard/restaurants/${restaurantId}`,
    `/dashboard/restaurants/${restaurantId}/menu`,
    `/dashboard/restaurants/${restaurantId}/agent`,
  ]) {
    revalidatePath(path);
  }

  const profile = await loadProfile(restaurantId);
  const menuAutoSync = menuAutoSyncFromProfile(profile);

  if (result.skipped && result.skipReason === "no_linked_agent") {
    return {
      ok: false,
      skipped: true,
      skipReason: result.skipReason,
      error: "Your phone host is still being set up. Your menu is added automatically when it's ready.",
      menuAutoSync,
    };
  }

  if (!result.ok && result.error) {
    return {
      ok: false,
      skipped: result.skipped,
      skipReason: result.skipReason,
      error: sanitizeVoiceAgentDisplayError(result.error) ?? result.error,
      menuAutoSync,
    };
  }

  return {
    ok: result.ok,
    skipped: result.skipped,
    skipReason: result.skipReason,
    error: null,
    menuAutoSync,
  };
}

export async function resyncVoiceAgentAction(
  restaurantId: string,
  restaurantName: string
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const profile = await loadProfile(restaurantId);
  const agentId = resolveDedicatedElevenLabsAgentId(
    profile.elevenlabs_agent_id,
    getElevenLabsAgentId()
  );

  if (!agentId) {
    throw new Error(
      "No dedicated agent saved. Auto-provision from onboarding or Retry on the voice agent step."
    );
  }

  return connectVoiceAgentAction({
    agentId,
    restaurantId,
    restaurantName,
  });
}
