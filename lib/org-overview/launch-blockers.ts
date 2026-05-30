import type { OrgLaunchBlocker, OrgLaunchBlockerCode } from "@/lib/org-overview/types";
import {
  restaurantLiveOrdersHref,
  restaurantVoiceAgentHref,
} from "@/lib/voice-agent/provision-display";
import type { VoiceProvisionUiState } from "@/lib/voice-agent/provision-display";
import type { MenuAutoSyncUiPhase } from "@/lib/voice-agent/menu-auto-sync-display";

export type LaunchBlockerInput = {
  restaurantId: string;
  voiceProvisionState: VoiceProvisionUiState;
  menuSyncPhase: MenuAutoSyncUiPhase;
  lastVoiceSyncError: string | null;
  menuItemCount: number;
  hoursConfigured: boolean;
  stuckOrderCount: number;
};

const BLOCKER_PRIORITY: OrgLaunchBlockerCode[] = [
  "voice_provision_failed",
  "voice_agent_missing",
  "menu_sync_failed",
  "voice_sync_error",
  "menu_empty",
  "hours_not_set",
];

export function buildRestaurantLaunchBlockers(
  input: LaunchBlockerInput
): OrgLaunchBlocker[] {
  const menuHref = `/dashboard/restaurants/${input.restaurantId}/menu`;
  const agentHref = restaurantVoiceAgentHref(input.restaurantId);
  const blockers: OrgLaunchBlocker[] = [];

  if (input.voiceProvisionState === "needs_attention") {
    blockers.push({
      code: "voice_provision_failed",
      message: "Voice agent setup failed — open Live Agent to retry",
      href: agentHref,
    });
  } else if (
    input.voiceProvisionState === "not_started" ||
    input.voiceProvisionState === "in_progress"
  ) {
    blockers.push({
      code: "voice_agent_missing",
      message:
        input.voiceProvisionState === "in_progress"
          ? "Voice agent is still provisioning"
          : "Dedicated phone agent not connected",
      href: agentHref,
    });
  }

  if (input.menuSyncPhase === "failed") {
    blockers.push({
      code: "menu_sync_failed",
      message: "Menu sync to voice agent failed",
      href: menuHref,
    });
  }

  if (
    input.lastVoiceSyncError?.trim() &&
    input.voiceProvisionState === "ready"
  ) {
    blockers.push({
      code: "voice_sync_error",
      message: "Last voice agent sync reported an error",
      href: agentHref,
    });
  }

  if (input.menuItemCount === 0) {
    blockers.push({
      code: "menu_empty",
      message: "No menu items — add menu before taking calls",
      href: menuHref,
    });
  }

  if (!input.hoursConfigured) {
    blockers.push({
      code: "hours_not_set",
      message: "Weekly hours not configured",
      href: menuHref,
    });
  }

  return blockers.sort(
    (a, b) =>
      BLOCKER_PRIORITY.indexOf(a.code) - BLOCKER_PRIORITY.indexOf(b.code)
  );
}

export function restaurantNeedsAttention(
  blockers: OrgLaunchBlocker[],
  stuckOrderCount: number
): boolean {
  return blockers.length > 0 || stuckOrderCount > 0;
}

export function stuckOrdersBlockerMessage(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? "1 stuck order in kitchen queue"
    : `${count} stuck orders in kitchen queue`;
}

export function stuckOrdersHref(restaurantId: string): string {
  return restaurantLiveOrdersHref(restaurantId);
}
