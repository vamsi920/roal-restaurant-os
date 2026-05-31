import { buildRestaurantLaunchBlockers } from "@/lib/org-overview/launch-blockers";
import type { LocationNextBestAction } from "@/lib/restaurant-list/types";
import type { MenuAutoSyncUiPhase } from "@/lib/voice-agent/menu-auto-sync-display";
import {
  restaurantLiveOrdersHref,
  restaurantMenuSetupHref,
  restaurantVoiceAgentHref,
  type VoiceProvisionUiState,
} from "@/lib/voice-agent/provision-display";

export function resolveLocationNextBestAction(input: {
  restaurantId: string;
  voiceProvisionState: VoiceProvisionUiState;
  menuSyncPhase: MenuAutoSyncUiPhase;
  menuItemCount: number;
  syncError: string | null;
  activeCallCount: number;
  openFollowUpCount: number;
  openReservationCount: number;
  hoursConfigured: boolean;
}): LocationNextBestAction {
  const ordersHref = restaurantLiveOrdersHref(input.restaurantId);
  const menuHref = restaurantMenuSetupHref(input.restaurantId);
  const agentHref = restaurantVoiceAgentHref(input.restaurantId);
  const callsHref = restaurantCallsHref(input.restaurantId);

  const blockers = buildRestaurantLaunchBlockers({
    restaurantId: input.restaurantId,
    voiceProvisionState: input.voiceProvisionState,
    menuSyncPhase: input.menuSyncPhase,
    lastVoiceSyncError: input.syncError,
    menuItemCount: input.menuItemCount,
    hoursConfigured: input.hoursConfigured,
    stuckOrderCount: 0,
  });

  const setupBlocker = blockers[0];
  if (setupBlocker) {
    if (
      setupBlocker.code === "voice_provision_failed" ||
      setupBlocker.code === "voice_agent_missing"
    ) {
      return { label: "Finish voice agent setup", href: agentHref };
    }
    if (
      setupBlocker.code === "menu_sync_failed" ||
      setupBlocker.code === "voice_sync_error"
    ) {
      return { label: "Fix menu sync", href: menuHref };
    }
    if (setupBlocker.code === "menu_empty") {
      return { label: "Add menu items", href: menuHref };
    }
    if (setupBlocker.code === "hours_not_set") {
      return { label: "Set weekly hours", href: menuHref };
    }
    return { label: setupBlocker.message, href: setupBlocker.href ?? agentHref };
  }

  if (input.menuSyncPhase === "syncing") {
    return { label: "Menu sync in progress", href: menuHref };
  }

  if (input.activeCallCount > 0) {
    return { label: "Review live calls", href: ordersHref };
  }

  const followUpTotal = input.openFollowUpCount + input.openReservationCount;
  if (followUpTotal > 0) {
    return { label: "Handle follow-ups and reservations", href: callsHref };
  }

  return { label: "Open orders dashboard", href: ordersHref };
}

export function restaurantCallsHref(restaurantId: string): string {
  return `/dashboard/restaurants/${restaurantId}/calls`;
}
