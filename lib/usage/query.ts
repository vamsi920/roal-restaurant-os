import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsageEventType } from "@/lib/usage/types";

export type UsageSummaryRow = {
  event_type: UsageEventType;
  count: number;
};

export type UsageSummary = {
  organizationId: string;
  restaurantId: string | null;
  since: string;
  until: string;
  byType: UsageSummaryRow[];
  activeLocations: number;
};

/** Aggregate event counts for billing dashboards (RLS-scoped client). */
export async function getUsageSummary(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantId?: string | null;
    since?: Date;
    until?: Date;
  }
): Promise<UsageSummary> {
  const since = input.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const until = input.until ?? new Date();

  let query = supabase
    .from("usage_events")
    .select("event_type, restaurant_id")
    .eq("organization_id", input.organizationId)
    .gte("occurred_at", since.toISOString())
    .lte("occurred_at", until.toISOString());

  if (input.restaurantId) {
    query = query.eq("restaurant_id", input.restaurantId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const counts = new Map<UsageEventType, number>();
  const activeRestaurants = new Set<string>();

  for (const row of data ?? []) {
    const type = row.event_type as UsageEventType;
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (type === "active_location" && row.restaurant_id) {
      activeRestaurants.add(String(row.restaurant_id));
    }
  }

  const byType = [...counts.entries()].map(([event_type, count]) => ({
    event_type,
    count,
  }));

  return {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId ?? null,
    since: since.toISOString(),
    until: until.toISOString(),
    byType,
    activeLocations:
      activeRestaurants.size > 0
        ? activeRestaurants.size
        : (counts.get("active_location") ?? 0),
  };
}
