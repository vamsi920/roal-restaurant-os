import type { SupabaseClient } from "@supabase/supabase-js";
import { isTestHarnessBillingSession } from "@/lib/billing/billable-orders";
import { emitStuckActiveCallNotification } from "@/lib/notifications/call-follow-up-events";
import { loadNotificationSettings } from "@/lib/notifications/settings";

export const DEFAULT_STUCK_ACTIVE_CALL_MINUTES = 20;

type StuckActiveCallRow = {
  id: string;
  restaurant_id: string;
  session_id: string;
  conversation_id: string | null;
  caller_phone: string | null;
  started_at: string;
  transcript_metadata: Record<string, unknown> | null;
};

function isHarnessRow(row: StuckActiveCallRow): boolean {
  if (isTestHarnessBillingSession(row.session_id)) return true;
  const meta = row.transcript_metadata ?? {};
  return meta.is_test_harness === true || meta.is_test_harness === "true";
}

export async function notifyStuckActiveCallsForOrganization(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantNames: Map<string, string>;
    thresholdMinutes?: number;
  }
): Promise<number> {
  const settings = await loadNotificationSettings(supabase, input.organizationId);
  if (!settings.enabledEvents.includes("stuck_active_call")) return 0;

  const thresholdMinutes =
    input.thresholdMinutes ?? DEFAULT_STUCK_ACTIVE_CALL_MINUTES;
  const cutoff = new Date(
    Date.now() - thresholdMinutes * 60 * 1000
  ).toISOString();

  const restaurantIds = [...input.restaurantNames.keys()];
  if (restaurantIds.length === 0) return 0;

  const { data, error } = await supabase
    .from("agent_call_events")
    .select(
      "id, restaurant_id, session_id, conversation_id, caller_phone, started_at, transcript_metadata"
    )
    .in("restaurant_id", restaurantIds)
    .eq("status", "active")
    .lt("started_at", cutoff)
    .order("started_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);

  let sent = 0;
  for (const row of (data ?? []) as StuckActiveCallRow[]) {
    if (isHarnessRow(row)) continue;

    const restaurantName =
      input.restaurantNames.get(row.restaurant_id) ?? "Restaurant";

    const notified = await emitStuckActiveCallNotification(supabase, {
      organizationId: input.organizationId,
      restaurantId: row.restaurant_id,
      restaurantName,
      sessionId: row.session_id,
      conversationId: row.conversation_id,
      callerPhone: row.caller_phone,
      startedAt: row.started_at,
      thresholdMinutes,
      transcriptMetadata: row.transcript_metadata ?? undefined,
    });
    if (notified) sent += 1;
  }

  return sent;
}
