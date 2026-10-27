import { Bike, Loader2, ShoppingBag } from "lucide-react";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import { ORDER_ACTION_LABELS, type OrderAction } from "@/lib/order-status";
import { cn } from "@/lib/cn";

/*
 * Ticket building blocks for the Kitchen board and the order drawer.
 * Kitchen tablets are read from arm's length: guest name 19px, items 15px,
 * notes on an amber highlight, 44px status buttons.
 */

/** Short, kitchen-callable ticket number derived from the order id ("#4F2A"). */
export function ticketNumber(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "");
  return `#${compact.slice(-4).toUpperCase() || "----"}`;
}

export function formatTicketClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function PickupStatusBadge({
  label,
  badgeClass,
}: {
  label: string;
  /** Badge tone classes, e.g. "badge--ok". */
  badgeClass: string;
}) {
  return <span className={cn("badge", badgeClass)}>{label}</span>;
}

/** @deprecated Use PickupStatusBadge — session IDs belong in the drawer only. */
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
    <div className="min-w-0">
      <p
        className="truncate font-display text-[19px] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[20px]"
        title={displayName}
      >
        {displayName}
      </p>
      {phone ? <p className="mt-0.5 truncate text-[13px] text-muted">{phone}</p> : null}
    </div>
  );
}

export function FulfillmentLine({
  fulfillmentType,
  address,
  instructions,
}: {
  fulfillmentType: "pickup" | "delivery" | string | null;
  address?: string | null;
  instructions?: string | null;
}) {
  const isDelivery = fulfillmentType === "delivery" || Boolean(address?.trim());
  const Icon = isDelivery ? Bike : ShoppingBag;
  return (
    <div className="min-w-0 text-[13px]">
      <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
        <Icon size={14} aria-hidden className="text-subtle" />
        {isDelivery ? "Delivery" : "Pickup"}
      </p>
      {isDelivery && address?.trim() ? (
        <p className="mt-0.5 text-muted [overflow-wrap:anywhere]">{address}</p>
      ) : null}
      {isDelivery && instructions?.trim() ? (
        <p className="kds-ticket__note mt-1.5 [overflow-wrap:anywhere]">{instructions}</p>
      ) : null}
    </div>
  );
}

/** Kitchen verbs, a little more explicit than the API labels. */
const KITCHEN_ACTION_LABEL: Record<OrderAction, string> = {
  accept: `${ORDER_ACTION_LABELS.accept} ticket`,
  start: `${ORDER_ACTION_LABELS.start} preparing`,
  mark_ready: `Mark ${ORDER_ACTION_LABELS.mark_ready.toLowerCase()}`,
  complete: `${ORDER_ACTION_LABELS.complete} pickup`,
  cancel: `${ORDER_ACTION_LABELS.cancel} order`,
};

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
  const label = KITCHEN_ACTION_LABEL[action];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-busy={pending}
      className={cn(
        "relative w-full touch-manipulation",
        variant === "cancel"
          ? "btn-ghost btn-sm min-h-11 text-muted sm:min-h-9"
          : action === "complete" || action === "mark_ready"
            ? "btn-primary btn-lg min-h-11 !border-success !bg-success hover:!bg-success/90"
            : "btn-primary btn-lg min-h-11"
      )}
    >
      {/* Both layers stay mounted so the button keeps its width while pending. */}
      <span
        className={cn("flex items-center justify-center gap-2", !pending && "invisible")}
        aria-hidden={!pending}
      >
        <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden />
        <span>{label}</span>
      </span>
      <span
        className={cn("absolute inset-0 flex items-center justify-center px-3", pending && "invisible")}
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
      className="inline-flex min-h-11 items-center rounded-md px-1 text-[13px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline sm:min-h-8"
    >
      Order details
    </button>
  );
}

export function OrderItemsList({ items, size = "ticket" }: { items: unknown; size?: "ticket" | "compact" }) {
  const lines = parseOrderLineItems(items);
  if (lines.length === 0) {
    return <p className="text-[13px] text-subtle">No items yet</p>;
  }
  const compact = size === "compact";
  return (
    <ul className={cn("min-w-0", compact ? "space-y-1" : "space-y-2.5")}>
      {lines.map((line, i) => (
        <li key={i} className="flex min-w-0 gap-2.5">
          <span
            className={cn(
              "shrink-0 font-mono font-bold tabular-nums text-ink",
              compact ? "w-6 text-[13px]" : "w-7 text-[15px]"
            )}
          >
            {line.quantity}×
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-semibold leading-snug text-ink [overflow-wrap:anywhere]",
                compact ? "text-[13.5px]" : "text-[15px]"
              )}
            >
              {line.name}
            </p>
            {line.customizations.length > 0 ? (
              <p className="mt-0.5 text-[13.5px] leading-snug text-muted [overflow-wrap:anywhere]">
                {line.customizations.join(" · ")}
              </p>
            ) : null}
            {line.notes ? (
              <p className="kds-ticket__note mt-1 [overflow-wrap:anywhere]">
                <span className="sr-only">Note: </span>
                {line.notes}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
