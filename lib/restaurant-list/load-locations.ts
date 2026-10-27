import type { AuthContext } from "@/lib/auth/types";
import { canOperateRestaurant } from "@/lib/auth/roles";
import type { Db } from "@/lib/db";
import { loadRestaurantCardStats } from "@/lib/restaurant-list/card-stats";
import type {
  RestaurantCardStats,
  RestaurantListProfile,
} from "@/lib/restaurant-list/types";
import type { Restaurant } from "@/lib/types";

const PROFILE_COLUMNS =
  "restaurant_id, phone, timezone, address_line1, allows_pickup, allows_delivery, elevenlabs_provision_status, elevenlabs_provision_error, elevenlabs_agent_id, elevenlabs_last_sync_error, elevenlabs_menu_auto_sync_status, elevenlabs_menu_auto_sync_error, elevenlabs_last_sync_at, elevenlabs_last_sync_summary";

export type LocationsPayload = {
  restaurants: Restaurant[];
  profilesByRestaurantId: Record<string, RestaurantListProfile>;
  statsByRestaurantId: Record<string, RestaurantCardStats>;
  error: string | null;
};

/** Organization ids the caller may see locations for (operate role or better). */
export function locationOrgIdsForContext(context: AuthContext): string[] {
  return [
    ...new Set(
      context.memberships
        .filter((m) => canOperateRestaurant(m.role))
        .map((m) => m.organization_id)
    ),
  ];
}

/**
 * "All locations" data, scoped to the caller's organization memberships.
 * (Previously loaded in the browser and filtered by Postgres RLS.)
 */
export async function loadLocationsForContext(
  db: Db,
  context: AuthContext
): Promise<LocationsPayload> {
  const orgIds = locationOrgIdsForContext(context);
  if (orgIds.length === 0) {
    return { restaurants: [], profilesByRestaurantId: {}, statsByRestaurantId: {}, error: null };
  }

  const { data, error } = await db
    .from("restaurants")
    .select("*")
    .in("organization_id", orgIds)
    .order("created_at", { ascending: false });
  if (error) {
    return { restaurants: [], profilesByRestaurantId: {}, statsByRestaurantId: {}, error: error.message };
  }

  const allowed = new Set(orgIds);
  const restaurants = ((data ?? []) as Restaurant[]).filter((r) => allowed.has(r.organization_id));
  if (restaurants.length === 0) {
    return { restaurants, profilesByRestaurantId: {}, statsByRestaurantId: {}, error: null };
  }

  const ids = restaurants.map((r) => r.id);
  const idSet = new Set(ids);
  const { data: profiles, error: profileError } = await db
    .from("restaurant_profiles")
    .select(PROFILE_COLUMNS)
    .in("restaurant_id", ids);

  const profilesByRestaurantId: Record<string, RestaurantListProfile> = {};
  if (!profileError) {
    for (const row of (profiles ?? []) as RestaurantListProfile[]) {
      if (idSet.has(row.restaurant_id)) profilesByRestaurantId[row.restaurant_id] = row;
    }
  }

  let statsByRestaurantId: Record<string, RestaurantCardStats> = {};
  try {
    const namesById = Object.fromEntries(restaurants.map((r) => [r.id, r.name]));
    statsByRestaurantId = await loadRestaurantCardStats(db, ids, profilesByRestaurantId, namesById);
  } catch (e) {
    console.error("[locations] card stats", e instanceof Error ? e.message : e);
  }

  return { restaurants, profilesByRestaurantId, statsByRestaurantId, error: null };
}
