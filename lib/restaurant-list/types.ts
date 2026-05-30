import type { RestaurantProfileProvisionFields } from "@/lib/voice-agent/provision-display";

export type RestaurantListProfile = RestaurantProfileProvisionFields & {
  restaurant_id: string;
  elevenlabs_last_sync_error?: string | null;
  elevenlabs_menu_auto_sync_status?: string | null;
  elevenlabs_menu_auto_sync_error?: string | null;
};

export type RestaurantCardStats = {
  restaurantId: string;
  agentLinked: boolean;
  menuItemCount: number;
  lastOrderAt: string | null;
  syncError: string | null;
};
