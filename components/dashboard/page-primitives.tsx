import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Small shared building blocks for org-level dashboard pages.
   Compact, white-on-paper, one primary action per screen. */

export type Tone = "neutral" | "ok" | "warn" | "bad" | "accent";

const CHIP_TONE: Record<Tone, string> = {
  neutral: "",
  ok: "chip--success",
  warn: "chip--warning",
  bad: "chip--danger",
  accent: "chip--accent",
};

export function StatusChip({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("chip", CHIP_TONE[tone], className)} title={title}>
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  backHref,
  backLabel,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("dashboard-page__header", className)}>
      <div className="min-w-0">
        {backHref ? (
          <Link href={backHref} className="dashboard-page__back">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {backLabel ?? "Back"}
          </Link>
        ) : null}
        {eyebrow ? <p className="dashboard-page__eyebrow">{eyebrow}</p> : null}
        <h1 className="dashboard-page__title">{title}</h1>
        {lead ? <p className="dashboard-page__lead">{lead}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function Panel({
  title,
  hint,
  aside,
  children,
  className,
  flush = false,
  muted = false,
  as: Tag = "section",
  ...rest
}: {
  title?: ReactNode;
  hint?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  flush?: boolean;
  muted?: boolean;
  as?: "section" | "div" | "article";
} & Omit<HTMLAttributes<HTMLElement>, "title">) {
  return (
    <Tag
      className={cn(
        "dashboard-panel",
        flush && "dashboard-panel--flush",
        muted && "dashboard-panel--muted",
        className
      )}
      {...rest}
    >
      {title || aside ? (
        <div className="dashboard-panel__head">
          <div className="min-w-0">
            {title ? <h2 className="dashboard-page__section-title">{title}</h2> : null}
            {hint ? <p className="dashboard-panel__hint">{hint}</p> : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Exclude<Tone, "accent">;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-stat", className)}>
      <p className="dashboard-stat__label" title={label}>
        {label}
      </p>
      <p
        className={cn(
          "dashboard-stat__value",
          tone === "ok" && "dashboard-stat__value--ok",
          tone === "warn" && "dashboard-stat__value--warn",
          tone === "bad" && "dashboard-stat__value--bad"
        )}
      >
        {value}
      </p>
      {hint ? <p className="dashboard-stat__hint">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  className,
  role = "status",
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div className={cn("empty-state", className)} role={role}>
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {children ? <p className="max-w-md text-[13px] text-muted">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function InlineLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
