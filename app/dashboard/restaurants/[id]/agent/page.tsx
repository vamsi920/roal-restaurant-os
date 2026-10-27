import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import {
  getAuthContext,
  getRestaurantAccessForPage,
} from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
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
import { Badge, PageHeader, formatRelative, type Tone } from "@/components/ui";
import { CollapsiblePanel, MetaList } from "@/components/live-orders/workspace-ui";
import {
  AdvancedLink,
  AdvancedSection,
  PhoneHostHashOpener,
} from "@/components/voice-agent/phone-host-ui";
import { PHONE_HOST_ADVANCED_ID } from "@/components/voice-agent/phone-host-ids";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";
import { VoiceAgentPanel } from "../VoiceAgentPanel";
import { VoiceAgentTestHarness } from "../VoiceAgentTestHarness";

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

const STATUS_TONE: Record<string, Tone> = {
  connected: "ok",
  misconfigured: "warn",
  unreachable: "bad",
  disconnected: "neutral",
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
  const supabase = getDb();
  const setup = await loadRestaurantMenuSetupPageData(supabase, {
    restaurant,
    organizationId: restaurant.organization_id,
    membershipRole: role,
  });
  const [launchGate, suggestions, scorecardRow] = await Promise.all([
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
  const hostName = profile.agent_display_name?.trim() || defaultAgentName(profile.agent_voice_id);
  const voiceLabel =
    profile.agent_voice_label?.trim() || findTrialVoice(profile.agent_voice_id)?.label || null;
  const scorecard = parseScorecard(scorecardRow?.data?.trial_scorecard);
  const agentReady = Boolean(profile.elevenlabs_agent_id?.trim());
  const outboundAvailable = Boolean(getElevenLabsAgentPhoneNumberId()) && dialable(storePhone);
  const voiceOrderGate = setup.billingGates?.voice_order ?? null;
  const statusKey = center.connectionStatus;

  const status = {
    label: STATUS_LABEL[statusKey] ?? STATUS_LABEL.disconnected,
    tone: STATUS_TONE[statusKey] ?? "neutral",
  };
  const syncedRelative = center.lastSyncAt ? formatRelative(center.lastSyncAt) : "";
  const subtitle = [
    `${hostName} answers ${restaurant.name}`,
    voiceLabel ? `${voiceLabel} voice` : null,
    syncedRelative ? `synced ${syncedRelative}` : "not synced yet",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestions.length}
    >
      <div className="phone-host mx-auto w-full min-w-0 max-w-[1120px] space-y-4 sm:space-y-5">
        <PageHeader
          title={RESTAURANT_PHONE_HOST_LABEL}
          subtitle={subtitle}
          actions={
            <>
              <MenuAutoSyncStatusPanel
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                initial={menuSync}
                voiceOrderGate={voiceOrderGate}
                variant="inline"
              />
              <AdvancedLink className="btn-ghost btn-sm">
                <Settings2 size={14} aria-hidden />
                Advanced
              </AdvancedLink>
            </>
          }
        />

        {launchGate.phase !== "ready" ? (
          <RestaurantLaunchGateCard gate={launchGate} compact />
        ) : null}

        <PhoneHostTestCall
          restaurantId={restaurant.id}
          organizationId={restaurant.organization_id}
          restaurantName={restaurant.name}
          hostName={hostName}
          voiceLabel={voiceLabel}
          status={status}
          agentReady={agentReady}
          outboundAvailable={outboundAvailable}
          restaurantPhone={storePhone}
          initialScorecard={scorecard}
        />

        <div className="grid min-w-0 items-start gap-4 sm:gap-5 lg:grid-cols-2">
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

        <PhoneHostHashOpener />
        <CollapsiblePanel
          id={PHONE_HOST_ADVANCED_ID}
          title="Advanced"
          hint="Connection, diagnostics, and tool scenarios"
          bodyClassName="space-y-6"
        >
          <VoiceAgentPanel
            embedded
            initialCenter={center}
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            voiceOrderGate={voiceOrderGate}
            summary={
              <div className="rounded-[12px] border border-line bg-elev px-3.5 py-3">
                <MetaList
                  items={[
                    { label: "Store phone", value: storePhone ?? "Not set" },
                    {
                      label: "Agent",
                      value: (
                        <Badge tone={center.agentId ? "ok" : "neutral"}>
                          {center.agentId ? "Linked" : "Not linked"}
                        </Badge>
                      ),
                    },
                    {
                      label: "Phone webhook",
                      value: (
                        <Badge tone={center.lastSyncPhoneWebhook ? "ok" : "neutral"}>
                          {center.lastSyncPhoneWebhook ? "Configured" : "Not configured"}
                        </Badge>
                      ),
                    },
                  ]}
                />
              </div>
            }
          />

          <AdvancedSection
            id="tool-scenarios"
            title="Tool scenarios"
            hint="Dry-run the order tools without a call."
            className="border-t border-line pt-5"
          >
            <VoiceAgentTestHarness restaurantId={restaurant.id} variant="test-call" flowStep />
          </AdvancedSection>
        </CollapsiblePanel>
      </div>
    </RestaurantWorkspaceRail>
  );
}
