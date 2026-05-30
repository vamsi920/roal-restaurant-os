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
import {
  buildVoiceAgentSyncSummary,
  type VoiceAgentSyncSummary,
} from "@/lib/voice-agent/voice-agent-sync-summary";

export type RunRestaurantVoiceAgentSyncInput = {
  agentId: string;
  restaurantId: string;
  restaurantName: string;
};

export type RunRestaurantVoiceAgentSyncResult = {
  sync: SyncRoalElevenLabsToolsResult;
  profile: ApplyRestaurantProfileResult;
  summary: VoiceAgentSyncSummary;
};

/**
 * Bakes ROAL tools, order-taker prompt/KB, and Twilio conversation-init webhook on an agent.
 */
export async function runRestaurantVoiceAgentSync(
  input: RunRestaurantVoiceAgentSyncInput
): Promise<RunRestaurantVoiceAgentSyncResult> {
  const agentId = input.agentId.trim();
  const restaurantId = input.restaurantId.trim();
  const restaurantName = input.restaurantName.trim();

  if (!agentId) throw new Error("agentId is required");
  if (!restaurantId) throw new Error("restaurantId is required");

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
  const initSecret = getElevenLabsConversationInitSecret();
  const webhookUrl = buildConversationInitWebhookUrl(initSecret);
  if (webhookUrl) {
    const phone = await applyElevenLabsPhonePersonalizationWebhook({
      agentId,
      webhookUrl,
      initSecret,
    });
    phonePersonalizationWebhook = phone.webhook_url;
  }

  const summary = buildVoiceAgentSyncSummary(
    sync,
    profile,
    phonePersonalizationWebhook
  );

  return { sync, profile, summary };
}
