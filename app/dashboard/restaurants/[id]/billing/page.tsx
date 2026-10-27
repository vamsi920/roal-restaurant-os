import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { loadRestaurantBilling } from "@/lib/billing/load-billing";
import { getDb } from "@/lib/db";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";

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
  const supabase = getDb();
  const [snapshot, suggestionCount] = await Promise.all([
    loadRestaurantBilling(supabase, {
      organizationId: restaurant.organization_id,
      membershipRole: role,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    }),
    countPendingKnowledgeSuggestions(supabase, restaurant.id),
  ]);

  if (!snapshot) {
    redirect("/dashboard/onboarding");
  }

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      hasRestaurantAnalytics
      hasRestaurantBilling
      suggestionCount={suggestionCount}
    >
      <BillingDashboard
        snapshot={snapshot}
        orgBillingHref="/dashboard/billing"
      />
    </RestaurantWorkspaceRail>
  );
}
