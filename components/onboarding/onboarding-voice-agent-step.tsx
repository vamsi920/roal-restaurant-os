"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { retryRestaurantVoiceAgentProvisionAction } from "@/app/dashboard/onboarding/actions";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { RESTAURANT_MENU_AGENT_LABEL } from "@/lib/dashboard-restaurant-labels";
import type { OnboardingRestaurantVoiceProvision } from "@/lib/onboarding/restaurant-voice-provision";
import { restaurantVoiceAgentHref } from "@/lib/voice-agent/provision-display";

type Props = {
  restaurantId: string;
  restaurantName: string;
  organizationId: string;
  voice: OnboardingRestaurantVoiceProvision;
  pending: boolean;
  onContinue: () => void;
  onSkipManual: () => void;
};

export function OnboardingVoiceAgentStep({
  restaurantId,
  restaurantName,
  organizationId,
  voice,
  pending,
  onContinue,
  onSkipManual,
}: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const agentHref = restaurantVoiceAgentHref(restaurantId);

  useEffect(() => {
    if (voice.uiState !== "in_progress") return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [voice.uiState, router]);

  async function runRetry() {
    setLocalError(null);
    setRetrying(true);
    try {
      await retryRestaurantVoiceAgentProvisionAction({
        restaurantId,
        organizationId,
      });
      router.refresh();
    } catch (e) {
      setLocalError(
        formatSupabaseClientError(
          e instanceof Error ? e.message : "Could not provision voice agent."
        )
      );
    } finally {
      setRetrying(false);
    }
  }

  const busy = pending || retrying;
  const displayError =
    localError ||
    voice.provisionError ||
    (voice.uiState === "needs_attention" ? voice.lastSyncError : null);

  if (voice.uiState === "ready") {
    return (
      <div className="space-y-4 max-w-lg">
        <p className="text-sm text-success">
          Dedicated voice agent is ready for{" "}
          <span className="font-medium text-ink">{restaurantName}</span>.
          {voice.agentId ? (
            <span className="mt-1 block text-xs text-muted break-all">
              Agent id: {voice.agentId}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={onContinue}
          >
            Continue to test call
          </button>
          <Link href={agentHref} className="btn-ghost inline-flex items-center">
            Open Live Agent
          </Link>
        </div>
      </div>
    );
  }

  if (voice.uiState === "in_progress") {
    return (
      <div className="space-y-4 max-w-lg">
        <p className="text-sm text-muted">
          Setting up the dedicated ElevenLabs agent for{" "}
          <span className="font-medium text-ink">{restaurantName}</span>. This
          usually takes under a minute.
        </p>
        <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <span className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Provisioning in progress…
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => router.refresh()}
          >
            Refresh status
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={runRetry}>
            {retrying ? "Retrying…" : "Retry setup"}
          </button>
        </div>
      </div>
    );
  }

  if (voice.uiState === "needs_attention") {
    return (
      <div className="space-y-4 max-w-lg">
        <p className="text-sm text-muted">
          Voice agent setup did not finish for{" "}
          <span className="font-medium text-ink">{restaurantName}</span>. Retry
          here or open Live Agent for details.
        </p>
        {displayError ? (
          <p
            className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger [overflow-wrap:anywhere]"
            role="alert"
          >
            {displayError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={busy} onClick={runRetry}>
            {retrying ? "Retrying…" : "Retry voice agent setup"}
          </button>
          <Link href={agentHref} className="btn-ghost inline-flex items-center">
            Open Live Agent
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted">
        Start dedicated agent provisioning for{" "}
        <span className="font-medium text-ink">{restaurantName}</span>. ROAL
        creates the agent and syncs menu tools automatically.
      </p>
      {displayError ? (
        <p
          className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {displayError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={runRetry}>
          {retrying ? "Setting up…" : "Set up voice agent"}
        </button>
        <Link href={agentHref} className="btn-ghost inline-flex items-center">
          Open Live Agent
        </Link>
        <button type="button" className="btn-ghost" disabled={busy} onClick={onSkipManual}>
          Connect manually later
        </button>
      </div>
      <p className="text-xs text-subtle">
        Manual connect is available in Live Agent if auto-setup is unavailable
        ({RESTAURANT_MENU_AGENT_LABEL} → agent tools).
      </p>
    </div>
  );
}
