export type ChecklistStatus = "ok" | "warn" | "error" | "pending";

export type EnvSecretRow = {
  key: string;
  ok: boolean;
  required: boolean;
  message: string;
  hint: string | null;
};

export type ProfileVariableRow = {
  key: string;
  expected: string;
  actual: string | null;
  matches: boolean;
};

export type ToolUrlRow = {
  name: string;
  label: string;
  url: string;
  headerNote?: string;
};

export type SyncToolSummary = {
  name: string;
  id: string;
  op: "created" | "updated";
};

export type VoiceAgentConnectionStatus =
  | "disconnected"
  | "connected"
  | "misconfigured"
  | "unreachable";

import type { ElevenLabsMenuAutoSyncStatus } from "@/lib/types";

export type MenuAutoSyncSnapshot = {
  agentLinked: boolean;
  status: ElevenLabsMenuAutoSyncStatus | null;
  error: string | null;
  lastSyncedAt: string | null;
};

export type VoiceAgentControlCenterSnapshot = {
  restaurantId: string;
  restaurantName: string;
  edgeBase: string;
  supabaseRef: string | null;
  envSecrets: EnvSecretRow[];
  envReady: boolean;
  connectionStatus: VoiceAgentConnectionStatus;
  agentId: string | null;
  agentIdSource: "profile" | "env_default" | null;
  agentDisplayName: string | null;
  toolIdsOnAgent: string[];
  expectedPlaceholders: ProfileVariableRow[];
  toolUrls: ToolUrlRow[];
  lastSyncAt: string | null;
  lastSyncError: string | null;
  lastSyncTools: SyncToolSummary[];
  lastSyncPlaceholdersUpdated: boolean;
  lastSyncToolsBaked: boolean;
  lastSyncKbAttached: boolean;
  lastSyncPhoneWebhook: string | null;
  checklist: { id: string; label: string; status: ChecklistStatus; detail?: string }[];
  agentFetchError: string | null;
  menuAutoSync: MenuAutoSyncSnapshot;
};
