"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  retryRestaurantVoiceAgentProvisionAction,
  syncRestaurantVoiceAgentOnboardingAction,
} from "@/app/dashboard/onboarding/actions";
import { Headphones } from "lucide-react";
import { StatusChip } from "@/components/dashboard/page-primitives";
import { IconTile } from "@/components/ui";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import type { OnboardingRestaurantVoiceProvision } from "@/lib/onboarding/restaurant-voice-provision";
import { restaurantVoiceAgentHref } from "@/lib/voice-agent/provision-display";

type Props = {
  restaurantId: string;
  restaurantName: string;
  organizationId: string;
  voice: OnboardingRestaurantVoiceProvision;
  pending: boolean;
  /** Called once the host is provisioned and tools are synced. */
  onReady?: () => void;
  /** Mark the step skipped (connect manually later from the workspace). */
  onSkipManual?: () => void;
};

function formatSyncTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Phone host card for the Go live checklist: provision, sync, retry.
 * The in-browser test call is the next checklist step (OnboardingTryCall).
 */
export function OnboardingVoiceAgentStep({
  restaurantId,
  restaurantName,
  organizationId,
  voice,
  pending,
  onReady,
  onSkipManual,
}: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const agentHref = restaurantVoiceAgentHref(restaurantId);
  const lastSyncLabel = formatSyncTime(voice.lastSyncAt);

  useEffect(() => {
    if (voice.uiState !== "in_progress") return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [voice.uiState, router]);

  async function runRetry() {
    setLocalError(null);
    setRetrying(true);
    try {
      await retryRestaurantVoiceAgentProvisionAction({ restaurantId, organizationId });
      router.refresh();
    } catch (e) {
      setLocalError(
        formatSupabaseClientError(e instanceof Error ? e.message : "Could not provision the host.")
      );
    } finally {
      setRetrying(false);
    }
  }

  async function runSync() {
    setLocalError(null);
    setSyncing(true);
    try {
      await syncRestaurantVoiceAgentOnboardingAction({ restaurantId, organizationId });
      router.refresh();
    } catch (e) {
      setLocalError(
        formatSupabaseClientError(e instanceof Error ? e.message : "Could not sync the host.")
      );
    } finally {
      setSyncing(false);
    }
  }

  const busy = pending || retrying || syncing;
  const displayError =
    localError ||
    voice.provisionError ||
    (voice.uiState === "needs_attention" ? voice.lastSyncError : null);

  const ready = voice.uiState === "ready" && voice.toolsSynced;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconTile icon={Headphones} color="blue" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Phone host</p>
            <p className="mt-0.5 text-[13px] text-subtle">
              A dedicated ElevenLabs agent for {restaurantName}, with your live menu as its tools.
            </p>
          </div>
        </div>
        <StatusChip
          tone={
            ready
              ? "ok"
              : voice.uiState === "needs_attention"
                ? "bad"
                : voice.uiState === "in_progress"
                  ? "warn"
                  : "neutral"
          }
        >
          {ready
            ? "Ready"
            : voice.uiState === "ready"
              ? "Linked, tools not synced"
              : voice.uiState === "in_progress"
                ? "Setting up"
                : voice.uiState === "needs_attention"
                  ? "Needs attention"
                  : "Not set up"}
        </StatusChip>
      </div>

      {voice.agentId ? (
        <p className="font-mono text-[12px] text-subtle [overflow-wrap:anywhere]">
          agent {voice.agentId}
          {lastSyncLabel ? ` · synced ${lastSyncLabel}` : ""}
        </p>
      ) : null}

      {voice.uiState === "in_progress" ? (
        <p className="flex items-center gap-2 text-[13px] text-muted" aria-live="polite">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink border-t-transparent motion-reduce:animate-none" />
          Building the host — usually under a minute.
        </p>
      ) : null}

      {displayError ? (
        <p
          className="rounded-[10px] border border-danger/20 bg-danger/5 px-3 py-2 text-[13px] text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {displayError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {ready ? (
          <>
            {onReady ? (
              <button type="button" className="btn-primary" disabled={busy} onClick={onReady}>
                Continue to test call
              </button>
            ) : null}
            <button type="button" className="btn-ghost" disabled={busy} onClick={runSync}>
              {syncing ? "Syncing…" : "Re-sync menu tools"}
            </button>
          </>
        ) : voice.uiState === "ready" ? (
          <button type="button" className="btn-primary" disabled={busy} onClick={runSync}>
            {syncing ? "Syncing…" : "Sync menu tools"}
          </button>
        ) : voice.uiState === "in_progress" ? (
          <>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => router.refresh()}>
              Refresh status
            </button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={runRetry}>
              {retrying ? "Retrying…" : "Retry setup"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-primary" disabled={busy} onClick={runRetry}>
              {retrying
                ? "Setting up…"
                : voice.uiState === "needs_attention"
                  ? "Retry host setup"
                  : "Set up phone host"}
            </button>
            {voice.agentId ? (
              <button type="button" className="btn-ghost" disabled={busy} onClick={runSync}>
                {syncing ? "Syncing…" : "Sync tools"}
              </button>
            ) : null}
            {onSkipManual && voice.uiState === "not_started" ? (
              <button type="button" className="btn-ghost" disabled={busy} onClick={onSkipManual}>
                Connect manually later
              </button>
            ) : null}
          </>
        )}
        <Link href={agentHref} className="btn-ghost">
          Open host workspace
        </Link>
      </div>
    </div>
  );
}
