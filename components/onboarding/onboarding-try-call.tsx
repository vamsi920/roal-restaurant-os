"use client";

import { useCallback, useState } from "react";
import {
  createVoiceAgentBrowserCallAction,
  startVoiceAgentOutboundCallAction,
} from "@/app/dashboard/onboarding/actions";
import { PhoneCall } from "lucide-react";
import { TrialCall } from "@/components/try/trial-call";
import { IconTile } from "@/components/ui";
import "@/components/try/trial.css";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";

type Props = {
  restaurantId: string;
  organizationId: string;
  restaurantName: string;
  restaurantPhone: string | null;
  outboundCallConfigured: boolean;
  /** Fires after an in-browser call ends with at least one exchanged turn. */
  onCallCompleted?: (turnCount: number) => void;
};

/**
 * In-dashboard test call against the location's real ElevenLabs agent.
 * Uses the same in-browser call surface as the homepage trial; the transcript
 * endpoint is trial-only, so its 404 after the call is ignored.
 */
export function OnboardingTryCall({
  restaurantId,
  organizationId,
  restaurantName,
  restaurantPhone,
  outboundCallConfigured,
  onCallCompleted,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outboundStatus, setOutboundStatus] = useState<string | null>(null);
  const showOutbound = outboundCallConfigured && Boolean(restaurantPhone);

  const getSession = useCallback(async () => {
    const r = await createVoiceAgentBrowserCallAction({ restaurantId, organizationId });
    return { signedUrl: r.signedUrl };
  }, [organizationId, restaurantId]);

  async function callMyPhone() {
    setError(null);
    setBusy(true);
    try {
      const result = await startVoiceAgentOutboundCallAction({ restaurantId, organizationId });
      setOutboundStatus(`Calling ${result.toNumber} now. Pick up and place a test order.`);
    } catch (e) {
      setError(
        formatSupabaseClientError(
          e instanceof Error ? e.message : "Could not place the outbound call."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={PhoneCall} color="green" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">Talk to your agent now</p>
          <p className="mt-0.5 text-[13px] text-subtle">
            Order something off the menu. The ticket should land on Live orders within a few seconds.
          </p>
        </div>
      </div>

      <TrialCall
        trialId={restaurantId}
        agentName="Your ROAL host"
        restaurantName={restaurantName}
        getSession={getSession}
        onCallEnded={(turns) => {
          onCallCompleted?.(turns.length);
        }}
        compact
      />

      {showOutbound ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={callMyPhone}>
            {busy ? "Calling…" : `Call my phone${restaurantPhone ? ` (${restaurantPhone})` : ""}`}
          </button>
          <span className="text-[12px] text-subtle">Hear it the way a guest would.</span>
        </div>
      ) : null}

      {error ? (
        <p
          className="rounded-[10px] border border-danger/20 bg-danger/5 px-3 py-2 text-[13px] text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {outboundStatus ? (
        <p className="text-[13px] text-success" role="status">
          {outboundStatus}
        </p>
      ) : null}
    </div>
  );
}
