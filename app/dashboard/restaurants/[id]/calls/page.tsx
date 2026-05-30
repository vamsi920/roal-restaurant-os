import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { RestaurantCallHistoryPanel } from "@/components/call-history/RestaurantCallHistoryPanel";
import { loadRestaurantCallHistory } from "@/lib/call-history/load-call-history";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { createServerSupabase } from "@/lib/supabase/server";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";

export const metadata: Metadata = {
  title: "Call history — ROAL",
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
  const supabase = await createServerSupabase();
  const profile = await ensureRestaurantProfile(
    supabase,
    restaurant.id,
    restaurant.organization_id
  );

  const history = await loadRestaurantCallHistory(supabase, {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    profile,
  });

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    >
      <div className="kds-workspace min-w-0 max-w-full space-y-4">
        <header className="min-w-0">
          <p className="text-xs font-medium text-subtle">Phone operations</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {restaurant.name}
          </h1>
        </header>
        <RestaurantCallHistoryPanel snapshot={history} />
      </div>
    </RestaurantWorkspaceRail>
  );
}
