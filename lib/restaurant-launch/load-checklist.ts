import type { SupabaseClient } from "@supabase/supabase-js";
import {
  filterBillablePhoneOrderReceipts,
  type BillableReceiptRow,
} from "@/lib/billing/billable-orders";
import { getElevenLabsAgentId } from "@/lib/env.server";
import { getRestaurantOnboarding } from "@/lib/onboarding/helpers";
import { getRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { loadRestaurantCardStats } from "@/lib/restaurant-list/card-stats";
import {
  buildRestaurantLaunchGate,
  parseVoiceAgentSyncSummary,
} from "@/lib/restaurant-launch/evaluate-checklist";
import {
  evaluateServerLaunchEnvReady,
  evaluateTestCallProof,
} from "@/lib/restaurant-launch/server-env";
import type {
  LaunchGateSnapshot,
  RestaurantLaunchChecklistSnapshot,
} from "@/lib/restaurant-launch/types";

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
): Promise<{ passed: boolean; detail: string }> {
  const onboarding = await getRestaurantOnboarding(supabase, restaurantId);
  const onboardingCompleted =
    onboarding?.steps.test_call?.status === "completed";

  const { data, error } = await supabase
    .from("phone_order_receipts")
    .select("restaurant_id, session_id, items, created_at")
    .eq("restaurant_id", restaurantId);
  if (error) throw new Error(error.message);

  const billable = filterBillablePhoneOrderReceipts(
    (data ?? []) as BillableReceiptRow[]
  );

  return evaluateTestCallProof({
    onboardingTestCallCompleted: onboardingCompleted,
    billableReceiptCount: billable.length,
  });
}

export async function loadRestaurantLaunchChecklist(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    restaurantName: string;
    phoneWebhookFromAgent?: string | null;
  }
): Promise<RestaurantLaunchChecklistSnapshot> {
  const gate = await loadRestaurantLaunchGate(supabase, input);
  return gate.checklist;
}

export async function loadRestaurantLaunchGate(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    restaurantName: string;
    phoneWebhookFromAgent?: string | null;
  }
): Promise<LaunchGateSnapshot> {
  const profile = await getRestaurantProfile(supabase, input.restaurantId);
  const [menuItems, hours, testProof, serverEnv] = await Promise.all([
    menuItemCount(supabase, input.restaurantId),
    hoursConfigured(supabase, input.restaurantId),
    testCallPassed(supabase, input.restaurantId),
    Promise.resolve(evaluateServerLaunchEnvReady()),
  ]);

  const syncSummary = parseVoiceAgentSyncSummary(
    profile?.elevenlabs_last_sync_summary ?? null
  );

  return buildRestaurantLaunchGate({
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    profile,
    menuItemCount: menuItems,
    hoursConfigured: hours,
    testCallPassed: testProof.passed,
    testCallDetail: testProof.detail,
    syncSummary,
    lastSyncError: profile?.elevenlabs_last_sync_error ?? null,
    phoneWebhookFromAgent: input.phoneWebhookFromAgent ?? null,
    serverEnvReady: serverEnv.ready,
    serverEnvDetail: serverEnv.detail,
    templateAgentId: getElevenLabsAgentId(),
  });
}
