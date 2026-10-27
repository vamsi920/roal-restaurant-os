import type { ComponentType, ReactNode, SVGProps } from "react";
import { IconTile, type TileColor } from "@/components/ui";
import { cn } from "@/lib/cn";

/*
 * Menu-module primitives that sit on top of components/ui and the globals.css
 * classes (.panel, .switch, .field-label, .input-base). No hooks here, so both
 * server and client components can use them.
 */

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

/** Panel with an icon tile, title, one-line description and an optional head action. */
export function SettingsPanel({
  id,
  icon,
  color = "orange",
  title,
  titleId,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  icon?: IconType;
  color?: TileColor;
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn("panel scroll-mt-24", className)}
      aria-labelledby={titleId}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-line px-[1.125rem] py-3.5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon ? <IconTile icon={icon} color={color} /> : null}
          <div className="min-w-0">
            <h2 id={titleId} className="text-[14px] font-semibold leading-8 text-ink">
              {title}
            </h2>
            {description ? (
              <p className="-mt-0.5 text-[12.5px] text-subtle [overflow-wrap:anywhere]">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      <div className={cn("px-[1.125rem] py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small uppercase-free sub-heading inside a panel body. */
export function SubHeading({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-2", className)}>
      <h3 className="text-[13px] font-semibold text-ink">{children}</h3>
      {action}
    </div>
  );
}

/** Label + control wrapper using the global .field-label style. */
export function Field({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="field-label">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * Accessible switch with a 44px hit area on touch screens. Visuals come from the
 * global .switch track; state is styled with utilities so the inner track needs
 * no ARIA of its own.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
  busy,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] disabled:cursor-not-allowed disabled:opacity-50 lg:h-8 lg:min-w-9",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "switch motion-reduce:transition-none motion-reduce:after:transition-none",
          checked && "bg-success after:translate-x-[0.875rem]",
          busy && "opacity-60"
        )}
      />
    </button>
  );
}

/** Checkbox row styled for settings forms. */
export function CheckRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5 text-[13.5px] text-ink lg:min-h-0",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12.5px] text-subtle">{hint}</span> : null}
      </span>
    </label>
  );
}

export function formatMenuPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}
