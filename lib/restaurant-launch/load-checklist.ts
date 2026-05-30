import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantOnboarding } from "@/lib/onboarding/helpers";
import { getRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { loadRestaurantCardStats } from "@/lib/restaurant-list/card-stats";
import {
  buildRestaurantLaunchChecklist,
  parseVoiceAgentSyncSummary,
} from "@/lib/restaurant-launch/evaluate-checklist";
import type { RestaurantLaunchChecklistSnapshot } from "@/lib/restaurant-launch/types";

async function menuItemCount(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<number> {
  const stats = await loadRestaurantCardStats(supabase, [restaurantId], {});
  return stats[restaurantId]?.menuItemCount ?? 0;
}

async function hoursConfigured(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("restaurant_weekly_hours")
    .select("restaurant_id")
    .eq("restaurant_id", restaurantId)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

async function testCallPassed(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<boolean> {
  const onboarding = await getRestaurantOnboarding(supabase, restaurantId);
  const stepStatus = onboarding?.steps.test_call?.status;
  if (stepStatus === "completed") return true;

  const { count: receiptCount, error: receiptErr } = await supabase
    .from("phone_order_receipts")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (receiptErr) throw new Error(receiptErr.message);
  return (receiptCount ?? 0) > 0;
}

export async function loadRestaurantLaunchChecklist(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    restaurantName: string;
    phoneWebhookFromAgent?: string | null;
  }
): Promise<RestaurantLaunchChecklistSnapshot> {
  const profile = await getRestaurantProfile(supabase, input.restaurantId);
  const [menuItems, hours, testOk] = await Promise.all([
    menuItemCount(supabase, input.restaurantId),
    hoursConfigured(supabase, input.restaurantId),
    testCallPassed(supabase, input.restaurantId),
  ]);

  const syncSummary = parseVoiceAgentSyncSummary(
    profile?.elevenlabs_last_sync_summary ?? null
  );

  return buildRestaurantLaunchChecklist({
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    profile,
    menuItemCount: menuItems,
    hoursConfigured: hours,
    testCallPassed: testOk,
    syncSummary,
    lastSyncError: profile?.elevenlabs_last_sync_error ?? null,
    phoneWebhookFromAgent: input.phoneWebhookFromAgent ?? null,
  });
}
