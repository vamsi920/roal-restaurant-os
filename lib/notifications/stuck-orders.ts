import type { SupabaseClient } from "@supabase/supabase-js";
import { emitOrderStuckIfTransition } from "@/lib/notifications/operational-events";
import { loadNotificationSettings } from "@/lib/notifications/settings";

const STUCK_STATUSES = ["new", "accepted", "in_progress", "ready"] as const;

type StuckRow = {
  id: string;
  restaurant_id: string;
  session_id: string;
  status: string;
  updated_at: string;
  customer_name: string | null;
};

export async function notifyStuckOrdersForOrganization(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantNames: Map<string, string>;
  }
): Promise<number> {
  const settings = await loadNotificationSettings(supabase, input.organizationId);
  if (!settings.enabledEvents.includes("order_stuck")) return 0;

  const thresholdMs = settings.orderStuckMinutes * 60 * 1000;
  const cutoff = new Date(Date.now() - thresholdMs).toISOString();

  const restaurantIds = [...input.restaurantNames.keys()];
  if (restaurantIds.length === 0) return 0;

  const { data, error } = await supabase
    .from("draft_orders")
    .select("id, restaurant_id, session_id, status, updated_at, customer_name")
    .in("restaurant_id", restaurantIds)
    .in("status", [...STUCK_STATUSES])
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);

  let sent = 0;
  for (const row of (data ?? []) as StuckRow[]) {
    const restaurantName =
      input.restaurantNames.get(row.restaurant_id) ?? "Restaurant";
    const label = row.customer_name?.trim() || row.session_id.slice(0, 8);

    const notified = await emitOrderStuckIfTransition(supabase, {
      organizationId: input.organizationId,
      restaurantId: row.restaurant_id,
      restaurantName,
      orderId: row.id,
      sessionId: row.session_id,
      status: row.status,
      thresholdMinutes: settings.orderStuckMinutes,
      customerLabel: label,
    });
    if (notified) sent += 1;
  }

  return sent;
}
