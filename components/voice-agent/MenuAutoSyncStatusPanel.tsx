"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PlanLimitNotice } from "@/components/billing/PlanLimitNotice";
import type { SerializableGateVerdict } from "@/lib/billing/gates";
import { cn } from "@/lib/cn";
import type { MenuAutoSyncSnapshot } from "@/lib/voice-agent/control-center-types";
import {
  resolveMenuAutoSyncDisplay,
  formatMenuAutoSyncWhen,
} from "@/lib/voice-agent/menu-auto-sync-display";
import { publishRestaurantVoiceContentAction } from "@/app/dashboard/restaurants/[id]/voice-agent-actions";

type Props = {
  restaurantId: string;
  restaurantName: string;
  initial: MenuAutoSyncSnapshot;
  voiceOrderGate?: SerializableGateVerdict | null;
  variant?: "card" | "hero" | "inline";
  className?: string;
};

export function MenuAutoSyncStatusPanel({
  restaurantId,
  restaurantName,
  initial,
  voiceOrderGate,
  variant = "card",
  className,
}: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const voiceBlocked = voiceOrderGate?.hardBlocked === true;

  const display = useMemo(
    () =>
      resolveMenuAutoSyncDisplay(snapshot, {
        pendingResync: pending,
      }),
    [snapshot, pending]
  );

  const resyncDisabled =
    display.resyncDisabled || pending || voiceBlocked;

  function onResync() {
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await publishRestaurantVoiceContentAction(
          restaurantId,
          restaurantName
        );
        setSnapshot(result.menuAutoSync);
        if (result.error) {
          setActionError(result.error);
        }
        router.refresh();
      } catch (e) {
        setActionError(
          e instanceof Error ? e.message : "Publish failed. Try again."
        );
      }
    });
  }

  const agentHref = `/dashboard/restaurants/${restaurantId}/agent`;

  if (variant === "hero") {
    return (
      <div className={cn("menu-auto-sync menu-auto-sync--hero", className)}>
        <span
          className={cn(
            "menu-auto-sync__badge rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
            display.badgeClassName
          )}
        >
          {display.badgeLabel}
        </span>
        {display.phase === "no_agent" ? (
          <p className="live-agent-page__hero-line mt-2 text-sm leading-snug text-muted">
            <Link href={agentHref} className="font-medium text-accent underline-offset-2 hover:underline">
              Connect an agent
            </Link>{" "}
            to sync menu and settings.
          </p>
        ) : display.errorMessage ? (
          <p
            className="live-agent-page__hero-line mt-2 text-sm leading-snug text-danger [overflow-wrap:anywhere]"
            role="alert"
          >
            {display.errorMessage}
          </p>
        ) : (
          <p className="live-agent-page__hero-line mt-2 text-sm leading-snug text-muted">
            {display.summary}
          </p>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "menu-auto-sync menu-auto-sync--inline flex flex-wrap items-center gap-2",
          className
        )}
      >
        <span
          className={cn(
            "menu-auto-sync__badge rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
            display.badgeClassName
          )}
        >
          {display.badgeLabel}
        </span>
        <span className="text-xs text-muted">{display.summary}</span>
        <button
          type="button"
          className="btn-ghost kds-thumb-btn min-h-10 px-3 text-xs"
          disabled={resyncDisabled}
          aria-busy={pending}
          onClick={onResync}
        >
          {pending ? "Publishing…" : "Publish to voice"}
        </button>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "menu-auto-sync menu-auto-sync--card kds-panel glass-card overflow-hidden",
        className
      )}
      aria-labelledby={`menu-auto-sync-heading-${restaurantId}`}
    >
      <div className="kds-panel__header">
        <div className="min-w-0">
          <h2
            id={`menu-auto-sync-heading-${restaurantId}`}
            className="kds-panel__title"
          >
            Publish to voice
          </h2>
          <p className="kds-panel__lead">
            Push your current menu, hours, FAQ, policies, and tool URLs to the linked
            ElevenLabs agent before taking calls.
          </p>
        </div>
        <span
          className={cn(
            "menu-auto-sync__badge shrink-0 rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
            display.badgeClassName
          )}
        >
          {display.badgeLabel}
        </span>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <PlanLimitNotice verdict={voiceOrderGate} />

        <dl className="menu-auto-sync__meta grid gap-2 text-sm sm:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-line bg-elev/40 px-3 py-2">
            <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
              Status
            </dt>
            <dd className="mt-1 font-medium text-ink">{display.badgeLabel}</dd>
          </div>
          <div className="min-w-0 rounded-lg border border-line bg-elev/40 px-3 py-2">
            <dt className="text-micro font-semibold uppercase tracking-wider text-subtle">
              Last synced
            </dt>
            <dd className="mt-1 font-medium text-ink [overflow-wrap:anywhere]">
              {display.lastSyncedAt && display.phase === "succeeded"
                ? formatMenuAutoSyncWhen(display.lastSyncedAt)
                : "—"}
            </dd>
          </div>
        </dl>

        <p className="text-sm text-muted [overflow-wrap:anywhere]">{display.summary}</p>

        {display.phase === "no_agent" ? (
          <p className="text-sm text-muted">
            <Link
              href={agentHref}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Open Live Agent
            </Link>{" "}
            to connect ElevenLabs first.
          </p>
        ) : null}

        {display.errorMessage || actionError ? (
          <p
            className="rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger [overflow-wrap:anywhere]"
            role="alert"
          >
            {actionError ?? display.errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="btn-primary kds-thumb-btn min-h-11 w-full sm:w-auto"
            disabled={resyncDisabled}
            aria-busy={pending}
            onClick={onResync}
          >
            {pending ? "Publishing…" : "Publish to voice"}
          </button>
          <Link
            href={agentHref}
            className="btn-ghost kds-thumb-btn min-h-11 w-full text-center text-sm sm:w-auto"
          >
            Live Agent settings
          </Link>
        </div>
      </div>
    </section>
  );
}
