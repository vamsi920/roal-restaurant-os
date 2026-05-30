import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ElevenLabsMenuAutoSyncStatus,
  ElevenLabsProvisionStatus,
  MembershipRole,
} from "@/lib/types";
import { isKdsStuckOrder } from "@/lib/orders/kds-queue-lane";
import { isTerminalOrderStatus, normalizeOrderStatus } from "@/lib/order-status";
import {
  buildRestaurantLaunchBlockers,
  restaurantNeedsAttention,
} from "@/lib/org-overview/launch-blockers";
import type {
  OrgOverviewPageSnapshot,
  OrgOverviewTotals,
  OrgRestaurantOverviewRow,
  OrganizationOverviewSnapshot,
} from "@/lib/org-overview/types";
import { sanitizeOpsErrorDetail } from "@/lib/admin/sanitize-ops-detail";
import {
  menuAutoSyncFromProfile,
  resolveMenuAutoSyncDisplay,
} from "@/lib/voice-agent/menu-auto-sync-display";
import {
  restaurantLiveOrdersHref,
  restaurantVoiceAgentHref,
  voiceProvisionUiStateFromProfile,
} from "@/lib/voice-agent/provision-display";

function agentIdSuffix(agentId: string | null | undefined): string | null {
  const id = agentId?.trim();
  if (!id) return null;
  if (id.length <= 8) return `···${id}`;
  return `···${id.slice(-6)}`;
}

type ProfileRow = {
  restaurant_id: string;
  elevenlabs_agent_id: string | null;
  elevenlabs_provision_status: ElevenLabsProvisionStatus | null;
  elevenlabs_provision_error: string | null;
  elevenlabs_menu_auto_sync_status: ElevenLabsMenuAutoSyncStatus | null;
  elevenlabs_menu_auto_sync_error: string | null;
  elevenlabs_last_sync_at: string | null;
  elevenlabs_last_sync_error: string | null;
};

type DraftRow = {
  restaurant_id: string;
  status: string;
  updated_at: string;
};

