import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeOpsErrorDetail } from "@/lib/admin/sanitize-ops-detail";
import { filterBillablePhoneOrderReceipts } from "@/lib/billing/billable-orders";
import { getElevenLabsAgentId } from "@/lib/env.server";
import type { ElevenLabsMenuAutoSyncStatus, RestaurantProfile } from "@/lib/types";
import { resolveLocationNextBestAction } from "@/lib/restaurant-list/next-best-action";
import {
  countActiveCallsByRestaurant,
  countOpenFollowUpsByRestaurant,
  countOpenReservationsByRestaurant,
  followUpLookbackSinceIso,
  lastSuccessfulOrderAtByRestaurant,
  portfolioPeriodSinceIso,
  successfulOrdersInPeriodByRestaurant,
} from "@/lib/restaurant-list/operational-metrics";
import type {
  RestaurantCardStats,
  RestaurantListProfile,
} from "@/lib/restaurant-list/types";
import {
  buildRestaurantLaunchGate,
  parseVoiceAgentSyncSummary,
} from "@/lib/restaurant-launch/evaluate-checklist";
import {
  evaluateServerLaunchEnvReady,
  evaluateTestCallProof,
} from "@/lib/restaurant-launch/server-env";
import type { LaunchGateSnapshot } from "@/lib/restaurant-launch/types";
import {
  resolveMenuAutoSyncDisplay,
  type MenuAutoSyncUiPhase,
} from "@/lib/voice-agent/menu-auto-sync-display";
import {
  voiceProvisionUiStateFromProfile,
  type VoiceProvisionUiState,
} from "@/lib/voice-agent/provision-display";

export function resolveRestaurantSyncError(
  profile: RestaurantListProfile | null | undefined
): string | null {
  if (!profile) return null;
  const menuStatus = profile.elevenlabs_menu_auto_sync_status;
  const menuErr = profile.elevenlabs_menu_auto_sync_error?.trim();
  if (menuStatus === "failed" && menuErr) {
    return sanitizeOpsErrorDetail(menuErr, 200) || null;
  }
  const voiceErr = profile.elevenlabs_last_sync_error?.trim();
  if (voiceErr) {
    return sanitizeOpsErrorDetail(voiceErr, 200) || null;
  }
  return null;
}

export function maxIsoTimestamp(
  current: string | null,
  candidate: string | null | undefined
): string | null {
  if (!candidate?.trim()) return current;
  const next = candidate.trim();
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

export function lastOrderAtByRestaurant(
  drafts: Array<{ restaurant_id: string; updated_at: string }>,
  receipts: Array<{ restaurant_id: string; created_at: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of drafts) {
    const id = row.restaurant_id?.trim();
    if (!id) continue;
    const prev = map.get(id) ?? null;
    map.set(id, maxIsoTimestamp(prev, row.updated_at) ?? row.updated_at);
  }
  for (const row of receipts) {
    const id = row.restaurant_id?.trim();
    if (!id) continue;
    const prev = map.get(id) ?? null;
    map.set(id, maxIsoTimestamp(prev, row.created_at) ?? row.created_at);
  }
  return map;
}

async function menuItemCountsByRestaurant(
  supabase: SupabaseClient,
  restaurantIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of restaurantIds) counts.set(id, 0);
  if (restaurantIds.length === 0) return counts;

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, restaurant_id")
    .in("restaurant_id", restaurantIds);
  if (catErr) throw new Error(catErr.message);

  const catRows = categories ?? [];
  if (catRows.length === 0) return counts;

  const categoryToRestaurant = new Map<string, string>();
  for (const c of catRows) {
    categoryToRestaurant.set(c.id as string, c.restaurant_id as string);
  }

  const { data: items, error: itemErr } = await supabase
    .from("items")
    .select("id, category_id")
    .in("category_id", [...categoryToRestaurant.keys()]);
  if (itemErr) throw new Error(itemErr.message);

  for (const item of items ?? []) {
    const restaurantId = categoryToRestaurant.get(item.category_id as string);
    if (!restaurantId) continue;
    counts.set(restaurantId, (counts.get(restaurantId) ?? 0) + 1);
  }

  return counts;
}

async function hoursConfiguredByRestaurant(
  supabase: SupabaseClient,
  restaurantIds: string[]
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  for (const id of restaurantIds) map.set(id, false);
  if (restaurantIds.length === 0) return map;

  const { data, error } = await supabase
    .from("restaurant_weekly_hours")
    .select("restaurant_id")
    .in("restaurant_id", restaurantIds);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    map.set(row.restaurant_id as string, true);
  }
  return map;
}

