export type LaunchChecklistStatus = "ok" | "pending" | "error";

export type LaunchChecklistItemId =
  | "profile_complete"
  | "menu_has_items"
  | "hours_set"
  | "server_env_ready"
  | "agent_provisioned"
  | "tools_synced"
  | "conversation_init_webhook"
  | "test_call_passed";

export type LaunchGatePhase = "ready" | "almost_ready" | "blocked";

export type LaunchChecklistItem = {
  id: LaunchChecklistItemId;
  label: string;
  status: LaunchChecklistStatus;
  detail?: string;
  href: string;
};

export type RestaurantLaunchChecklistSnapshot = {
  restaurantId: string;
  restaurantName: string;
  items: LaunchChecklistItem[];
  completedCount: number;
  totalCount: number;
  isLaunchReady: boolean;
};

export type LaunchGateSnapshot = {
  restaurantId: string;
  restaurantName: string;
  phase: LaunchGatePhase;
  phaseLabel: string;
  isLiveReady: boolean;
  topBlockerLabel: string | null;
  topBlockerDetail: string | null;
  primaryAction: { label: string; href: string };
  checklist: RestaurantLaunchChecklistSnapshot;
};
