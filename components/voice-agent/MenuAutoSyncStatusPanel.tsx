"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { PlanLimitNotice } from "@/components/billing/PlanLimitNotice";
import { Badge, formatRelative, type Tone } from "@/components/ui";
import { MetaList, Notice } from "@/components/live-orders/workspace-ui";
import type { SerializableGateVerdict } from "@/lib/billing/gates";
import { cn } from "@/lib/cn";
import type { MenuAutoSyncSnapshot } from "@/lib/voice-agent/control-center-types";
import {
  resolveMenuAutoSyncDisplay,
  formatMenuAutoSyncWhen,
  type MenuAutoSyncUiPhase,
} from "@/lib/voice-agent/menu-auto-sync-display";
import { publishRestaurantVoiceContentAction } from "@/app/dashboard/restaurants/[id]/voice-agent-actions";

type Props = {
  restaurantId: string;
  restaurantName: string;
  initial: MenuAutoSyncSnapshot;
  voiceOrderGate?: SerializableGateVerdict | null;
  /**
   * card   – full panel (status, last synced, publish button)
   * hero   – badge + one line (Phone host hero)
   * inline – badge + summary + small publish button
   * header – page-header action: primary "Publish to phone host" only when there
   *          are unsynced changes, otherwise a calm "Synced …" badge
   */
  variant?: "card" | "hero" | "inline" | "header";
  className?: string;
};

const PHASE_TONE: Record<MenuAutoSyncUiPhase, Tone> = {
  syncing: "info",
  no_agent: "neutral",
  failed: "bad",
  succeeded: "ok",
  idle: "warn",
};

function snapshotKey(s: MenuAutoSyncSnapshot): string {
  return [s.agentLinked ? 1 : 0, s.status ?? "", s.error ?? "", s.lastSyncedAt ?? ""].join("|");
}

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

  // Pick up fresh server state after router.refresh() (auto-sync after saves).
  const initialKey = snapshotKey(initial);
  useEffect(() => {
    setSnapshot(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const display = useMemo(
    () =>
      resolveMenuAutoSyncDisplay(snapshot, {
        pendingResync: pending,
      }),
    [snapshot, pending]
  );

  const resyncDisabled =
    display.resyncDisabled || pending || voiceBlocked;
  const tone = PHASE_TONE[display.phase];
  const errorText = actionError ?? display.errorMessage;

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

  if (variant === "header") {
    if (display.phase === "succeeded" && !actionError) {
      return (
        <Badge
          tone="ok"
          className={cn("h-7 px-2.5 text-[12px]", className)}
          title={
            display.lastSyncedAt
              ? `Phone host has your latest menu · ${formatMenuAutoSyncWhen(display.lastSyncedAt)}`
              : "Phone host has your latest menu"
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          <span suppressHydrationWarning>
            {display.lastSyncedAt
              ? `Up to date · ${formatRelative(display.lastSyncedAt)}`
              : "Up to date"}
          </span>
        </Badge>
      );
    }
    if (display.phase === "syncing") {
      return (
        <Badge tone="info" className={cn("h-7 px-2.5 text-[12px]", className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
          Updating your host…
        </Badge>
      );
    }
    if (display.phase === "no_agent") {
      return (
        <Badge tone="neutral" className={cn("h-7 px-2.5 text-[12px]", className)} title={display.summary}>
          Host getting ready
        </Badge>
      );
    }
    // Saving the menu updates the host automatically; only a failed update needs a button.
    if (display.phase !== "failed" && !voiceBlocked) {
      return (
        <Badge tone="ok" className={cn("h-7 px-2.5 text-[12px]", className)} title={display.summary}>
          Host has your latest menu
        </Badge>
      );
    }
    return (
      <span className={cn("inline-flex min-w-0 flex-col items-stretch gap-1 sm:items-end", className)}>
        <button
          type="button"
          className="btn-primary"
          disabled={resyncDisabled}
          aria-busy={pending}
          onClick={onResync}
          title={display.summary}
        >
          <Send size={15} aria-hidden />
          {pending ? "Updating…" : "Try again"}
        </button>
        {errorText ? (
          <span
            className="max-w-[18rem] text-[12px] text-danger [overflow-wrap:anywhere] sm:text-right"
            role="alert"
          >
            {errorText}
          </span>
        ) : (
          <span className="text-[12px] text-subtle sm:text-right">
            {voiceBlocked
              ? "Phone orders are paused on your plan."
              : "Couldn't update your host"}
          </span>
        )}
      </span>
    );
  }

  if (variant === "hero") {
    return (
      <div className={cn("menu-auto-sync menu-auto-sync--hero", className)}>
        <Badge tone={tone}>{display.badgeLabel}</Badge>
        {display.phase === "no_agent" ? (
          <p className="mt-2 text-[13px] leading-snug text-muted">
            {display.summary}
          </p>
        ) : display.errorMessage ? (
          <p
            className="mt-2 text-[13px] leading-snug text-danger [overflow-wrap:anywhere]"
            role="alert"
          >
            {display.errorMessage}
          </p>
        ) : (
          <p className="mt-2 text-[13px] leading-snug text-muted">
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
          "menu-auto-sync menu-auto-sync--inline flex min-w-0 flex-wrap items-center gap-2",
          className
        )}
      >
        <Badge tone={tone}>{display.badgeLabel}</Badge>
        <span className="min-w-0 text-[12.5px] text-subtle [overflow-wrap:anywhere]">
          {display.summary}
        </span>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={resyncDisabled}
          aria-busy={pending}
          onClick={onResync}
        >
          {pending ? "Updating…" : "Update host"}
        </button>
        {actionError ? (
          <span className="basis-full text-[12px] text-danger" role="alert">
            {actionError}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={cn("menu-auto-sync menu-auto-sync--card panel", className)}
      aria-labelledby={`menu-auto-sync-heading-${restaurantId}`}
    >
      <div className="panel__head">
        <div className="min-w-0">
          <h2 id={`menu-auto-sync-heading-${restaurantId}`} className="panel__title">
            Publish to voice
          </h2>
          <p className="text-[12.5px] text-subtle">
            Push your current menu, hours, FAQ, policies, and tool URLs to the linked
            ElevenLabs agent before taking calls.
          </p>
        </div>
        <Badge tone={tone} className="shrink-0">
          {display.badgeLabel}
        </Badge>
      </div>

      <div className="panel__body space-y-3">
        <PlanLimitNotice verdict={voiceOrderGate} />

        <MetaList
          items={[
            { label: "Status", value: display.badgeLabel },
            {
              label: "Last updated",
              value:
                display.lastSyncedAt && display.phase === "succeeded"
                  ? formatMenuAutoSyncWhen(display.lastSyncedAt)
                  : "—",
            },
          ]}
        />

        <p className="text-[13px] text-muted [overflow-wrap:anywhere]">{display.summary}</p>

        {display.phase === "no_agent" ? (
          <p className="text-[13px] text-muted">
            Your{" "}
            <Link href={agentHref} className="font-medium text-ink underline underline-offset-2">
              phone host
            </Link>{" "}
            is still getting ready.
          </p>
        ) : null}

        {errorText ? <Notice tone="bad">{errorText}</Notice> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            disabled={resyncDisabled}
            aria-busy={pending}
            onClick={onResync}
          >
            {pending ? "Updating…" : "Update host"}
          </button>
          <Link href={agentHref} className="btn-ghost w-full sm:w-auto">
            Phone host
          </Link>
        </div>
      </div>
    </section>
  );
}
