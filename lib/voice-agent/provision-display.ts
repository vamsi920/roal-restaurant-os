import type { VoiceAgentProvisionApiResult } from "@/lib/voice-agent/provision-restaurant-voice-agent";
import type { ElevenLabsProvisionStatus } from "@/lib/types";

export type VoiceProvisionUiState =
  | "ready"
  | "in_progress"
  | "needs_attention"
  | "not_started";

export type RestaurantProfileProvisionFields = {
  elevenlabs_provision_status: ElevenLabsProvisionStatus | null;
  elevenlabs_provision_error: string | null;
  elevenlabs_agent_id: string | null;
};

export function restaurantLiveOrdersHref(restaurantId: string): string {
  return `/dashboard/restaurants/${restaurantId}`;
}

export function restaurantVoiceAgentHref(restaurantId: string): string {
  return `/dashboard/restaurants/${restaurantId}/agent`;
}

export function restaurantMenuSetupHref(restaurantId: string): string {
  return `/dashboard/restaurants/${restaurantId}/menu`;
}

export function parseVoiceAgentProvisionApiResult(
  raw: unknown
): VoiceAgentProvisionApiResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.ok === true && typeof row.agent_id === "string") {
    const method = row.method;
    if (method !== "duplicate" && method !== "create") return null;
    return {
      ok: true,
      agent_id: row.agent_id,
      method,
    };
  }
  if (row.ok === false && typeof row.warning === "string") {
    if (row.skipped === true) {
      return { ok: false, warning: row.warning, skipped: true };
    }
    const phase = row.phase;
    if (phase !== "provision" && phase !== "sync") return null;
    const agentId =
      row.agent_id === null || typeof row.agent_id === "string"
        ? row.agent_id
        : null;
    return {
      ok: false,
      warning: row.warning,
      phase,
      agent_id: agentId,
    };
  }
  return null;
}

export function isVoiceProvisionApiFailure(
  provision: VoiceAgentProvisionApiResult | null | undefined
): boolean {
  return Boolean(
    provision && provision.ok === false && !("skipped" in provision && provision.skipped)
  );
}

export function resolvePostCreateRestaurantHref(
  restaurantId: string,
  provision: VoiceAgentProvisionApiResult | null | undefined
): string {
  if (
    isVoiceProvisionApiFailure(provision) ||
    (provision &&
      provision.ok === false &&
      "skipped" in provision &&
      provision.skipped)
  ) {
    return restaurantVoiceAgentHref(restaurantId);
  }
  return restaurantLiveOrdersHref(restaurantId);
}

export function voiceProvisionUiStateFromProfile(
  profile: RestaurantProfileProvisionFields | null | undefined
): VoiceProvisionUiState {
  if (!profile) return "not_started";

  const status = profile.elevenlabs_provision_status;
  if (status === "ready" && profile.elevenlabs_agent_id?.trim()) {
    return "ready";
  }
  if (status === "failed") return "needs_attention";
  if (status === "pending" || status === "provisioning") return "in_progress";

  if (profile.elevenlabs_agent_id?.trim()) return "ready";

  if (profile.elevenlabs_provision_error?.trim()) return "needs_attention";

  return "not_started";
}

export function voiceProvisionBadgeLabel(state: VoiceProvisionUiState): string | null {
  switch (state) {
    case "ready":
      return "Voice ready";
    case "in_progress":
      return "Voice setup…";
    case "needs_attention":
      return "Voice setup needed";
    default:
      return null;
  }
}

export function voiceProvisionBadgeTitle(
  state: VoiceProvisionUiState,
  profile: RestaurantProfileProvisionFields | null | undefined
): string | undefined {
  if (state === "needs_attention" && profile?.elevenlabs_provision_error?.trim()) {
    return profile.elevenlabs_provision_error.trim();
  }
  if (state === "needs_attention") {
    return "Open Live Agent to finish voice setup";
  }
  if (state === "in_progress") {
    return "Voice agent is being configured";
  }
  return undefined;
}

export function resolveRestaurantCardHref(
  restaurantId: string,
  profile: RestaurantProfileProvisionFields | null | undefined
): string {
  const state = voiceProvisionUiStateFromProfile(profile);
  if (state === "needs_attention" || state === "in_progress") {
    return restaurantVoiceAgentHref(restaurantId);
  }
  return restaurantLiveOrdersHref(restaurantId);
}

export function voiceProvisionNoticeFromApi(
  provision: VoiceAgentProvisionApiResult | null | undefined
): string | null {
  if (!provision || provision.ok === true) return null;
  if ("skipped" in provision && provision.skipped) {
    return provision.warning;
  }
  return provision.warning;
}
