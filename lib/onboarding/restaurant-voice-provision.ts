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
};

export function onboardingVoiceProvisionFromProfile(
  profile: RestaurantProfileProvisionFields | null | undefined
): OnboardingRestaurantVoiceProvision {
  return {
    uiState: voiceProvisionUiStateFromProfile(profile),
    agentId: profile?.elevenlabs_agent_id?.trim() || null,
    provisionError: profile?.elevenlabs_provision_error?.trim() || null,
    lastSyncError: null,
  };
}

export function onboardingVoiceProvisionFromProfileRow(
  profile: (RestaurantProfileProvisionFields & {
    elevenlabs_last_sync_error?: string | null;
  }) | null | undefined
): OnboardingRestaurantVoiceProvision {
  const base = onboardingVoiceProvisionFromProfile(profile);
  return {
    ...base,
    lastSyncError: profile?.elevenlabs_last_sync_error?.trim() || null,
  };
}
