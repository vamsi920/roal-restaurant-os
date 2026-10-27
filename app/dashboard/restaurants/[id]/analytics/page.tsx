import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { loadRestaurantAnalytics } from "@/lib/analytics/load-analytics";
import { getDb } from "@/lib/db";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";

export const metadata: Metadata = {
  title: "Reports — ROAL",
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
  const supabase = getDb();
  const [snapshot, suggestionCount] = await Promise.all([
    loadRestaurantAnalytics(supabase, {
      organizationId: restaurant.organization_id,
      organizationName: membership.organization.name,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      rangeKey: searchParams.range,
    }),
    countPendingKnowledgeSuggestions(supabase, restaurant.id),
  ]);

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      hasRestaurantAnalytics
      suggestionCount={suggestionCount}
    >
      <AnalyticsDashboard
        snapshot={snapshot}
        ordersHref={`/dashboard/restaurants/${restaurant.id}`}
      />
    </RestaurantWorkspaceRail>
  );
}
