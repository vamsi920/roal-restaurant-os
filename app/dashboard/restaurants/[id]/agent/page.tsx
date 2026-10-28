import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getAuthContext, getRestaurantAccessForPage } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { getElevenLabsAgentId, getElevenLabsAgentPhoneNumberId } from "@/lib/env.server";
import { PhoneHostTestCall } from "@/components/voice-agent/PhoneHostTestCall";
import { HostPersonaCard } from "@/components/voice-agent/HostPersonaCard";
import { PhoneNumberCard } from "@/components/voice-agent/PhoneNumberCard";
import { KnowledgeSuggestionsInbox } from "@/components/restaurant-knowledge/KnowledgeSuggestionsInbox";
import { loadKnowledgeSuggestions } from "@/lib/knowledge-suggestions/helpers";
import { defaultAgentName, findTrialVoice } from "@/lib/trial/voices";
import type { TrialScorecard } from "@/lib/trial/types";
import type { RestaurantProfile } from "@/lib/types";
import { RESTAURANT_PHONE_HOST_LABEL } from "@/lib/restaurant-workspace-nav";
import { voiceHostStateFromProfile, type VoiceHostState } from "@/lib/voice-agent/ensure-voice-host";
import { Notice } from "@/components/live-orders/workspace-ui";
import { PageHeader, type Tone } from "@/components/ui";
import { RestaurantWorkspaceRail } from "../RestaurantWorkspaceRail";

export const metadata: Metadata = {
  title: `${RESTAURANT_PHONE_HOST_LABEL} — ROAL`,
};

export const dynamic = "force-dynamic";

/** Everything technical (creating the host, linking the menu, tools, call-in setup) is automatic. */
const STATE_BADGE: Record<VoiceHostState, { label: string; tone: Tone }> = {
  ready: { label: "Ready", tone: "ok" },
  setting_up: { label: "Setting up", tone: "neutral" },
  failed: { label: "Retrying", tone: "warn" },
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

export default async function RestaurantPhoneHostPage({ params }: { params: { id: string } }) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/agent`);
    notFound();
  }

  const { restaurant } = access;
  const supabase = getDb();
  const [profileRow, suggestions] = await Promise.all([
    supabase
      .from("restaurant_profiles")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle<RestaurantProfile & { trial_scorecard?: unknown; roal_phone_number?: string | null }>(),
    loadKnowledgeSuggestions(supabase, restaurant.id, { status: "pending" }).catch(() => []),
  ]);

  const profile = profileRow.data ?? null;
  const storePhone = profile?.phone?.trim() || null;
  const hostName = profile?.agent_display_name?.trim() || defaultAgentName(profile?.agent_voice_id ?? null);
  const voiceLabel = profile?.agent_voice_label?.trim() || findTrialVoice(profile?.agent_voice_id ?? null)?.label || null;
  const state = voiceHostStateFromProfile(profile, getElevenLabsAgentId());
  const agentReady = Boolean(profile?.elevenlabs_agent_id?.trim()) && state !== "setting_up";
  const outboundAvailable = Boolean(getElevenLabsAgentPhoneNumberId()) && dialable(storePhone);

  return (
    <RestaurantWorkspaceRail
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      suggestionCount={suggestions.length}
    >
      <div className="phone-host mx-auto w-full min-w-0 max-w-[1120px] space-y-4 sm:space-y-5">
        <PageHeader
          title={RESTAURANT_PHONE_HOST_LABEL}
          subtitle={[`${hostName} answers ${restaurant.name}'s phone`, voiceLabel ? `${voiceLabel} voice` : null]
            .filter(Boolean)
            .join(" · ")}
        />

        {state === "setting_up" ? (
          <Notice tone="info" title={`We're setting up ${hostName}`}>
            {hostName} is learning your menu, hours and how to take orders. It takes about a minute and happens on its
            own. You can keep using the dashboard.
          </Notice>
        ) : state === "failed" ? (
          <Notice tone="warn" title="Taking a little longer than usual">
            We hit a snag setting up {hostName} and are retrying automatically. Nothing for you to do.
          </Notice>
        ) : null}

        <PhoneHostTestCall
          restaurantId={restaurant.id}
          organizationId={restaurant.organization_id}
          restaurantName={restaurant.name}
          hostName={hostName}
          voiceLabel={voiceLabel}
          status={STATE_BADGE[state]}
          agentReady={agentReady}
          outboundAvailable={outboundAvailable}
          restaurantPhone={storePhone}
          initialScorecard={parseScorecard(profile?.trial_scorecard)}
        />

        <PhoneNumberCard
          restaurantId={restaurant.id}
          hostName={hostName}
          roalNumber={profile?.roal_phone_number ?? null}
          restaurantPhone={storePhone}
        />

        <div className="grid min-w-0 items-start gap-4 sm:gap-5 lg:grid-cols-2">
          <KnowledgeSuggestionsInbox restaurantId={restaurant.id} hostName={hostName} suggestions={suggestions} />
          <HostPersonaCard
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            initialName={profile?.agent_display_name ?? null}
            initialVoiceId={profile?.agent_voice_id ?? null}
            initialGreeting={profile?.agent_greeting ?? null}
          />
        </div>
      </div>
    </RestaurantWorkspaceRail>
  );
}
