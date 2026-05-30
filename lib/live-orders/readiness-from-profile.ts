import { buildEnvSecretRows } from "@/lib/voice-agent/control-center";
import type { VoiceAgentConnectionStatus } from "@/lib/voice-agent/control-center-types";
import {
  menuAutoSyncFromProfile,
  type MenuAutoSyncSnapshot,
} from "@/lib/voice-agent/menu-auto-sync-display";
import type { RestaurantProfile } from "@/lib/types";

export type PhoneAgentReadinessSnapshot = {
  agentLinked: boolean;
  connectionStatus: VoiceAgentConnectionStatus;
  connectionLabel: string;
  menuAutoSync: MenuAutoSyncSnapshot;
  menuSyncLabel: string;
  envReady: boolean;
};

const CONNECTION_LABEL: Record<VoiceAgentConnectionStatus, string> = {
  connected: "Agent ready",
  misconfigured: "Needs sync",
  unreachable: "API error",
  disconnected: "Not connected",
};

export function deriveProfileConnectionStatus(
  profile: Pick<
    RestaurantProfile,
    | "elevenlabs_agent_id"
    | "elevenlabs_last_sync_at"
    | "elevenlabs_last_sync_error"
  >
): VoiceAgentConnectionStatus {
  const agentId = profile.elevenlabs_agent_id?.trim();
  if (!agentId) return "disconnected";
  if (profile.elevenlabs_last_sync_error?.trim()) return "misconfigured";
  if (profile.elevenlabs_last_sync_at) return "connected";
  return "misconfigured";
}

export function menuSyncLabelFromSnapshot(
  menu: MenuAutoSyncSnapshot
): string {
  if (!menu.agentLinked) return "Link agent first";
  if (menu.status === "syncing") return "Menu syncing";
  if (menu.status === "failed") return "Menu sync error";
  if (menu.status === "succeeded" && menu.lastSyncedAt) return "Menu synced";
  if (menu.agentLinked) return "Menu not synced";
  return "—";
}

export function phoneAgentReadinessFromProfile(
  profile: Pick<
    RestaurantProfile,
    | "elevenlabs_agent_id"
    | "elevenlabs_last_sync_at"
    | "elevenlabs_last_sync_error"
    | "elevenlabs_menu_auto_sync_status"
    | "elevenlabs_menu_auto_sync_error"
  >
): PhoneAgentReadinessSnapshot {
  const menuAutoSync = menuAutoSyncFromProfile(profile);
  const connectionStatus = deriveProfileConnectionStatus(profile);
  const envReady = buildEnvSecretRows()
    .filter((row) => row.required)
    .every((row) => row.ok);

  return {
    agentLinked: menuAutoSync.agentLinked,
    connectionStatus,
    connectionLabel: CONNECTION_LABEL[connectionStatus],
    menuAutoSync,
    menuSyncLabel: menuSyncLabelFromSnapshot(menuAutoSync),
    envReady,
  };
}
