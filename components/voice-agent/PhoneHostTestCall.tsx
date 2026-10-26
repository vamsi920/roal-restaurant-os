"use client";

import { useState } from "react";
import { TrialCall } from "@/components/try/trial-call";
import { TrialScorecardPanel } from "@/components/try/trial-scorecard";
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
  /** Agent is linked; browser call can start. */
  agentReady: boolean;
  /** `ELEVENLABS_AGENT_PHONE_NUMBER_ID` is set and the profile has a dialable phone. */
  outboundAvailable: boolean;
  restaurantPhone: string | null;
  initialScorecard: TrialScorecard;
};

export function PhoneHostTestCall({
  restaurantId,
  organizationId,
  restaurantName,
  hostName,
  agentReady,
  outboundAvailable,
  restaurantPhone,
  initialScorecard,
}: Props) {
  const [scorecard, setScorecard] = useState<TrialScorecard>(initialScorecard);
  const [outbound, setOutbound] = useState<"idle" | "calling" | "placed" | "error">("idle");
  const [outboundMessage, setOutboundMessage] = useState<string | null>(null);

  const hasScorecard = Object.keys(scorecard).length > 0;

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
    <section id="test-call" className="phone-host-test card min-w-0" aria-labelledby="test-call-title">
      <header className="phone-host-test__head">
        <div className="min-w-0">
          <h2 id="test-call-title" className="phone-host-test__title">
            Test call
          </h2>
          <p className="phone-host-test__lead">
            Talk to {hostName} right here. Nothing is charged for test calls.
          </p>
        </div>
        {outboundAvailable ? (
          <div className="phone-host-test__outbound">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void callMyPhone()}
              disabled={outbound === "calling"}
              aria-busy={outbound === "calling"}
            >
              {outbound === "calling" ? "Calling…" : "Call my phone"}
            </button>
            {restaurantPhone ? (
              <span className="phone-host-test__outbound-hint">{restaurantPhone}</span>
            ) : null}
          </div>
        ) : null}
      </header>

      {outboundMessage ? (
        <p
          className={
            outbound === "error"
              ? "phone-host-test__notice phone-host-test__notice--error"
              : "phone-host-test__notice"
          }
          role={outbound === "error" ? "alert" : "status"}
        >
          {outboundMessage}
        </p>
      ) : null}

      <div className="phone-host-test__grid">
        <div className="min-w-0">
          {agentReady ? (
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
          ) : (
            <div className="empty-state">
              <p className="text-sm font-semibold text-ink">Host not connected yet</p>
              <p className="text-sm">
                Connect the agent below, then come back here to call {hostName}.
              </p>
            </div>
          )}
        </div>
        {hasScorecard ? (
          <aside className="min-w-0" aria-label="What you tested">
            <p className="phone-host-test__aside-title">What you tested</p>
            <TrialScorecardPanel scorecard={scorecard} compact />
          </aside>
        ) : null}
      </div>
    </section>
  );
}
