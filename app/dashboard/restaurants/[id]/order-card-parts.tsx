import { parseOrderLineItems } from "@/lib/orders/line-items";
import {
  ORDER_ACTION_LABELS,
  type OrderAction,
} from "@/lib/order-status";
import { cn } from "@/lib/cn";

export function PickupStatusBadge({
  label,
  badgeClass,
}: {
  label: string;
  badgeClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold",
        badgeClass
      )}
    >
      {label}
    </span>
  );
}

/** @deprecated Use PickupStatusBadge — session IDs belong in the modal only. */
export function OrderCardHeader({
  badge,
  badgeClass,
}: {
  badge: string;
  badgeClass: string;
  sessionId?: string;
}) {
  return <PickupStatusBadge label={badge} badgeClass={badgeClass} />;
}

export function CustomerLine({
  name,
  phone,
}: {
  name: string | null;
  phone: string | null;
}) {
  const displayName = name?.trim() || "Guest";
  return (
    <div className="kds-order-card__customer mt-3 min-w-0">
      <p
        className="kds-order-card__name text-lg font-semibold leading-snug tracking-tight text-ink sm:text-xl"
        title={displayName}
      >
        {displayName}
      </p>
      {phone ? (
        <p className="kds-order-card__phone mt-0.5 text-sm text-muted">{phone}</p>
      ) : null}
    </div>
  );
}

function OrderActionSpinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OrderActionButton({
  action,
  pending,
  disabled,
  onClick,
  variant = "primary",
}: {
  action: OrderAction;
  pending: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "primary" | "cancel";
}) {
  const label = ORDER_ACTION_LABELS[action];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-busy={pending}
      className={cn(
        "kds-thumb-btn relative w-full overflow-hidden text-sm font-semibold disabled:cursor-not-allowed",
        variant === "cancel"
          ? "min-h-12 rounded-lg border border-line bg-elev text-muted transition-colors hover:bg-card disabled:opacity-50"
          : "btn-primary min-h-12 disabled:opacity-50"
      )}
    >
      <span
        className={cn(
          "flex min-h-12 items-center justify-center gap-2 px-3",
          !pending && "pointer-events-none invisible"
        )}
        aria-hidden={!pending}
      >
        <OrderActionSpinner />
        <span>{label}</span>
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center px-3",
          pending && "invisible"
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function OrderDetailsLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kds-order-card__details-link mt-2 inline-flex min-h-11 items-center text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
    >
      Order details
    </button>
  );
}

export function OrderItemsList({ items }: { items: unknown }) {
  const lines = parseOrderLineItems(items);
  if (lines.length === 0) {
    return <p className="mt-2 text-xs text-subtle">No line items</p>;
  }
  return (
    <ul className="kds-order-card__items mt-3 space-y-1.5 border-t border-line/60 pt-3">
      {lines.map((line, i) => (
        <li key={i} className="kds-order-card__item text-sm leading-relaxed text-ink">
          <span className="type-numeric-sm text-muted">{line.quantity}×</span>{" "}
          <span className="kds-order-card__item-name">{line.name}</span>
          {line.customizations.length > 0 ? (
            <span className="kds-order-card__item-mods text-subtle">
              {" "}
              — {line.customizations.join(", ")}
            </span>
          ) : null}
          {line.notes ? (
            <span className="kds-order-card__note mt-1 block text-xs leading-snug text-subtle">
              Note: {line.notes}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
