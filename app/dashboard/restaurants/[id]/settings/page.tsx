import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getAuthContext, getRestaurantAccessForPage } from "@/lib/auth/context-server";
import { loadRestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { getDb } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { countPendingKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { RestaurantHoursSettings } from "../RestaurantHoursSettings";
import { RestaurantProfileSettings } from "../RestaurantProfileSettings";
import { RegisterConnectionSettings } from "../RegisterConnectionSettings";
import { isOrgAdmin } from "@/lib/auth/roles";
import { getCloverConfig } from "@/lib/pos/clover";
import { isPlatformAdminSession } from "@/lib/auth/internal-access";
import { loadPosConnection, summarizePosConnection } from "@/lib/pos/connections";

export const metadata: Metadata = { title: "Settings — ROAL" };
export const dynamic = "force-dynamic";

/** Restaurant details, hours, FAQs, upsells and handoff: what the host tells callers about this location. */
export default async function RestaurantSettingsPage({ params }: { params: { id: string } }) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/settings`);
    notFound();
  }

  const { restaurant, role } = access;
  const db = getDb();
  const [setup, suggestionCount, posConnection] = await Promise.all([
    loadRestaurantMenuSetupPageData(db, {
      restaurant,
      organizationId: restaurant.organization_id,
      membershipRole: role,
    }),
    countPendingKnowledgeSuggestions(db, restaurant.id),
    loadPosConnection(db, restaurant.id).catch(() => null),
  ]);
  // The register card appears once ROAL's Clover app keys are set (or a connection already exists).
  // While the keys are Clover sandbox keys, only platform staff see it, so owners never connect a test app.
  const clover = getCloverConfig();
  const showRegister =
    Boolean(posConnection) ||
    clover?.environment === "production" ||
    (clover?.environment === "sandbox" && (await isPlatformAdminSession()));
  const hostName = setup.profile.agent_display_name?.trim() || "your phone host";

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestionCount}
    >
      <div id="restaurant-settings" className="mx-auto w-full min-w-0 max-w-[1200px] space-y-6">
        <PageHeader
          title="Settings"
          subtitle={`What ${hostName} tells callers about your restaurant: details, hours, answers to common questions.`}
        />
        <RestaurantProfileSettings
          restaurant={setup.restaurant}
          profile={setup.profile}
          knowledgeEntries={setup.knowledgeEntries}
          upsellRules={setup.upsellRules}
          menu={setup.menu}
          hoursSlot={
            setup.hoursBundle ? (
              <RestaurantHoursSettings restaurantId={restaurant.id} bundle={setup.hoursBundle} />
            ) : null
          }
        />
        {showRegister ? (
          <RegisterConnectionSettings
            restaurantId={restaurant.id}
            connection={summarizePosConnection(posConnection)}
            canManage={isOrgAdmin(role)}
            roalTaxPercent={Number(setup.profile.tax_rate_percent) || 0}
          />
        ) : null}
      </div>
    </RestaurantWorkspaceRail>
  );
}
