import type { VoiceProvisionUiState } from "@/lib/voice-agent/provision-display";
import type { RestaurantProfileProvisionFields } from "@/lib/voice-agent/provision-display";
import type { MenuAutoSyncUiPhase } from "@/lib/voice-agent/menu-auto-sync-display";

export type RestaurantCardStats = {
  restaurantId: string;
  agentLinked: boolean;
  voiceProvisionState: VoiceProvisionUiState;
  menuSyncPhase: MenuAutoSyncUiPhase;
  menuItemCount: number;
  activeCallCount: number;
  openFollowUpCount: number;
  openReservationCount: number;
  successfulOrdersInPeriod: number;
  lastOrderAt: string | null;
  syncError: string | null;
  readyForCalls: boolean;
  needsSetupAttention: boolean;
  nextBestAction: LocationNextBestAction;
};

export type PortfolioSummary = {
  totalLocations: number;
  locationsReadyForCalls: number;
  activeCallsNow: number;
  successfulOrdersInPeriod: number;
  openFollowUps: number;
  openReservationRequests: number;
  locationsNeedingAttention: number;
};

export type LocationNextBestAction = {
  label: string;
  href: string;
};

export type RestaurantListProfileLaunchFields = {
  phone: string | null;
  timezone: string | null;
  address_line1: string | null;
  allows_pickup: boolean;
  allows_delivery: boolean;
};

export type RestaurantListProfile = RestaurantProfileProvisionFields &
  RestaurantListProfileLaunchFields & {
    restaurant_id: string;
    elevenlabs_last_sync_error?: string | null;
    elevenlabs_menu_auto_sync_status?: string | null;
    elevenlabs_menu_auto_sync_error?: string | null;
    elevenlabs_last_sync_at?: string | null;
    elevenlabs_last_sync_summary?: unknown | null;
  };
