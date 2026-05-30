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
import { loadRestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { MenuAutoSyncStatusPanel } from "@/components/voice-agent/MenuAutoSyncStatusPanel";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { VoiceAgentPanel } from "../VoiceAgentPanel";
import { RestaurantLaunchChecklist } from "@/components/restaurant-launch/RestaurantLaunchChecklist";
import { loadRestaurantLaunchChecklist } from "@/lib/restaurant-launch/load-checklist";
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

function primaryActionLabel(status: string): string {
  switch (status) {
    case "connected":
      return "Re-sync agent";
    case "misconfigured":
      return "Re-sync now";
    case "unreachable":
      return "Refresh status";
    default:
      return "Connect & sync";
  }
}

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
  const [setup, commandCenter] = await Promise.all([
    loadRestaurantMenuSetupPageData(supabase, {
      restaurant,
      organizationId: restaurant.organization_id,
      membershipRole: role,
    }),
    loadRestaurantCommandCenter(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    }),
  ]);

  const center = setup.voiceAgentCenter;
  const launchChecklist = await loadRestaurantLaunchChecklist(supabase, {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    phoneWebhookFromAgent: center.lastSyncPhoneWebhook,
  });
  const menuSync = center.menuAutoSync;

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    >
      <div className="kds-workspace kds-workspace--agent min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-5">
        <header className="live-agent-page__header rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-subtle">Live Agent</p>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {restaurant.name}
              </h1>
              <div className="live-agent-page__hero-badges mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider ${STATUS_TONE[center.connectionStatus] ?? STATUS_TONE.disconnected}`}
                >
                  {STATUS_LABEL[center.connectionStatus] ?? STATUS_LABEL.disconnected}
                </span>
                {center.agentDisplayName ? (
                  <span className="hidden text-muted sm:inline">
                    {center.agentDisplayName}
                  </span>
                ) : null}
              </div>
            </div>

            <a
              href="#menu-auto-sync"
              className="btn-primary kds-thumb-btn inline-flex min-h-11 w-full items-center justify-center px-4 text-sm font-semibold sm:w-auto"
            >
              {primaryActionLabel(center.connectionStatus)}
            </a>
          </div>

          <dl className="live-agent-page__stats mt-4 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Agent status
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {STATUS_LABEL[center.connectionStatus] ?? STATUS_LABEL.disconnected}
              </dd>
            </div>
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Linked agent
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {center.agentId ? "Linked" : "—"}
              </dd>
            </div>
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Menu auto-sync
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {menuSync.status === "syncing"
                  ? "Syncing"
                  : menuSync.status === "failed"
                    ? "Error"
                    : menuSync.status === "succeeded"
                      ? "Synced"
                      : menuSync.agentLinked
                        ? "Not synced"
                        : "—"}
              </dd>
            </div>
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Last synced
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink [overflow-wrap:anywhere]">
                {menuSync.lastSyncedAt && menuSync.status === "succeeded"
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(menuSync.lastSyncedAt))
                  : "—"}
              </dd>
            </div>
          </dl>

          <details className="live-agent-page__meta-details mt-3 sm:hidden">
            <summary className="text-xs font-medium text-muted">
              Server &amp; webhook details
            </summary>
            <div className="live-agent-page__meta live-agent-page__meta--detail mt-2 flex flex-col gap-1 text-xs text-muted">
              <span>
                Server ready:{" "}
                <span className="font-medium text-ink">
                  {center.envReady ? "Yes" : "No"}
                </span>
              </span>
              <span>
                Phone webhook:{" "}
                <span className="font-medium text-ink">
                  {center.lastSyncPhoneWebhook ? "Configured" : "—"}
                </span>
              </span>
              {menuSync.error ? (
                <span className="live-agent-page__sync-error text-danger [overflow-wrap:anywhere]">
                  Menu sync error: {menuSync.error}
                </span>
              ) : null}
            </div>
          </details>

          <div className="live-agent-page__meta live-agent-page__meta--detail mt-4 hidden flex-wrap gap-x-2 gap-y-1 text-xs text-muted sm:flex">
            <span>
              Server ready:{" "}
              <span className="font-medium text-ink">
                {center.envReady ? "Yes" : "No"}
              </span>
            </span>
            <span className="text-subtle" aria-hidden>
              ·
            </span>
            <span>
              Phone webhook:{" "}
              <span className="font-medium text-ink">
                {center.lastSyncPhoneWebhook ? "Configured" : "—"}
              </span>
            </span>
            {menuSync.error ? (
              <>
                <span className="text-subtle" aria-hidden>
                  ·
                </span>
                <span className="live-agent-page__sync-error text-danger [overflow-wrap:anywhere]">
                  Menu sync error: {menuSync.error}
                </span>
              </>
            ) : null}
          </div>
        </header>

        <div id="launch-checklist" className="scroll-mt-28">
          <RestaurantLaunchChecklist snapshot={launchChecklist} />
        </div>

        <RestaurantCommandCenterPanel snapshot={commandCenter} />

        <div id="menu-auto-sync" className="scroll-mt-28">
          <MenuAutoSyncStatusPanel
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            initial={menuSync}
            voiceOrderGate={setup.billingGates?.voice_order ?? null}
          />
        </div>

        <div id="agent-controls" className="scroll-mt-28" />
        <VoiceAgentPanel
          embedded
          initialCenter={center}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          voiceOrderGate={setup.billingGates?.voice_order ?? null}
        />

        <VoiceAgentTestHarness
          restaurantId={restaurant.id}
          variant="test-call"
        />
      </div>
    </RestaurantWorkspaceRail>
  );
}
