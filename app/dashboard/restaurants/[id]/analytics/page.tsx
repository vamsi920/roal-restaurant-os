import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { loadRestaurantAnalytics } from "@/lib/analytics/load-analytics";
import { createServerSupabase } from "@/lib/supabase/server";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";

export const metadata: Metadata = {
  title: "Analytics — ROAL",
};

export const dynamic = "force-dynamic";

export default async function RestaurantAnalyticsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { range?: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) {
      redirect(`/login?next=/dashboard/restaurants/${params.id}/analytics`);
    }
    notFound();
  }

  const { restaurant, membership } = access;
  const supabase = await createServerSupabase();
  const snapshot = await loadRestaurantAnalytics(supabase, {
    organizationId: restaurant.organization_id,
    organizationName: membership.organization.name,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    rangeKey: searchParams.range,
  });

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      hasRestaurantAnalytics
    >
      <AnalyticsDashboard
        snapshot={snapshot}
        ordersHref={`/dashboard/restaurants/${restaurant.id}`}
      />
    </RestaurantWorkspaceRail>
  );
}
