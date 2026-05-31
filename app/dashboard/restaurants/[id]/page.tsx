import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { createServerSupabase, getServiceRoleSupabase } from "@/lib/supabase/server";
import { LiveOrdersPanel } from "./LiveOrdersPanel";
import { RestaurantWorkspaceRail } from "./RestaurantWorkspaceRail";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import { notifyStuckOrdersForOrganization } from "@/lib/notifications/stuck-orders";
import { RESTAURANT_LIVE_ORDERS_LABEL } from "@/lib/dashboard-restaurant-labels";
import { loadLiveOrdersPageData } from "@/lib/live-orders/load-live-orders-page";
import { PhoneAgentReadinessStrip } from "@/components/live-orders/PhoneAgentReadinessStrip";
import { RecentPhoneOutcomesPanel } from "@/components/live-orders/RecentPhoneOutcomesPanel";

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
  const supabase = await createServerSupabase();

  const { data: orgRestaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("organization_id", restaurant.organization_id);
  void notifyStuckOrdersForOrganization(supabase, {
    organizationId: restaurant.organization_id,
    restaurantNames: new Map(
      (orgRestaurants ?? []).map((r) => [r.id as string, r.name as string])
    ),
  });

  const profile = await ensureRestaurantProfile(
    supabase,
    restaurant.id,
    restaurant.organization_id
  );

  const menu = await loadRestaurantMenu(supabase, params.id);
  const ordersDb = getServiceRoleSupabase() ?? supabase;

  const pageData = await loadLiveOrdersPageData(supabase, {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    profile,
    ordersDb,
  });

  if (pageData.ordersLoadError) {
    console.error("live orders load", pageData.ordersLoadError);
  }

  const pricingSettings = orderPricingFromProfile(profile);

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    >
      <div className="kds-workspace kds-workspace--orders min-w-0 w-full max-w-full space-y-4">
        <header className="kds-ops-page-head min-w-0 space-y-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-subtle">Phone operations</p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {restaurant.name}
            </h1>
            <p className="mt-1 text-sm text-muted">{RESTAURANT_LIVE_ORDERS_LABEL}</p>
          </div>
          <PhoneAgentReadinessStrip
            restaurantId={restaurant.id}
            readiness={pageData.readiness}
          />
        </header>

        <div className="kds-ops-layout min-w-0">
          <div className="kds-ops-main min-w-0">
            <LiveOrdersPanel
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
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
          <RecentPhoneOutcomesPanel
            outcomes={pageData.recentOutcomes}
            rangeSince={pageData.rangeSince}
            rangeUntil={pageData.rangeUntil}
            empty={pageData.outcomesEmpty}
          />
        </div>
      </div>
    </RestaurantWorkspaceRail>
  );
}
