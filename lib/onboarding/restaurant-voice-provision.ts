import {
  areToolsSynced,
  parseVoiceAgentSyncSummary,
} from "@/lib/restaurant-launch/evaluate-checklist";
import type { RestaurantProfileProvisionFields } from "@/lib/voice-agent/provision-display";
import {
  voiceProvisionUiStateFromProfile,
  type VoiceProvisionUiState,
} from "@/lib/voice-agent/provision-display";

export type OnboardingRestaurantVoiceProvision = {
  uiState: VoiceProvisionUiState;
  agentId: string | null;
  provisionError: string | null;
  lastSyncError: string | null;
  lastSyncAt: string | null;
  toolsSynced: boolean;
};

export function onboardingVoiceProvisionFromProfile(
  profile: RestaurantProfileProvisionFields | null | undefined
): OnboardingRestaurantVoiceProvision {
  return {
    uiState: voiceProvisionUiStateFromProfile(profile),
    agentId: profile?.elevenlabs_agent_id?.trim() || null,
    provisionError: profile?.elevenlabs_provision_error?.trim() || null,
    lastSyncError: null,
    lastSyncAt: null,
    toolsSynced: false,
  };
}

export function onboardingVoiceProvisionFromProfileRow(
  profile: (RestaurantProfileProvisionFields & {
    elevenlabs_last_sync_error?: string | null;
    elevenlabs_last_sync_at?: string | null;
    elevenlabs_last_sync_summary?: unknown;
  }) | null | undefined
): OnboardingRestaurantVoiceProvision {
  const base = onboardingVoiceProvisionFromProfile(profile);
  const syncSummary = parseVoiceAgentSyncSummary(
    profile?.elevenlabs_last_sync_summary ?? null
  );
  const lastSyncError = profile?.elevenlabs_last_sync_error?.trim() || null;
  return {
    ...base,
    lastSyncError,
    lastSyncAt: profile?.elevenlabs_last_sync_at?.trim() || null,
    toolsSynced: areToolsSynced(syncSummary, lastSyncError),
  };
}
