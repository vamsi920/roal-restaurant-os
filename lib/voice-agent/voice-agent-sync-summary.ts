import type { ApplyRestaurantProfileResult } from "@/lib/elevenlabs-restaurant-agent-profile";
import type { SyncRoalElevenLabsToolsResult } from "@/lib/sync-elevenlabs-roal-tools";

/** Persisted on `restaurant_profiles.elevenlabs_last_sync_summary` after connect/provision sync. */
export type VoiceAgentSyncSummary = {
  tools: SyncRoalElevenLabsToolsResult["tools"];
  tool_ids_on_agent: string[];
  restaurant_placeholders_updated: boolean;
  first_message_updated: boolean;
  restaurant_tools_baked: boolean;
  knowledge_base_doc_attached: boolean;
  phone_personalization_webhook: string | null;
};

export function buildVoiceAgentSyncSummary(
  sync: SyncRoalElevenLabsToolsResult,
  profile: ApplyRestaurantProfileResult,
  phonePersonalizationWebhook: string | null
): VoiceAgentSyncSummary {
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