export function buildRestaurantCardStats(input: {
  restaurantIds: string[];
  profilesById: Record<string, RestaurantListProfile | undefined>;
  menuItemCounts: Map<string, number>;
  lastOrderAt: Map<string, string>;
  activeCallCounts?: Map<string, number>;
  openFollowUpCounts?: Map<string, number>;
  openReservationCounts?: Map<string, number>;
  successfulOrdersInPeriod?: Map<string, number>;
  hoursConfigured?: Map<string, boolean>;
  launchGates?: Map<string, LaunchGateSnapshot>;
}): Record<string, RestaurantCardStats> {
  const out: Record<string, RestaurantCardStats> = {};

  for (const restaurantId of input.restaurantIds) {
    const profile = input.profilesById[restaurantId];
    const voiceProvisionState: VoiceProvisionUiState =
      voiceProvisionUiStateFromProfile(profile);
    const menuSyncPhase: MenuAutoSyncUiPhase = resolveMenuAutoSyncDisplay({
      agentLinked: Boolean(profile?.elevenlabs_agent_id?.trim()),
      status:
        (profile?.elevenlabs_menu_auto_sync_status as
          | ElevenLabsMenuAutoSyncStatus
          | null
          | undefined) ?? null,
      error: profile?.elevenlabs_menu_auto_sync_error ?? null,
      lastSyncedAt: profile?.elevenlabs_last_sync_at ?? null,
    }).phase;
    const menuItemCount = input.menuItemCounts.get(restaurantId) ?? 0;
    const syncError = resolveRestaurantSyncError(profile);
    const hoursConfigured = input.hoursConfigured?.get(restaurantId) ?? false;
    const activeCallCount = input.activeCallCounts?.get(restaurantId) ?? 0;
    const openFollowUpCount = input.openFollowUpCounts?.get(restaurantId) ?? 0;
    const openReservationCount =
      input.openReservationCounts?.get(restaurantId) ?? 0;
    const successfulOrdersInPeriod =
      input.successfulOrdersInPeriod?.get(restaurantId) ?? 0;
    const launchGate = input.launchGates?.get(restaurantId);
    const readyForCalls = launchGate?.isLiveReady ?? false;
    const needsSetupAttention = !readyForCalls;

    const operationalNextAction = resolveLocationNextBestAction({
        restaurantId,
        voiceProvisionState,
        menuSyncPhase,
        menuItemCount,
        syncError,
        activeCallCount,
        openFollowUpCount,
        openReservationCount,
        hoursConfigured,
    });

    out[restaurantId] = {
      restaurantId,
      agentLinked: Boolean(profile?.elevenlabs_agent_id?.trim()),
      voiceProvisionState,
      menuSyncPhase,
      menuItemCount,
      activeCallCount,
      openFollowUpCount,
      openReservationCount,
      successfulOrdersInPeriod,
      lastOrderAt: input.lastOrderAt.get(restaurantId) ?? null,
      syncError,
      readyForCalls,
      needsSetupAttention,
      nextBestAction: readyForCalls
        ? operationalNextAction
        : (launchGate?.primaryAction ?? operationalNextAction),
    };
  }

  return out;
}

