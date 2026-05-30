import type { MembershipRole } from "@/lib/types";
import type { VoiceProvisionUiState } from "@/lib/voice-agent/provision-display";
import type { MenuAutoSyncUiPhase } from "@/lib/voice-agent/menu-auto-sync-display";

export type OrgLaunchBlockerCode =
  | "voice_agent_missing"
  | "voice_provision_failed"
  | "menu_sync_failed"
  | "voice_sync_error"
  | "menu_empty"
  | "hours_not_set";

export type OrgLaunchBlocker = {
  code: OrgLaunchBlockerCode;
  message: string;
  href: string;
};

export type OrgRestaurantOverviewRow = {
  id: string;
  name: string;
  voiceProvisionState: VoiceProvisionUiState;
  agentConfigured: boolean;
  agentIdSuffix: string | null;
  menuSyncPhase: MenuAutoSyncUiPhase;
  menuSyncLabel: string;
  lastMenuSyncAt: string | null;
  lastVoiceSyncAt: string | null;
  lastVoiceSyncError: string | null;
  menuItemCount: number;
  hoursConfigured: boolean;
  activeOrderCount: number;
  stuckOrderCount: number;
  launchBlockers: OrgLaunchBlocker[];
  links: {
    liveOrders: string;
    menuSetup: string;
    voiceAgent: string;
    analytics: string;
  };
};

export type OrgOverviewTotals = {
  locationCount: number;
  activeOrders: number;
  stuckOrders: number;
  needsAttentionCount: number;
};

export type OrganizationOverviewSnapshot = {
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
  generatedAt: string;
  totals: OrgOverviewTotals;
  restaurants: OrgRestaurantOverviewRow[];
};

export type OrgOverviewPageSnapshot = {
  generatedAt: string;
  organizations: OrganizationOverviewSnapshot[];
};