function countOrdersByRestaurant(
  drafts: DraftRow[],
  restaurantIds: string[]
): Map<string, { active: number; stuck: number }> {
  const map = new Map<string, { active: number; stuck: number }>();
  for (const id of restaurantIds) {
    map.set(id, { active: 0, stuck: 0 });
  }
  const now = new Date();
  for (const row of drafts) {
    const bucket = map.get(row.restaurant_id);
    if (!bucket) continue;
    if (isTerminalOrderStatus(row.status)) continue;
    bucket.active += 1;
    if (
      isKdsStuckOrder(
        { status: normalizeOrderStatus(row.status), updated_at: row.updated_at },
        { now }
      )
    ) {
      bucket.stuck += 1;
    }
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

export async function loadOrganizationOverview(
  supabase: SupabaseClient,
  input: { organizationId: string; organizationName: string; role: MembershipRole }
): Promise<OrganizationOverviewSnapshot> {
  const { data: restaurants, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("organization_id", input.organizationId)
    .order("name", { ascending: true });
  if (restErr) throw new Error(restErr.message);

  const rows = restaurants ?? [];
  const restaurantIds = rows.map((r) => r.id as string);

  let profiles: ProfileRow[] = [];
  if (restaurantIds.length > 0) {
    const { data, error } = await supabase
      .from("restaurant_profiles")
      .select(
        "restaurant_id, elevenlabs_agent_id, elevenlabs_provision_status, elevenlabs_provision_error, elevenlabs_menu_auto_sync_status, elevenlabs_menu_auto_sync_error, elevenlabs_last_sync_at, elevenlabs_last_sync_error"
      )
      .in("restaurant_id", restaurantIds);
    if (error) throw new Error(error.message);
    profiles = (data ?? []) as ProfileRow[];
  }

  const profileById = new Map(profiles.map((p) => [p.restaurant_id, p]));

  let drafts: DraftRow[] = [];
  if (restaurantIds.length > 0) {
    const { data, error } = await supabase
      .from("draft_orders")
      .select("restaurant_id, status, updated_at")
      .in("restaurant_id", restaurantIds);
    if (error) throw new Error(error.message);
    drafts = (data ?? []) as DraftRow[];
  }

  const [orderCounts, menuCounts, hoursMap] = await Promise.all([
    Promise.resolve(countOrdersByRestaurant(drafts, restaurantIds)),
    menuItemCountsByRestaurant(supabase, restaurantIds),
    hoursConfiguredByRestaurant(supabase, restaurantIds),
  ]);

  const restaurantOverview: OrgRestaurantOverviewRow[] = rows.map((r) => {
    const id = r.id as string;
    const profile = profileById.get(id);
    const agentId = profile?.elevenlabs_agent_id ?? null;
    const voiceProvisionState = voiceProvisionUiStateFromProfile(profile ?? null);
    const menuSnapshot = menuAutoSyncFromProfile(
      profile ?? {
        elevenlabs_agent_id: null,
        elevenlabs_menu_auto_sync_status: null,
        elevenlabs_menu_auto_sync_error: null,
        elevenlabs_last_sync_at: null,
      }
    );
    const menuDisplay = resolveMenuAutoSyncDisplay(menuSnapshot);
    const orders = orderCounts.get(id) ?? { active: 0, stuck: 0 };
    const menuItemCount = menuCounts.get(id) ?? 0;
    const hoursConfigured = hoursMap.get(id) ?? false;
    const lastVoiceSyncError =
      sanitizeOpsErrorDetail(profile?.elevenlabs_last_sync_error, 160) || null;

    const launchBlockers = buildRestaurantLaunchBlockers({
      restaurantId: id,
      voiceProvisionState,
      menuSyncPhase: menuDisplay.phase,
      lastVoiceSyncError,
      menuItemCount,
      hoursConfigured,
      stuckOrderCount: orders.stuck,
    });

    return {
      id,
      name: r.name as string,
      voiceProvisionState,
      agentConfigured: Boolean(agentId?.trim()),
      agentIdSuffix: agentIdSuffix(agentId),
      menuSyncPhase: menuDisplay.phase,
      menuSyncLabel: menuDisplay.badgeLabel,
      lastMenuSyncAt: profile?.elevenlabs_last_sync_at ?? null,
      lastVoiceSyncAt: profile?.elevenlabs_last_sync_at ?? null,
      lastVoiceSyncError,
      menuItemCount,
      hoursConfigured,
      activeOrderCount: orders.active,
      stuckOrderCount: orders.stuck,
      launchBlockers,
      links: {
        liveOrders: restaurantLiveOrdersHref(id),
        menuSetup: `/dashboard/restaurants/${id}/menu`,
        voiceAgent: restaurantVoiceAgentHref(id),
        analytics: `/dashboard/restaurants/${id}/analytics`,
      },
    };
  });

  const totals: OrgOverviewTotals = {
    locationCount: restaurantOverview.length,
    activeOrders: restaurantOverview.reduce((n, r) => n + r.activeOrderCount, 0),
    stuckOrders: restaurantOverview.reduce((n, r) => n + r.stuckOrderCount, 0),
    needsAttentionCount: restaurantOverview.filter((r) =>
      restaurantNeedsAttention(r.launchBlockers, r.stuckOrderCount)
    ).length,
  };

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    role: input.role,
    generatedAt: new Date().toISOString(),
    totals,
    restaurants: restaurantOverview,
  };
}

export async function loadOrgOverviewPage(
  supabase: SupabaseClient,
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    role: MembershipRole;
  }>
): Promise<OrgOverviewPageSnapshot> {
  const snapshots = await Promise.all(
    organizations.map((org) => loadOrganizationOverview(supabase, org))
  );
  return {
    generatedAt: new Date().toISOString(),
    organizations: snapshots,
  };
}
