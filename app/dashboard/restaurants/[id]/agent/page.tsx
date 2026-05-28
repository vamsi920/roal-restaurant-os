import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadRestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { VoiceAgentPanel } from "../VoiceAgentPanel";
import { VoiceAgentTestHarness } from "../VoiceAgentTestHarness";

export const metadata: Metadata = {
  title: "Live Agent — ROAL",
};

export const dynamic = "force-dynamic";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusTone(status: string): string {
  switch (status) {
    case "connected":
      return "bg-success/15 text-success";
    case "misconfigured":
      return "bg-warning/15 text-amber-900";
    case "unreachable":
      return "bg-danger/10 text-danger";
    default:
      return "bg-elev text-muted";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "connected":
      return "Ready";
    case "misconfigured":
      return "Needs sync";
    case "unreachable":
      return "API error";
    default:
      return "Not connected";
  }
}

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

function menuSyncBadgeLabel(center: VoiceAgentControlCenterSnapshot): string {
  if (center.lastSyncError) return "Menu error";
  if (!center.lastSyncAt) return "Not synced";
  if (center.lastSyncToolsBaked) return "Menu synced";
  return "Partial sync";
}

function menuSyncSummary(center: VoiceAgentControlCenterSnapshot): string {
  if (center.lastSyncError) return "Menu sync needs attention";
  if (!center.lastSyncAt) return "Menu not synced to agent yet";
  if (center.lastSyncToolsBaked) return "Menu synced for phone orders";
  return "Menu partially synced";
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
                  className={`rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider ${statusTone(setup.voiceAgentCenter.connectionStatus)}`}
                >
                  {statusLabel(setup.voiceAgentCenter.connectionStatus)}
                </span>
                <span
                  className={`live-agent-page__menu-sync rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider sm:hidden ${
                    setup.voiceAgentCenter.lastSyncError
                      ? "bg-danger/10 text-danger"
                      : setup.voiceAgentCenter.lastSyncAt &&
                          setup.voiceAgentCenter.lastSyncToolsBaked
                        ? "bg-success/15 text-success"
                        : "bg-elev text-muted"
                  }`}
                >
                  {menuSyncBadgeLabel(setup.voiceAgentCenter)}
                </span>
                {setup.voiceAgentCenter.agentDisplayName ? (
                  <span className="hidden text-muted sm:inline">
                    {setup.voiceAgentCenter.agentDisplayName}
                  </span>
                ) : null}
              </div>
              {setup.voiceAgentCenter.lastSyncError ? (
                <p
                  className="live-agent-page__hero-line mt-2 text-sm leading-snug text-danger [overflow-wrap:anywhere] sm:hidden"
                  role="alert"
                >
                  {setup.voiceAgentCenter.lastSyncError}
                </p>
              ) : (
                <p className="live-agent-page__hero-line mt-2 text-sm leading-snug text-muted sm:hidden">
                  {menuSyncSummary(setup.voiceAgentCenter)}
                </p>
              )}
            </div>

            <a
              href="#agent-controls"
              className="btn-primary kds-thumb-btn inline-flex min-h-11 w-full items-center justify-center px-4 text-sm font-semibold sm:w-auto"
            >
              {primaryActionLabel(setup.voiceAgentCenter.connectionStatus)}
            </a>
          </div>

          <dl className="live-agent-page__stats mt-4 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Agent status
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {statusLabel(setup.voiceAgentCenter.connectionStatus)}
              </dd>
            </div>
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Linked agent
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {setup.voiceAgentCenter.agentId ? "Linked" : "—"}
              </dd>
            </div>
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Menu sync
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {setup.voiceAgentCenter.lastSyncError
                  ? "Error"
                  : setup.voiceAgentCenter.lastSyncAt
                    ? setup.voiceAgentCenter.lastSyncToolsBaked
                      ? "Synced"
                      : "Partial"
                    : "—"}
              </dd>
            </div>
            <div className="live-agent-page__stat min-w-0 rounded-xl border border-line bg-elev/40 px-3 py-2">
              <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
                Last sync
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink [overflow-wrap:anywhere]">
                {formatWhen(setup.voiceAgentCenter.lastSyncAt)}
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
                  {setup.voiceAgentCenter.envReady ? "Yes" : "No"}
                </span>
              </span>
              <span>
                Phone webhook:{" "}
                <span className="font-medium text-ink">
                  {setup.voiceAgentCenter.lastSyncPhoneWebhook
                    ? "Configured"
                    : "—"}
                </span>
              </span>
              {setup.voiceAgentCenter.lastSyncError ? (
                <span className="live-agent-page__sync-error text-danger [overflow-wrap:anywhere]">
                  Last sync error: {setup.voiceAgentCenter.lastSyncError}
                </span>
              ) : null}
            </div>
          </details>

          <div className="live-agent-page__meta live-agent-page__meta--detail mt-4 hidden flex-wrap gap-x-2 gap-y-1 text-xs text-muted sm:flex">
            <span>
              Server ready:{" "}
              <span className="font-medium text-ink">
                {setup.voiceAgentCenter.envReady ? "Yes" : "No"}
              </span>
            </span>
            <span className="text-subtle" aria-hidden>
              ·
            </span>
            <span>
              Phone webhook:{" "}
              <span className="font-medium text-ink">
                {setup.voiceAgentCenter.lastSyncPhoneWebhook ? "Configured" : "—"}
              </span>
            </span>
            {setup.voiceAgentCenter.lastSyncError ? (
              <>
                <span className="text-subtle" aria-hidden>
                  ·
                </span>
                <span className="live-agent-page__sync-error text-danger [overflow-wrap:anywhere]">
                  Last sync error: {setup.voiceAgentCenter.lastSyncError}
                </span>
              </>
            ) : null}
          </div>
        </header>

        <div id="agent-controls" className="scroll-mt-28" />
        <VoiceAgentPanel
          embedded
          initialCenter={setup.voiceAgentCenter}
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

