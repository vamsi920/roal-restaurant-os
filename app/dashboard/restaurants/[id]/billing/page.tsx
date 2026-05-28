import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantBilling } from "@/lib/billing/load-billing";
import { createServerSupabase } from "@/lib/supabase/server";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";

export const metadata: Metadata = {
  title: "Billing — ROAL",
};

export const dynamic = "force-dynamic";

export default async function RestaurantBillingPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) {
      redirect(`/login?next=/dashboard/restaurants/${params.id}/billing`);
    }
    notFound();
  }

  const { restaurant, role } = access;
  const supabase = await createServerSupabase();
  const snapshot = await loadRestaurantBilling(supabase, {
    organizationId: restaurant.organization_id,
    membershipRole: role,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
  });

  if (!snapshot) {
    redirect("/dashboard/onboarding");
  }

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      hasRestaurantAnalytics
      hasRestaurantBilling
    >
      <BillingDashboard
        snapshot={snapshot}
        orgBillingHref="/dashboard/billing"
      />
    </RestaurantWorkspaceRail>
  );
}
