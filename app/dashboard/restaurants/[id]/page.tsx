import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { createServerSupabase, getServiceRoleSupabase } from "@/lib/supabase/server";
import type { DraftOrderRow, PhoneOrderReceiptRow } from "@/lib/types";
import { LiveOrdersPanel } from "./LiveOrdersPanel";
import { RestaurantWorkspaceRail } from "./RestaurantWorkspaceRail";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import { notifyStuckOrdersForOrganization } from "@/lib/notifications/stuck-orders";
import { RESTAURANT_LIVE_ORDERS_LABEL } from "@/lib/dashboard-restaurant-labels";

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

  const db = getServiceRoleSupabase() ?? (await createServerSupabase());

  const { data: draftOrders, error: draftErr } = await db
    .from("draft_orders")
    .select("*")
    .eq("restaurant_id", params.id)
    .order("updated_at", { ascending: false });

  if (draftErr) {
    console.error("draft_orders load", draftErr.message);
  }

  const { data: receiptRows, error: receiptErr } = await db
    .from("phone_order_receipts")
    .select("*")
    .eq("restaurant_id", params.id)
    .order("created_at", { ascending: false })
    .limit(150);

  if (receiptErr) {
    console.error("phone_order_receipts load", receiptErr.message);
  }

  const initialDraftOrders: DraftOrderRow[] =
    (draftOrders as DraftOrderRow[]) ?? [];
  const initialReceipts: PhoneOrderReceiptRow[] = receiptErr
    ? []
    : ((receiptRows as PhoneOrderReceiptRow[]) ?? []);
  const ordersLoadError =
    draftErr?.message ?? receiptErr?.message ?? null;

  const pricingSettings = orderPricingFromProfile(profile);

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    >
      <div className="kds-workspace kds-workspace--orders min-w-0 w-full max-w-full">
        <LiveOrdersPanel
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          menuItems={menu.items}
          menuModifiers={menu.modifiers}
          pricingSettings={pricingSettings}
          initialDraftOrders={initialDraftOrders}
          initialReceipts={initialReceipts}
          initialLoadError={ordersLoadError}
        />
      </div>
    </RestaurantWorkspaceRail>
  );
}
