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
import { notifyStuckActiveCallsForOrganization } from "@/lib/notifications/stuck-active-calls";
import { RESTAURANT_LIVE_ORDERS_LABEL } from "@/lib/dashboard-restaurant-labels";
import { loadLiveOrdersPageData } from "@/lib/live-orders/load-live-orders-page";
import { PhoneAgentReadinessStrip } from "@/components/live-orders/PhoneAgentReadinessStrip";
import { RecentPhoneOutcomesPanel } from "@/components/live-orders/RecentPhoneOutcomesPanel";
import { WelcomeGoLiveCard } from "@/components/live-orders/WelcomeGoLiveCard";
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";
import { loadVoiceAgentControlCenter } from "@/lib/voice-agent/load-control-center";
import { getPublicEnv } from "@/lib/env.public";
import { supabaseProjectRefFromUrl } from "@/lib/supabaseProjectRef";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { defaultAgentName } from "@/lib/trial/voices";
import type { RestaurantProfile } from "@/lib/types";

export const metadata: Metadata = {
  title: `${RESTAURANT_LIVE_ORDERS_LABEL} — ROAL`,
};

export const dynamic = "force-dynamic";

const PHONE_PATTERN = /\+?1?[ (]?\d{3}[) .-]?\d{3}[ .-]?\d{4}\b/;

/**
 * The ElevenLabs number is not stored in the DB. When the control-center
 * snapshot's checklist mentions one, surface it; otherwise fall back to mailto.
 */
async function loadForwardingNumber(
  restaurantId: string,
  restaurantName: string,
  profile: RestaurantProfile
): Promise<string | null> {
  try {
    const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
    const center = await loadVoiceAgentControlCenter({
      restaurantId,
      restaurantName,
      edgeBase: supabaseUrl.replace(/\/$/, ""),
      supabaseRef: supabaseProjectRefFromUrl(supabaseUrl),
      profile,
    });
    for (const item of center.checklist) {
      if (!/phone|number|twilio/i.test(item.label)) continue;
      const match = `${item.label} ${item.detail ?? ""}`.match(PHONE_PATTERN);
      if (match) return match[0].trim();
    }
  } catch {
    // Snapshot is optional for the welcome card.
  }
  return null;
}

export default async function RestaurantKDSPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { welcome?: string };
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
  const restaurantNames = new Map(
    (orgRestaurants ?? []).map((r) => [r.id as string, r.name as string])
  );
  void notifyStuckOrdersForOrganization(supabase, {
    organizationId: restaurant.organization_id,
    restaurantNames,
  });
  void notifyStuckActiveCallsForOrganization(supabase, {
    organizationId: restaurant.organization_id,
    restaurantNames,
  });

  const profile = await ensureRestaurantProfile(
    supabase,
    restaurant.id,
    restaurant.organization_id
  );

  const showWelcome = searchParams?.welcome === "1";

  const menu = await loadRestaurantMenu(supabase, params.id);
  const ordersDb = getServiceRoleSupabase() ?? supabase;

  const [pageData, suggestionCount, forwardingNumber] = await Promise.all([
    loadLiveOrdersPageData(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      profile,
      ordersDb,
    }),
    countPendingKnowledgeSuggestions(supabase, restaurant.id),
    showWelcome
      ? loadForwardingNumber(restaurant.id, restaurant.name, profile)
      : Promise.resolve<string | null>(null),
  ]);

  if (pageData.ordersLoadError) {
    console.error("live orders load", pageData.ordersLoadError);
  }

  const pricingSettings = orderPricingFromProfile(profile);
  const hostName = profile.agent_display_name?.trim() || defaultAgentName();

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestionCount}
    >
      <div className="kds-workspace kds-workspace--orders min-w-0 w-full max-w-full space-y-4">
        {showWelcome ? (
          <WelcomeGoLiveCard
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            hostName={hostName}
            forwardingNumber={forwardingNumber}
            supportEmail={CONTACT_PILOT_EMAIL}
          />
        ) : null}

        <header className="ws-page-head min-w-0">
          <div className="ws-page-head__row">
            <div className="min-w-0">
              <h1 className="ws-page-head__title">{RESTAURANT_LIVE_ORDERS_LABEL}</h1>
              <p className="ws-page-head__sub">
                Tickets from {hostName}, live calls, and anything that needs a human.
              </p>
            </div>
          </div>
          <PhoneAgentReadinessStrip
            restaurantId={restaurant.id}
            launchGate={pageData.launchGate}
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
            peakCallContext={pageData.peakCallContext}
            actionNeededCount={pageData.actionNeededCount}
            callsHref={`/dashboard/restaurants/${restaurant.id}/calls`}
          />
        </div>
      </div>
    </RestaurantWorkspaceRail>
  );
}
