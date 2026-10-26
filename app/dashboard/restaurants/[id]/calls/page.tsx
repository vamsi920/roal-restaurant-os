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
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";
import { defaultAgentName } from "@/lib/trial/voices";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";

export const metadata: Metadata = {
  title: "Calls — ROAL",
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

  const [history, suggestionCount] = await Promise.all([
    loadRestaurantCallHistory(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      profile,
    }),
    countPendingKnowledgeSuggestions(supabase, restaurant.id),
  ]);
  const hostName = profile.agent_display_name?.trim() || defaultAgentName();

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestionCount}
    >
      <div className="kds-workspace min-w-0 max-w-full space-y-4">
        <header className="ws-page-head min-w-0">
          <div className="ws-page-head__row">
            <div className="min-w-0">
              <h1 className="ws-page-head__title">Calls</h1>
              <p className="ws-page-head__sub">
                Every call {hostName} took: orders, voicemail, reservations, and the ones that
                need a person.
              </p>
            </div>
          </div>
        </header>
        <RestaurantCallHistoryPanel snapshot={history} />
      </div>
    </RestaurantWorkspaceRail>
  );
}