export async function loadRestaurantCardStats(
  supabase: SupabaseClient,
  restaurantIds: string[],
  profilesById: Record<string, RestaurantListProfile>,
  namesById?: Record<string, string>
): Promise<Record<string, RestaurantCardStats>> {
  const scopedIds = restaurantIds.map((id) => id.trim()).filter(Boolean);
  if (scopedIds.length === 0) return {};

  const periodSince = portfolioPeriodSinceIso();
  const followUpSince = followUpLookbackSinceIso();
  const followUpSinceMs = new Date(followUpSince).getTime();

  const [
    menuItemCounts,
    hoursConfigured,
    draftsResult,
    receiptsResult,
    reservationsResult,
    callEventsResult,
  ] = await Promise.all([
    menuItemCountsByRestaurant(supabase, scopedIds),
    hoursConfiguredByRestaurant(supabase, scopedIds),
    supabase
      .from("draft_orders")
      .select(
        "restaurant_id, session_id, status, updated_at, completed_at"
      )
      .in("restaurant_id", scopedIds),
    supabase
      .from("phone_order_receipts")
      .select("restaurant_id, session_id, items, created_at")
      .in("restaurant_id", scopedIds),
    supabase
      .from("restaurant_reservation_requests")
      .select("restaurant_id, status")
      .in("restaurant_id", scopedIds),
    supabase
      .from("agent_call_events")
      .select(
        "restaurant_id, session_id, status, outcome, transcript_metadata, started_at, ended_at"
      )
      .in("restaurant_id", scopedIds)
      .gte("started_at", followUpSince),
  ]);

  if (draftsResult.error) throw new Error(draftsResult.error.message);
  if (receiptsResult.error) throw new Error(receiptsResult.error.message);

  let reservationRows: Array<{ restaurant_id: string; status: string }> = [];
  if (reservationsResult.error) {
    const msg = reservationsResult.error.message ?? "";
    if (!/restaurant_reservation_requests/i.test(msg)) {
      throw new Error(reservationsResult.error.message);
    }
  } else {
    reservationRows = (reservationsResult.data ?? []) as Array<{
      restaurant_id: string;
      status: string;
    }>;
  }

  let callEvents: Array<{
    restaurant_id: string;
    session_id: string | null;
    status: string;
    outcome: string;
    transcript_metadata: Record<string, unknown> | null;
    started_at: string;
    ended_at: string | null;
  }> = [];
  if (callEventsResult.error) {
    const msg = callEventsResult.error.message ?? "";
    if (!/agent_call_events/i.test(msg)) {
      throw new Error(callEventsResult.error.message);
    }
  } else {
    callEvents = (callEventsResult.data ?? []) as typeof callEvents;
  }

  const drafts = (draftsResult.data ?? []) as Array<{
    restaurant_id: string;
    session_id: string;
    status: string;
    updated_at: string;
    completed_at?: string | null;
  }>;
  const receipts = (receiptsResult.data ?? []) as Array<{
    restaurant_id: string;
    session_id: string;
    items: unknown;
    created_at: string;
  }>;

  const lastOrderAt = lastSuccessfulOrderAtByRestaurant(receipts, drafts);
  const activeCallCounts = countActiveCallsByRestaurant(callEvents);
  const openFollowUpCounts = countOpenFollowUpsByRestaurant(
    callEvents,
    followUpSinceMs
  );
  const openReservationCounts = countOpenReservationsByRestaurant(
    reservationRows
  );
  const successfulOrdersInPeriod = successfulOrdersInPeriodByRestaurant(
    receipts,
    drafts,
    periodSince
  );

  const launchGates = await buildLaunchGatesForRestaurants({
    supabase,
    restaurantIds: scopedIds,
    profilesById,
    menuItemCounts,
    hoursConfigured,
    receipts,
    namesById,
  });

  return buildRestaurantCardStats({
    restaurantIds: scopedIds,
    profilesById,
    menuItemCounts,
    lastOrderAt,
    activeCallCounts,
    openFollowUpCounts,
    openReservationCounts,
    successfulOrdersInPeriod,
    hoursConfigured,
    launchGates,
  });
}

async function buildLaunchGatesForRestaurants(input: {
  supabase: SupabaseClient;
  restaurantIds: string[];
  profilesById: Record<string, RestaurantListProfile>;
  menuItemCounts: Map<string, number>;
  hoursConfigured: Map<string, boolean>;
  receipts: Array<{
    restaurant_id: string;
    session_id: string;
    items: unknown;
    created_at: string;
  }>;
  namesById?: Record<string, string>;
}): Promise<Map<string, LaunchGateSnapshot>> {
  const map = new Map<string, LaunchGateSnapshot>();
  if (input.restaurantIds.length === 0) return map;

  const serverEnv = evaluateServerLaunchEnvReady();
  const templateAgentId = getElevenLabsAgentId();

  const { data: onboardingRows, error: onboardingError } = await input.supabase
    .from("restaurant_onboarding")
    .select("restaurant_id, steps")
    .in("restaurant_id", input.restaurantIds);
  if (onboardingError) throw new Error(onboardingError.message);

  const onboardingById = new Map(
    (onboardingRows ?? []).map((row) => [String(row.restaurant_id), row.steps])
  );

  const billableByRestaurant = new Map<string, number>();
  for (const row of filterBillablePhoneOrderReceipts(input.receipts)) {
    const id = row.restaurant_id.trim();
    billableByRestaurant.set(id, (billableByRestaurant.get(id) ?? 0) + 1);
  }

  for (const restaurantId of input.restaurantIds) {
    const listProfile = input.profilesById[restaurantId];
    const profile = (listProfile ?? null) as RestaurantProfile | null;
    const steps = onboardingById.get(restaurantId) as
      | { test_call?: { status?: string } }
      | undefined;
    const testProof = evaluateTestCallProof({
      onboardingTestCallCompleted: steps?.test_call?.status === "completed",
      billableReceiptCount: billableByRestaurant.get(restaurantId) ?? 0,
    });

    const restaurantName =
      input.namesById?.[restaurantId]?.trim() || restaurantId;

    map.set(
      restaurantId,
      buildRestaurantLaunchGate({
        restaurantId,
        restaurantName,
        profile,
        menuItemCount: input.menuItemCounts.get(restaurantId) ?? 0,
        hoursConfigured: input.hoursConfigured.get(restaurantId) ?? false,
        testCallPassed: testProof.passed,
        testCallDetail: testProof.detail,
        syncSummary: parseVoiceAgentSyncSummary(
          profile?.elevenlabs_last_sync_summary ?? null
        ),
        lastSyncError: profile?.elevenlabs_last_sync_error ?? null,
        phoneWebhookFromAgent: null,
        serverEnvReady: serverEnv.ready,
        serverEnvDetail: serverEnv.detail,
        templateAgentId,
      })
    );
  }

  return map;
}
