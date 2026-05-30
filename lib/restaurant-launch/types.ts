export type LaunchChecklistStatus = "ok" | "pending" | "error";

export type LaunchChecklistItemId =
  | "profile_complete"
  | "menu_has_items"
  | "hours_set"
  | "agent_provisioned"
  | "tools_synced"
  | "conversation_init_webhook"
  | "test_call_passed";

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
