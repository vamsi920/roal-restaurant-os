import { getElevenLabsAgentId } from "@/lib/env.server";
import { getConvaiAgent } from "@/lib/elevenlabs";
import { assembleControlCenterSnapshot } from "@/lib/voice-agent/control-center";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
import { menuAutoSyncFromProfile } from "@/lib/voice-agent/menu-auto-sync-display";
import type { RestaurantProfile } from "@/lib/types";

type ProfileElevenLabsFields = Pick<
  RestaurantProfile,
  | "elevenlabs_agent_id"
  | "elevenlabs_last_sync_at"
  | "elevenlabs_last_sync_error"
  | "elevenlabs_last_sync_summary"
>;

export async function loadVoiceAgentControlCenter(input: {
  restaurantId: string;
  restaurantName: string;
  edgeBase: string;
  supabaseRef: string | null;
  profile: RestaurantProfile & Partial<ProfileElevenLabsFields>;
}): Promise<VoiceAgentControlCenterSnapshot> {
  const profileAgentId =
    (input.profile as RestaurantProfile).elevenlabs_agent_id ?? null;
  const envDefaultAgentId = getElevenLabsAgentId(null);
  const agentId = profileAgentId?.trim() || envDefaultAgentId;

  let agentRoot: unknown | null = null;
  let agentFetchError: string | null = null;

  if (agentId) {
    try {
      agentRoot = await getConvaiAgent(agentId);
    } catch (e) {
      agentFetchError =
        e instanceof Error ? e.message : "Failed to fetch ElevenLabs agent";
    }
  }

  const summary = (input.profile as RestaurantProfile)
    .elevenlabs_last_sync_summary as {
    tools?: { name: string; id: string; op: "created" | "updated" }[];
    restaurant_placeholders_updated?: boolean;
    restaurant_tools_baked?: boolean;
    knowledge_base_doc_attached?: boolean;
    phone_personalization_webhook?: string | null;
  } | null;

  const profile = input.profile as RestaurantProfile;

  return assembleControlCenterSnapshot({
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    edgeBase: input.edgeBase,
    supabaseRef: input.supabaseRef,
    profileAgentId,
    envDefaultAgentId,
    lastSyncAt: profile.elevenlabs_last_sync_at ?? null,
    lastSyncError: profile.elevenlabs_last_sync_error ?? null,
    lastSyncSummary: summary,
    menuAutoSync: menuAutoSyncFromProfile(profile),
    agentRoot,
    agentFetchError,
  });
}
