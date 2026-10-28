"use client";

import { useState } from "react";
import { Headset, Loader2, PhoneOutgoing } from "lucide-react";
import { TrialCall } from "@/components/try/trial-call";
import { TrialScorecardPanel } from "@/components/try/trial-scorecard";
import { Badge, EmptyState, IconTile, type Tone } from "@/components/ui";
import { Notice } from "@/components/live-orders/workspace-ui";
import { scoreTranscript } from "@/lib/trial/scorecard";
import type { TrialScorecard, TrialTranscriptTurn } from "@/lib/trial/types";
import {
  createVoiceAgentBrowserCallAction,
  startVoiceAgentOutboundCallAction,
} from "@/app/dashboard/onboarding/actions";
import "@/components/try/trial.css";

type Props = {
  restaurantId: string;
  organizationId: string;
  restaurantName: string;
  hostName: string;
  /** Voice label shown under the host name ("Warm" voice). */
  voiceLabel?: string | null;
  /** Connection status pill for the hero. */
  status?: { label: string; tone: Tone };
  /** Agent is linked; browser call can start. */
  agentReady: boolean;
  /** `ELEVENLABS_AGENT_PHONE_NUMBER_ID` is set and the profile has a dialable phone. */
  outboundAvailable: boolean;
  restaurantPhone: string | null;
  initialScorecard: TrialScorecard;
};

/** Phone host hero: who answers, their status, and a live test call. */
export function PhoneHostTestCall({
  restaurantId,
  organizationId,
  restaurantName,
  hostName,
  voiceLabel,
  status,
  agentReady,
  outboundAvailable,
  restaurantPhone,
  initialScorecard,
}: Props) {
  const [scorecard, setScorecard] = useState<TrialScorecard>(initialScorecard);
  const [outbound, setOutbound] = useState<"idle" | "calling" | "placed" | "error">("idle");
  const [outboundMessage, setOutboundMessage] = useState<string | null>(null);

  async function callMyPhone() {
    setOutbound("calling");
    setOutboundMessage(null);
    try {
      const res = await startVoiceAgentOutboundCallAction({ restaurantId, organizationId });
      setOutbound("placed");
      setOutboundMessage(`Ringing ${res.toNumber}. Pick up and talk to ${hostName}.`);
    } catch (e) {
      setOutbound("error");
      setOutboundMessage(e instanceof Error ? e.message : "Could not place the call.");
    }
  }

  function onTranscript(turns: TrialTranscriptTurn[]) {
    setScorecard((prev) => scoreTranscript(turns, prev));
  }

  return (
    <section id="test-call" className="panel min-w-0 scroll-mt-24" aria-labelledby="test-call-title">
      <header className="flex min-w-0 flex-wrap items-center gap-3 border-b border-line px-4 py-4 sm:px-5">
        <IconTile icon={Headset} color="ink" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2
              id="test-call-title"
              className="min-w-0 truncate font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-ink"
            >
              {hostName}
            </h2>
            {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
          </div>
          <p className="mt-0.5 text-[13px] text-subtle">
            {voiceLabel ? `${voiceLabel} voice` : "Default voice"} · Test calls are free
          </p>
        </div>
        {outboundAvailable ? (
          <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void callMyPhone()}
              disabled={outbound === "calling"}
              aria-busy={outbound === "calling"}
            >
              <PhoneOutgoing size={15} aria-hidden />
              {outbound === "calling" ? "Calling…" : "Call my phone"}
            </button>
            {restaurantPhone ? (
              <span className="text-center text-[12px] tabular-nums text-subtle sm:text-right">
                Rings {restaurantPhone}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {outboundMessage ? (
        <div className="px-4 pt-4 sm:px-5">
          <Notice tone={outbound === "error" ? "bad" : "ok"}>{outboundMessage}</Notice>
        </div>
      ) : null}

      {agentReady ? (
        <div className="grid min-w-0 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <TrialCall
              trialId={restaurantId}
              persistTranscript={false}
              agentName={hostName}
              restaurantName={restaurantName}
              onTranscript={onTranscript}
              getSession={async () => {
                const r = await createVoiceAgentBrowserCallAction({
                  restaurantId,
                  organizationId,
                });
                return { signedUrl: r.signedUrl };
              }}
            />
          </div>
          <aside
            className="min-w-0 rounded-[12px] border border-line bg-elev p-4"
            aria-label="What you tested"
          >
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-subtle">
              What you tested
            </p>
            <TrialScorecardPanel scorecard={scorecard} compact />
          </aside>
        </div>
      ) : (
        <EmptyState
          icon={Loader2}
          title={`We're getting ${hostName} ready`}
          body={`${hostName} is learning ${restaurantName}'s menu and hours. This takes about a minute and happens automatically. Refresh to call from your browser.`}
        />
      )}
    </section>
  );
}
