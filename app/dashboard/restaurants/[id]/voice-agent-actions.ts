"use server";

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getPublicEnv } from "@/lib/env.public";
import { getElevenLabsAgentId } from "@/lib/env.server";
import type { ApplyRestaurantProfileResult } from "@/lib/elevenlabs-restaurant-agent-profile";
import { applyRestaurantOrderAgentProfile } from "@/lib/elevenlabs-restaurant-agent-profile";
import {
  applyElevenLabsPhonePersonalizationWebhook,
  buildConversationInitWebhookUrl,
} from "@/lib/elevenlabs/phone-personalization";
import { getElevenLabsConversationInitSecret } from "@/lib/env.server";
import {
  syncRoalElevenLabsTools,
  type SyncRoalElevenLabsToolsResult,
} from "@/lib/sync-elevenlabs-roal-tools";
import { loadVoiceAgentControlCenter } from "@/lib/voice-agent/load-control-center";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import { writeAuditLog } from "@/lib/observability/audit";
import { notifySyncFailure } from "@/lib/notifications/helpers";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import type { RestaurantProfile } from "@/lib/types";

async function loadProfile(restaurantId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle<RestaurantProfile>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Restaurant profile not found");
  return data;
}

function persistSyncSummary(
  sync: SyncRoalElevenLabsToolsResult,
  profile: ApplyRestaurantProfileResult,
  phonePersonalizationWebhook: string | null
) {
  return {
    tools: sync.tools,
    tool_ids_on_agent: sync.tool_ids_on_agent,
    restaurant_placeholders_updated:
      sync.restaurant_placeholders_updated ||
      profile.restaurant_placeholders_updated,
    first_message_updated: sync.first_message_updated,
    restaurant_tools_baked: sync.restaurant_tools_baked,
    knowledge_base_doc_attached: profile.knowledge_base_doc_attached,
    phone_personalization_webhook: phonePersonalizationWebhook,
  };
}

async function saveSyncSuccess(
  restaurantId: string,
  organizationId: string,
  userId: string,
  agentId: string,
  summary: ReturnType<typeof persistSyncSummary>
) {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("restaurant_profiles")
    .update({
      elevenlabs_agent_id: agentId,
      elevenlabs_last_sync_at: new Date().toISOString(),
      elevenlabs_last_sync_error: null,
      elevenlabs_last_sync_summary: summary,
      updated_at: new Date().toISOString(),
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
  const supabase = await createServerSupabase();
  await supabase
    .from("restaurant_profiles")
    .update({
      elevenlabs_last_sync_error: safeMessage.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);
  void notifySyncFailure(supabase, {
    organizationId,
    restaurantId,
    restaurantName,
    message,
  });
}

export async function getVoiceAgentControlCenterAction(
  restaurantId: string
): Promise<VoiceAgentControlCenterSnapshot> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const profile = await loadProfile(restaurantId);
  const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const supabaseRef = supabaseProjectRefFromUrl(supabaseUrl);

  return loadVoiceAgentControlCenter({
    restaurantId,
    restaurantName: access.access.restaurant.name,
    edgeBase: supabaseUrl.replace(/\/$/, ""),
    supabaseRef,
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

  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  try {
    const sync = await syncRoalElevenLabsTools({
      agentId,
      restaurantId,
      restaurantName,
    });
    const profile = await applyRestaurantOrderAgentProfile({
      agentId,
      restaurantId,
      restaurantName,
    });
    let phonePersonalizationWebhook: string | null = null;
    const webhookUrl = buildConversationInitWebhookUrl(
      getElevenLabsConversationInitSecret()
    );
    if (webhookUrl) {
      const phone = await applyElevenLabsPhonePersonalizationWebhook({
        agentId,
        webhookUrl,
      });
      phonePersonalizationWebhook = phone.webhook_url;
    }
    const summary = persistSyncSummary(sync, profile, phonePersonalizationWebhook);
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

export async function resyncVoiceAgentAction(
  restaurantId: string,
  restaurantName: string
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const profile = await loadProfile(restaurantId);
  const agentId =
    profile.elevenlabs_agent_id?.trim() ||
    getElevenLabsAgentId(null) ||
    "";

  if (!agentId) {
    throw new Error("No agent id saved. Connect an agent first.");
  }

  return connectVoiceAgentAction({
    agentId,
    restaurantId,
    restaurantName,
  });
}
