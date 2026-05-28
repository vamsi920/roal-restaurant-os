import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { createServerSupabase } from "@/lib/supabase/server";
import { RESTAURANT_MENU_SETUP_TITLE } from "@/lib/dashboard-restaurant-labels";
import { MenuSetupWorkspace } from "./MenuSetupWorkspace";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";

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
  const supabase = await createServerSupabase();
  const setup = await loadRestaurantMenuSetupPageData(supabase, {
    restaurant,
    organizationId: restaurant.organization_id,
    membershipRole: role,
  });

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    >
      <MenuSetupWorkspace {...setup} />
    </RestaurantWorkspaceRail>
  );
}
