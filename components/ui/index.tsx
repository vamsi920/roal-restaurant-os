import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

/* Shared app primitives (v3). Command-center style: white cards on a paper canvas,
   tinted icon tiles, compact 13–14px type, one primary action per screen. */

export type Tone = "neutral" | "ok" | "warn" | "bad" | "info" | "live" | "new";
export type TileColor = "amber" | "orange" | "blue" | "green" | "rose" | "ink";
type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span className={cn("badge", tone !== "neutral" && `badge--${tone}`, className)} title={title}>
      {tone === "live" ? <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function IconTile({ icon: Icon, color = "orange", size = "md", className }: { icon: IconType; color?: TileColor; size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cn("icon-tile", `icon-tile--${color}`, size === "lg" && "icon-tile--lg", className)} aria-hidden>
      <Icon size={size === "lg" ? 20 : 16} strokeWidth={2} />
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex min-w-0 flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-[12px] font-medium text-subtle">{eyebrow}</div> : null}
        <h1 className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[24px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13.5px] text-subtle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  color = "orange",
  href,
  info,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconType;
  color?: TileColor;
  href?: string;
  info?: string;
}) {
  const body = (
    <>
      <span className="stat-card__label pr-10">
        {label}
        {info ? (
          <span className="cursor-help text-subtle/70" title={info} aria-label={info}>
            ⓘ
          </span>
        ) : null}
      </span>
      <span className="stat-card__value">{value}</span>
      {hint ? <span className="stat-card__hint">{hint}</span> : null}
      {icon ? <IconTile icon={icon} color={color} /> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="stat-card transition-colors hover:border-line-strong">
        {body}
      </Link>
    );
  }
  return <div className="stat-card">{body}</div>;
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** No body padding (lists, tables). */
  flush?: boolean;
}) {
  return (
    <section className={cn("panel", className)}>
      {title || action ? (
        <div className="panel__head">
          {title ? <h2 className="panel__title">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className={cn(!flush && "panel__body", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: IconType;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-10 text-center", className)}>
      {icon ? <IconTile icon={icon} color="orange" size="lg" /> : null}
      <p className="mt-1 text-[14px] font-semibold text-ink">{title}</p>
      {body ? <p className="max-w-sm text-[13px] text-subtle">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Segmented({
  items,
  className,
  label,
}: {
  items: Array<{ label: ReactNode; href?: string; onClick?: () => void; active?: boolean; key: string }>;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("seg", className)} role="group" aria-label={label}>
      {items.map((item) =>
        item.href ? (
          <Link key={item.key} href={item.href} aria-current={item.active ? "page" : undefined}>
            {item.label}
          </Link>
        ) : (
          <button key={item.key} type="button" aria-pressed={item.active} onClick={item.onClick}>
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="switch disabled:opacity-50"
      onClick={() => onChange(!checked)}
    />
  );
}

export function formatMoney(value: number | null | undefined, opts: { cents?: boolean } = {}): string {
  const n = Number(value ?? 0);
  const dollars = opts.cents ? n / 100 : n;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dollars >= 1000 ? 0 : 2,
    minimumFractionDigits: dollars >= 1000 ? 0 : 2,
  });
}

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.round((now - t) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)} d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function greetingFor(date: Date, timeZone?: string): string {
  let hour = date.getHours();
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(date)
    ) % 24;
  } catch {
    // fall back to local hour
  }
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
