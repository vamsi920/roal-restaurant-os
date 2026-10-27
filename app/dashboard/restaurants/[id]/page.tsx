import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { getDb } from "@/lib/db";
import { LiveOrdersPanel } from "./LiveOrdersPanel";
import { RestaurantWorkspaceRail } from "./RestaurantWorkspaceRail";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import { notifyStuckOrdersForOrganization } from "@/lib/notifications/stuck-orders";
import { notifyStuckActiveCallsForOrganization } from "@/lib/notifications/stuck-active-calls";
import { RESTAURANT_LIVE_ORDERS_LABEL } from "@/lib/dashboard-restaurant-labels";
import { loadLiveOrdersPageData } from "@/lib/live-orders/load-live-orders-page";
import { PhoneAgentReadinessStrip } from "@/components/live-orders/PhoneAgentReadinessStrip";
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";
import { defaultAgentName } from "@/lib/trial/voices";

export const metadata: Metadata = {
  title: `${RESTAURANT_LIVE_ORDERS_LABEL} — ROAL`,
};

export const dynamic = "force-dynamic";

export default async function RestaurantKDSPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}`);
    notFound();
  }
  const { restaurant } = access;
  const supabase = getDb();

  const { data: orgRestaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("organization_id", restaurant.organization_id);
  const restaurantNames = new Map(
    (orgRestaurants ?? []).map((r) => [r.id as string, r.name as string])
  );
  void notifyStuckOrdersForOrganization(supabase, {
    organizationId: restaurant.organization_id,
    restaurantNames,
  });
  void notifyStuckActiveCallsForOrganization(supabase, {
    organizationId: restaurant.organization_id,
    restaurantNames,
  });

  const profile = await ensureRestaurantProfile(
    supabase,
    restaurant.id,
    restaurant.organization_id
  );

  const menu = await loadRestaurantMenu(supabase, params.id);
  const ordersDb = getDb() ?? supabase;

  const [pageData, suggestionCount] = await Promise.all([
    loadLiveOrdersPageData(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      profile,
      ordersDb,
    }),
    countPendingKnowledgeSuggestions(supabase, restaurant.id),
  ]);

  if (pageData.ordersLoadError) {
    console.error("live orders load", pageData.ordersLoadError);
  }

  const pricingSettings = orderPricingFromProfile(profile);
  const hostName = profile.agent_display_name?.trim() || defaultAgentName();

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestionCount}
    >
      <div className="kds-workspace kds-workspace--kitchen min-w-0 w-full max-w-full space-y-4">
        <LiveOrdersPanel
          notice={
            pageData.launchGate.phase !== "ready" ? (
              <PhoneAgentReadinessStrip
                restaurantId={restaurant.id}
                launchGate={pageData.launchGate}
              />
            ) : null
          }
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          hostName={hostName}
          menuItems={menu.items}
          menuModifiers={menu.modifiers}
          pricingSettings={pricingSettings}
          initialDraftOrders={pageData.initialDraftOrders}
          initialReceipts={pageData.initialReceipts}
          initialLoadError={pageData.ordersLoadError}
          initialActiveCalls={pageData.activeCalls}
          initialCallEvidenceBySession={pageData.initialCallEvidenceBySession}
        />
      </div>
    </RestaurantWorkspaceRail>
  );
}
