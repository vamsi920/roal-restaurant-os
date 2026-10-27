import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { getDb } from "@/lib/db";
import { RESTAURANT_MENU_SETUP_TITLE } from "@/lib/dashboard-restaurant-labels";
import { MenuSetupWorkspace } from "./MenuSetupWorkspace";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";

export const metadata: Metadata = {
  title: `${RESTAURANT_MENU_SETUP_TITLE} — ROAL`,
};

export const dynamic = "force-dynamic";

export default async function RestaurantMenuSetupPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/menu`);
    notFound();
  }

  const { restaurant, role } = access;
  const supabase = getDb();
  const [setup, suggestionCount] = await Promise.all([
    loadRestaurantMenuSetupPageData(supabase, {
      restaurant,
      organizationId: restaurant.organization_id,
      membershipRole: role,
    }),
    countPendingKnowledgeSuggestions(supabase, restaurant.id),
  ]);

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestionCount}
    >
      <MenuSetupWorkspace {...setup} />
    </RestaurantWorkspaceRail>
  );
}
