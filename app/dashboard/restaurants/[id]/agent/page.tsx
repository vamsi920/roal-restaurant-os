import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { RestaurantCommandCenterPanel } from "@/components/command-center/RestaurantCommandCenterPanel";
import { loadRestaurantCommandCenter } from "@/lib/command-center/load-command-center";
import { loadRestaurantLaunchGate } from "@/lib/restaurant-launch/load-checklist";
import { RestaurantLaunchGateCard } from "@/components/restaurant-launch/RestaurantLaunchGateCard";
import { loadRestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { MenuAutoSyncStatusPanel } from "@/components/voice-agent/MenuAutoSyncStatusPanel";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { VoiceAgentPanel } from "../VoiceAgentPanel";
import { VoiceAgentTestHarness } from "../VoiceAgentTestHarness";

export const metadata: Metadata = {
  title: "Live Agent — ROAL",
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  connected: "Ready",
  misconfigured: "Needs sync",
  unreachable: "API error",
  disconnected: "Not connected",
};

const STATUS_TONE: Record<string, string> = {
  connected: "bg-success/15 text-success",
  misconfigured: "bg-warning/15 text-amber-900",
  unreachable: "bg-danger/10 text-danger",
  disconnected: "bg-elev text-muted",
};

export default async function RestaurantLiveAgentPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/agent`);
    notFound();
  }

  const { restaurant, role } = access;
  const supabase = await createServerSupabase();
  const setup = await loadRestaurantMenuSetupPageData(supabase, {
    restaurant,
    organizationId: restaurant.organization_id,
    membershipRole: role,
  });
  const [commandCenter, launchGate] = await Promise.all([
    loadRestaurantCommandCenter(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    }),
    loadRestaurantLaunchGate(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      phoneWebhookFromAgent: setup.voiceAgentCenter?.lastSyncPhoneWebhook ?? null,
    }),
  ]);

  const center = setup.voiceAgentCenter;
  const menuSync = center.menuAutoSync;
  const storePhone = setup.profile?.phone?.trim() || null;

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      hasRestaurantAnalytics
      hasRestaurantBilling
    >
      <div className="kds-workspace kds-workspace--agent min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-5">
        <RestaurantLaunchGateCard gate={launchGate} compact />

        <header className="live-agent-page__header rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-subtle">Live Agent</p>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {restaurant.name}
              </h1>
            </div>

            <div className="live-agent-page__hero-badges flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider ${STATUS_TONE[center.connectionStatus] ?? STATUS_TONE.disconnected}`}
              >
                {STATUS_LABEL[center.connectionStatus] ?? STATUS_LABEL.disconnected}
              </span>
              <span className="text-muted">
                Agent {center.agentId ? "linked" : "not linked"}
              </span>
              <span className="text-subtle" aria-hidden>
                ·
              </span>
              <span className="text-muted">
                Webhook {center.lastSyncPhoneWebhook ? "configured" : "—"}
              </span>
            </div>

            <MenuAutoSyncStatusPanel
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              initial={menuSync}
              voiceOrderGate={setup.billingGates?.voice_order ?? null}
              variant="inline"
            />

            <dl className="live-agent-page__inline-meta grid gap-2 text-xs text-muted sm:grid-cols-2">
              <div>
                <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                  Store phone
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {storePhone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                  Last sync
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {center.lastSyncAt
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(center.lastSyncAt))
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <RestaurantCommandCenterPanel snapshot={commandCenter} compact />

        <VoiceAgentPanel
          embedded
          initialCenter={center}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          voiceOrderGate={setup.billingGates?.voice_order ?? null}
        />

        <details className="live-agent-page__test-call rounded-xl border border-line bg-card p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Test call tools
          </summary>
          <div className="mt-4">
            <VoiceAgentTestHarness
              restaurantId={restaurant.id}
              variant="test-call"
            />
          </div>
        </details>
      </div>
    </RestaurantWorkspaceRail>
  );
}
