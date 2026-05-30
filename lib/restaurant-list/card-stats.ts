import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeOpsErrorDetail } from "@/lib/admin/sanitize-ops-detail";
import type {
  RestaurantCardStats,
  RestaurantListProfile,
} from "@/lib/restaurant-list/types";

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

export function buildRestaurantCardStats(input: {
  restaurantIds: string[];
  profilesById: Record<string, RestaurantListProfile | undefined>;
  menuItemCounts: Map<string, number>;
  lastOrderAt: Map<string, string>;
}): Record<string, RestaurantCardStats> {
  const out: Record<string, RestaurantCardStats> = {};
  for (const restaurantId of input.restaurantIds) {
    const profile = input.profilesById[restaurantId];
    out[restaurantId] = {
      restaurantId,
      agentLinked: Boolean(profile?.elevenlabs_agent_id?.trim()),
      menuItemCount: input.menuItemCounts.get(restaurantId) ?? 0,
      lastOrderAt: input.lastOrderAt.get(restaurantId) ?? null,
      syncError: resolveRestaurantSyncError(profile),
    };
  }
  return out;
}

export async function loadRestaurantCardStats(
  supabase: SupabaseClient,
  restaurantIds: string[],
  profilesById: Record<string, RestaurantListProfile>
): Promise<Record<string, RestaurantCardStats>> {
  if (restaurantIds.length === 0) return {};

  const [menuItemCounts, draftsResult, receiptsResult] = await Promise.all([
    menuItemCountsByRestaurant(supabase, restaurantIds),
    supabase
      .from("draft_orders")
      .select("restaurant_id, updated_at")
      .in("restaurant_id", restaurantIds),
    supabase
      .from("phone_order_receipts")
      .select("restaurant_id, created_at")
      .in("restaurant_id", restaurantIds),
  ]);

  if (draftsResult.error) throw new Error(draftsResult.error.message);
  if (receiptsResult.error) throw new Error(receiptsResult.error.message);

  const lastOrderAt = lastOrderAtByRestaurant(
    (draftsResult.data ?? []) as Array<{
      restaurant_id: string;
      updated_at: string;
    }>,
    (receiptsResult.data ?? []) as Array<{
      restaurant_id: string;
      created_at: string;
    }>
  );

  return buildRestaurantCardStats({
    restaurantIds,
    profilesById,
    menuItemCounts,
    lastOrderAt,
  });
}
