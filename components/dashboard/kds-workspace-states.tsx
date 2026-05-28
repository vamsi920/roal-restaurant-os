import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function KdsWorkspaceIcon({
  variant = "orders",
  className,
}: {
  variant?: "orders" | "menu" | "scan";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "kds-workspace-state__icon",
        variant === "menu" && "kds-workspace-state__icon--menu",
        variant === "scan" && "kds-workspace-state__icon--scan",
        className
      )}
      aria-hidden
    >
      {variant === "menu" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h10M4 18h16" />
        </svg>
      ) : variant === "scan" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8h12v8H6z" />
          <path d="M9 8v8M15 8v8" />
        </svg>
      )}
    </span>
  );
}

export function KdsEmptyStatePanel({
  title,
  children,
  tone = "tab",
  icon = "orders",
  actions,
}: {
  title: string;
  children?: ReactNode;
  tone?: "calm" | "tab" | "done";
  icon?: "orders" | "menu" | "scan";
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "kds-empty-state",
        tone === "calm" && "kds-empty-state--calm",
        tone === "done" && "kds-empty-state--done",
        !children && "kds-empty-state--title-only"
      )}
      role="status"
    >
      <KdsWorkspaceIcon variant={icon} />
      <p className="kds-empty-state__title">{title}</p>
      {children ? (
        <p className="kds-empty-state__body">{children}</p>
      ) : null}
      {actions ? <div className="kds-empty-state__actions">{actions}</div> : null}
    </div>
  );
}

export type KdsRealtimeUi = "connecting" | "live" | "degraded";

const REALTIME_COPY: Record<
  KdsRealtimeUi,
  { label: string; detail?: string }
> = {
  connecting: { label: "Connecting…" },
  live: { label: "Live" },
  degraded: {
    label: "Sync paused",
    detail: "Live sync paused — refreshing every few seconds",
  },
};

export function KdsRealtimeIndicator({ state }: { state: KdsRealtimeUi }) {
  const copy = REALTIME_COPY[state];
  return (
    <span
      className={cn(
        "kds-sync-indicator",
        state === "live" && "kds-sync-indicator--live",
        state === "connecting" && "kds-sync-indicator--connecting",
        state === "degraded" && "kds-sync-indicator--degraded"
      )}
      role="status"
      aria-live="polite"
      title={copy.detail}
    >
      <span className="kds-sync-indicator__dot" aria-hidden />
      <span>{copy.label}</span>
    </span>
  );
}

export function KdsRecoveryButton({
  onClick,
  busy = false,
  label = "Refresh orders",
}: {
  onClick: () => void;
  busy?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="btn-primary kds-thumb-btn kds-recovery-btn min-h-11 w-full sm:w-auto"
      disabled={busy}
      aria-busy={busy}
      onClick={onClick}
    >
      {busy ? "Refreshing…" : label}
    </button>
  );
}

export function KdsDisconnectedNotice({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="kds-orders-disconnected" role="status" aria-live="polite">
      <p className="kds-orders-disconnected__text">Updates paused.</p>
      <KdsRecoveryButton onClick={onRefresh} busy={refreshing} label="Refresh" />
    </div>
  );
}

export function KdsSyncErrorNotice({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="kds-orders-sync-alert" role="alert">
      <p className="kds-orders-sync-alert__text">Couldn&apos;t refresh orders.</p>
      <KdsRecoveryButton onClick={onRefresh} busy={refreshing} label="Refresh" />
    </div>
  );
}

export function KdsLoadingPanel({
  label = "Loading…",
  rows = 4,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="kds-loading-panel" role="status" aria-live="polite" aria-busy="true">
      <span className="kds-loading-panel__pulse" aria-hidden />
      <p className="kds-loading-panel__label">{label}</p>
      {rows > 0 ? (
        <div className="kds-loading-panel__rows" aria-hidden>
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className={cn(
                "kds-loading-panel__row",
                i % 3 === 2 && "kds-loading-panel__row--short"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function KdsStatusBanner({
  tone,
  children,
}: {
  tone: "connecting" | "degraded" | "sync";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "kds-workspace-state__banner",
        tone === "connecting" && "kds-workspace-state__banner--connecting",
        tone === "degraded" && "kds-workspace-state__banner--degraded",
        tone === "sync" && "kds-workspace-state__banner--sync"
      )}
      role="status"
    >
      {tone === "connecting" ? (
        <span className="kds-workspace-state__banner-dot" aria-hidden />
      ) : null}
      <span>{children}</span>
    </p>
  );
}
