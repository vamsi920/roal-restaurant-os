import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import {
  Badge,
  EmptyState as UiEmptyState,
  PageHeader as UiPageHeader,
  type Tone as UiTone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import "@/components/dashboard/org-pages.css";

/* Compatibility layer for org-level dashboard pages.
   Same export names and props as before, now rendered with the v3 primitives
   (components/ui) and the classes in org-pages.css: white cards on paper,
   1px borders, 14px radius, compact 13–14px type. Prefer components/ui directly
   in new code; reach for these when you need a hint line, a back link, or the
   older Tone names. */

export type Tone = "neutral" | "ok" | "warn" | "bad" | "accent";

const BADGE_TONE: Record<Exclude<Tone, "accent">, UiTone> = {
  neutral: "neutral",
  ok: "ok",
  warn: "warn",
  bad: "bad",
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
  if (tone === "accent") {
    return (
      <Badge className={cn("badge--accent", className)} title={title}>
        {children}
      </Badge>
    );
  }
  return (
    <Badge tone={BADGE_TONE[tone]} className={className} title={title}>
      {children}
    </Badge>
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
  const top = backHref ? (
    <Link
      href={backHref}
      className="org-link inline-flex items-center gap-0.5 text-[12.5px] font-medium text-subtle hover:text-ink"
    >
      <ChevronLeft size={14} strokeWidth={2} aria-hidden />
      {backLabel ?? "Back"}
    </Link>
  ) : (
    eyebrow
  );
  return (
    <UiPageHeader
      className={cn("!mb-0", className)}
      eyebrow={top}
      title={title}
      subtitle={lead}
      actions={actions}
    />
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
    <Tag className={cn("panel", flush && "overflow-hidden", muted && "panel--muted", className)} {...rest}>
      {title || aside ? (
        <div className="panel__head flex-wrap">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="panel__title">{title}</h2> : null}
            {hint ? <p className="org-panel__hint">{hint}</p> : null}
          </div>
          {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
        </div>
      ) : null}
      {children !== undefined && children !== null ? (
        flush ? children : <div className="panel__body">{children}</div>
      ) : null}
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
    <div className={cn("stat-card", className)}>
      <p className="stat-card__label truncate" title={label}>
        {label}
      </p>
      <p
        className={cn(
          "stat-card__value !text-[22px]",
          tone === "ok" && "!text-success",
          tone === "warn" && "!text-warning",
          tone === "bad" && "!text-danger"
        )}
      >
        {value}
      </p>
      {hint ? <p className="stat-card__hint [overflow-wrap:anywhere]">{hint}</p> : null}
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
    <div className={cn("panel", className)} role={role}>
      <UiEmptyState title={title} body={children} action={action} />
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
        "org-link font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink",
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
