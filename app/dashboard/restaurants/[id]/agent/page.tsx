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
import { PhoneHostTestCall } from "@/components/voice-agent/PhoneHostTestCall";
import { HostPersonaCard } from "@/components/voice-agent/HostPersonaCard";
import { KnowledgeSuggestionsInbox } from "@/components/restaurant-knowledge/KnowledgeSuggestionsInbox";
import { loadKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";
import { getElevenLabsAgentPhoneNumberId } from "@/lib/env.server";
import { defaultAgentName, findTrialVoice } from "@/lib/trial/voices";
import type { TrialScorecard } from "@/lib/trial/types";
import { RESTAURANT_PHONE_HOST_LABEL } from "@/lib/restaurant-workspace-nav";
import { cn } from "@/lib/cn";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { VoiceAgentPanel } from "../VoiceAgentPanel";
import { VoiceAgentTestHarness } from "../VoiceAgentTestHarness";
import "@/app/dashboard/restaurants/[id]/kds-workspace.css";

export const metadata: Metadata = {
  title: `${RESTAURANT_PHONE_HOST_LABEL} — ROAL`,
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  connected: "Ready",
  misconfigured: "Needs sync",
  unreachable: "API error",
  disconnected: "Not connected",
};

const STATUS_CHIP: Record<string, string> = {
  connected: "chip--success",
  misconfigured: "chip--warning",
  unreachable: "chip--danger",
  disconnected: "",
};

function dialable(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  return value.trim().startsWith("+") && digits.length >= 10 && digits.length <= 15;
}

function parseScorecard(value: unknown): TrialScorecard {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: TrialScorecard = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === true) (out as Record<string, boolean>)[k] = true;
  }
  return out;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default async function RestaurantPhoneHostPage({
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
  const [commandCenter, launchGate, suggestions, scorecardRow] = await Promise.all([
    loadRestaurantCommandCenter(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    }),
    loadRestaurantLaunchGate(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      phoneWebhookFromAgent: setup.voiceAgentCenter?.lastSyncPhoneWebhook ?? null,
    }),
    loadKnowledgeSuggestions(supabase, restaurant.id, { status: "pending" }).catch(
      () => []
    ),
    supabase
      .from("restaurant_profiles")
      .select("trial_scorecard")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle(),
  ]);

  const center = setup.voiceAgentCenter;
  const profile = setup.profile;
  const menuSync = center.menuAutoSync;
  const storePhone = profile.phone?.trim() || null;
  const hostName = profile.agent_display_name?.trim() || defaultAgentName();
  const voiceLabel =
    profile.agent_voice_label?.trim() || findTrialVoice(profile.agent_voice_id)?.label || null;
  const scorecard = parseScorecard(scorecardRow?.data?.trial_scorecard);
  const agentReady = Boolean(profile.elevenlabs_agent_id?.trim());
  const outboundAvailable = Boolean(getElevenLabsAgentPhoneNumberId()) && dialable(storePhone);
  const voiceOrderGate = setup.billingGates?.voice_order ?? null;
  const statusKey = center.connectionStatus;

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestions.length}
    >
      <div className="kds-workspace kds-workspace--agent phone-host min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-5">
        <header className="ws-page-head live-agent-page__header min-w-0">
          <div className="ws-page-head__row">
            <div className="min-w-0">
              <p className="ws-page-head__eyebrow">{RESTAURANT_PHONE_HOST_LABEL}</p>
              <h1 className="ws-page-head__title">
                {hostName}
                <span className={cn("chip ml-2 align-middle", STATUS_CHIP[statusKey] ?? "")}>
                  {STATUS_LABEL[statusKey] ?? STATUS_LABEL.disconnected}
                </span>
              </h1>
              <p className="ws-page-head__sub">
                Answers for {restaurant.name}
                {voiceLabel ? ` · ${voiceLabel} voice` : ""}
                {center.lastSyncAt ? ` · synced ${formatWhen(center.lastSyncAt)}` : ""}
              </p>
            </div>
            <div className="ws-page-head__tools">
              <MenuAutoSyncStatusPanel
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                initial={menuSync}
                voiceOrderGate={voiceOrderGate}
                variant="inline"
              />
            </div>
          </div>
          <dl className="live-agent-page__inline-meta ws-page-head__meta">
            <div>
              <dt>Store phone</dt>
              <dd>{storePhone ?? "—"}</dd>
            </div>
            <div>
              <dt>Agent</dt>
              <dd>{center.agentId ? "Linked" : "Not linked"}</dd>
            </div>
            <div>
              <dt>Phone webhook</dt>
              <dd>{center.lastSyncPhoneWebhook ? "Configured" : "—"}</dd>
            </div>
          </dl>
        </header>

        {launchGate.phase !== "ready" ? (
          <RestaurantLaunchGateCard gate={launchGate} compact />
        ) : null}

        <PhoneHostTestCall
          restaurantId={restaurant.id}
          organizationId={restaurant.organization_id}
          restaurantName={restaurant.name}
          hostName={hostName}
          agentReady={agentReady}
          outboundAvailable={outboundAvailable}
          restaurantPhone={storePhone}
          initialScorecard={scorecard}
        />

        <div className="phone-host__grid">
          <KnowledgeSuggestionsInbox
            restaurantId={restaurant.id}
            hostName={hostName}
            suggestions={suggestions}
          />
          <HostPersonaCard
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            initialName={profile.agent_display_name}
            initialVoiceId={profile.agent_voice_id}
            initialGreeting={profile.agent_greeting}
          />
        </div>

        <RestaurantCommandCenterPanel snapshot={commandCenter} compact />

        <details className="phone-host__details card">
          <summary className="phone-host__summary">
            <span>Connection &amp; diagnostics</span>
            <span className="phone-host__summary-hint">
              Agent ID, sync, secrets, webhook URLs
            </span>
          </summary>
          <div className="phone-host__details-body">
            <VoiceAgentPanel
              embedded
              initialCenter={center}
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              voiceOrderGate={voiceOrderGate}
            />
          </div>
        </details>

        <details className="phone-host__details card">
          <summary className="phone-host__summary">
            <span>Tool scenarios</span>
            <span className="phone-host__summary-hint">
              Dry-run the order tools without a call
            </span>
          </summary>
          <div className="phone-host__details-body">
            <VoiceAgentTestHarness restaurantId={restaurant.id} variant="test-call" flowStep />
          </div>
        </details>
      </div>
    </RestaurantWorkspaceRail>
  );
}
