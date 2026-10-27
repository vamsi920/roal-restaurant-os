import type { ReactNode } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Small workspace primitives shared by the per-location pages (Kitchen, Calls & Orders,
 * Menu, Phone host). They sit on top of components/ui (Panel, Badge, EmptyState) and
 * the globals.css classes, so every module page reads as one system.
 */

export type RealtimeState = "connecting" | "live" | "degraded";

const REALTIME_COPY: Record<RealtimeState, { label: string; title: string }> = {
  connecting: { label: "Connecting", title: "Connecting to live updates" },
  live: { label: "Live", title: "New tickets appear automatically" },
  degraded: { label: "Reconnecting", title: "Live updates paused; refreshing every few seconds" },
};

/** Compact "Live" / "Connecting" / "Reconnecting" pill for realtime surfaces. */
export function RealtimeBadge({ state, className }: { state: RealtimeState; className?: string }) {
  const copy = REALTIME_COPY[state];
  return (
    <span
      className={cn(
        "badge",
        state === "live" && "badge--ok",
        state === "degraded" && "badge--warn",
        className
      )}
      title={copy.title}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          state !== "degraded" && "motion-safe:animate-pulse"
        )}
        aria-hidden
      />
      {copy.label}
    </span>
  );
}

/** Icon-only refresh button with a spinner while busy. */
export function RefreshButton({
  onClick,
  busy,
  label = "Refresh",
  showLabel = false,
  className,
}: {
  onClick: () => void;
  busy?: boolean;
  label?: string;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      aria-label={busy ? `${label}…` : label}
      className={cn("btn-ghost btn-sm", !showLabel && "w-[1.875rem] px-0", className)}
    >
      <RefreshCw size={14} className={cn(busy && "motion-safe:animate-spin")} aria-hidden />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}

/** Skeleton rows that look like the list they are standing in for. */
export function LoadingRows({ label, rows = 3, className }: { label: string; rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 p-4", className)} role="status" aria-live="polite" aria-busy>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="skeleton h-8 w-8 shrink-0 rounded-[9px]" aria-hidden />
          <span className="flex-1 space-y-1.5" aria-hidden>
            <span className={cn("skeleton block h-3", i % 2 ? "w-1/2" : "w-2/3")} />
            <span className="skeleton block h-2.5 w-1/3" />
          </span>
        </div>
      ))}
      <p className="text-[12.5px] text-subtle" aria-hidden>
        {label}
      </p>
    </div>
  );
}

type NoticeTone = "info" | "warn" | "bad" | "ok";

const NOTICE_TONE: Record<NoticeTone, string> = {
  info: "border-line bg-elev text-muted",
  warn: "border-warning/25 bg-[rgb(var(--tile-amber)/0.45)] text-[rgb(var(--tile-amber-ink))]",
  bad: "border-danger/25 bg-danger/[0.05] text-danger",
  ok: "border-success/20 bg-success/[0.06] text-success",
};

/** One-line callout for sync errors, warnings, and confirmations. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
  role,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[10px] border px-3 py-2 text-[13px]",
        NOTICE_TONE[tone],
        className
      )}
      role={role ?? (tone === "bad" ? "alert" : "status")}
    >
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        {title ? <span className="font-semibold">{title}</span> : null}
        {title && children ? " " : null}
        {children ? <span className={cn(title && "opacity-90")}>{children}</span> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** A Panel that folds away: used for "Advanced" and other rarely-touched sections. */
export function CollapsiblePanel({
  id,
  title,
  hint,
  children,
  defaultOpen = false,
  className,
  bodyClassName,
}: {
  id?: string;
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <details id={id} className={cn("panel group scroll-mt-24", className)} open={defaultOpen || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] px-[1.125rem] py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-ink">{title}</span>
          {hint ? <span className="mt-0.5 block text-[12.5px] text-subtle">{hint}</span> : null}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div className={cn("border-t border-line px-[1.125rem] py-4", bodyClassName)}>{children}</div>
    </details>
  );
}

/** Footer row for forms: status message on the left, save buttons on the right. */
export function SaveRow({
  message,
  tone = "ok",
  children,
  className,
}: {
  message?: ReactNode;
  tone?: "ok" | "bad" | "muted";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p
        className={cn(
          "min-h-[1.25rem] text-[13px] [overflow-wrap:anywhere]",
          tone === "ok" && "text-success",
          tone === "bad" && "text-danger",
          tone === "muted" && "text-subtle"
        )}
        role={tone === "bad" ? "alert" : "status"}
      >
        {message}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>
    </div>
  );
}

/** Small key/value list for metadata rows (store phone, agent id, webhook…). */
export function MetaList({
  items,
  className,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-[auto_1fr]", className)}>
      {items.map((item, i) => (
        <div key={i} className="contents">
          <dt className="text-subtle">{item.label}</dt>
          <dd className="min-w-0 font-medium text-ink [overflow-wrap:anywhere]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
