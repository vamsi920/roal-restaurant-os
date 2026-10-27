import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { RestaurantCallHistoryPanel } from "@/components/call-history/RestaurantCallHistoryPanel";
import {
  CALL_HISTORY_DEFAULT_RANGE_DAYS,
  loadRestaurantCallHistory,
} from "@/lib/call-history/load-call-history";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { getDb } from "@/lib/db";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";
import { defaultAgentName } from "@/lib/trial/voices";
import { PageHeader } from "@/components/ui";
import type { Db } from "@/lib/db";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";

/**
 * Line items for the calls that produced an order, keyed by session id, so the
 * drawer can show what was ordered. Receipts win over drafts (they are final).
 */
async function loadOrderItemsBySession(
  supabase: Db,
  restaurantId: string,
  sessionIds: string[]
): Promise<Record<string, unknown>> {
  const ids = [...new Set(sessionIds.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  if (ids.length === 0) return {};
  const [receipts, drafts] = await Promise.all([
    supabase
      .from("phone_order_receipts")
      .select("session_id, items")
      .eq("restaurant_id", restaurantId)
      .in("session_id", ids),
    supabase
      .from("draft_orders")
      .select("session_id, items")
      .eq("restaurant_id", restaurantId)
      .in("session_id", ids),
  ]);
  const out: Record<string, unknown> = {};
  for (const row of drafts.data ?? []) {
    if (row.session_id) out[String(row.session_id)] = row.items;
  }
  for (const row of receipts.data ?? []) {
    if (row.session_id) out[String(row.session_id)] = row.items;
  }
  return out;
}
export const metadata: Metadata = {
  title: "Calls & Orders — ROAL",
};

export const dynamic = "force-dynamic";

export default async function RestaurantCallHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/calls`);
    notFound();
  }

  const { restaurant } = access;
  const supabase = getDb();
  const profile = await ensureRestaurantProfile(
    supabase,
    restaurant.id,
    restaurant.organization_id
  );

  const [history, suggestionCount] = await Promise.all([
    loadRestaurantCallHistory(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      profile,
    }),
    countPendingKnowledgeSuggestions(supabase, restaurant.id),
  ]);
  const hostName = profile.agent_display_name?.trim() || defaultAgentName();
  const orderItemsBySession = await loadOrderItemsBySession(
    supabase,
    restaurant.id,
    history.rows.filter((row) => row.lineCount > 0).map((row) => row.sessionId)
  ).catch(() => ({}));

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestionCount}
    >
      <div className="kds-workspace min-w-0 max-w-full">
        <PageHeader
          title="Calls & Orders"
          subtitle={`Every call ${hostName} answered in the last ${CALL_HISTORY_DEFAULT_RANGE_DAYS} days.`}
        />
        <RestaurantCallHistoryPanel
          snapshot={history}
          hostName={hostName}
          orderItemsBySession={orderItemsBySession}
        />
      </div>
    </RestaurantWorkspaceRail>
  );
}
