"use client";

import { useMemo } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { formatMoney } from "@/lib/orders/money";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import {
  classifyKdsQueueLane,
  formatStuckIdleLabel,
  kdsLaneLabel,
  minutesSinceUpdated,
  type KdsQueueLane,
} from "@/lib/orders/kds-queue-lane";
import {
  getOrderActionsForStatus,
  normalizeOrderStatus,
  type OrderAction,
} from "@/lib/order-status";
import type { DbItem, DbModifier, DraftOrderRow } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  CustomerLine,
  FulfillmentLine,
  OrderActionButton,
  OrderDetailsLink,
  OrderItemsList,
  PickupStatusBadge,
  formatTicketClock,
  ticketNumber,
} from "./order-card-parts";

type Props = {
  order: DraftOrderRow;
  pendingAction: OrderAction | null;
  error: string | null;
  onAction: (action: OrderAction) => void;
  onDismissError: () => void;
  onViewDetails?: () => void;
  menuItems: DbItem[];
  menuModifiers: DbModifier[];
  pricingSettings: OrderPricingSettings;
  statusLabel?: string;
  queueLane?: KdsQueueLane;
  stuckMinutes?: number;
  /** Shared clock from the board so ages tick together. */
  now?: Date;
};

const LANE_BADGE: Record<KdsQueueLane, string> = {
  live_call: "badge--live",
  building: "badge--live",
  new_ticket: "badge--info",
  accepted: "badge--warn",
  in_progress: "badge--warn",
  ready: "badge--ok",
  terminal: "",
};

export function KitchenOrderCard({
  order,
  pendingAction,
  error,
  onAction,
  onDismissError,
  onViewDetails,
  menuItems,
  menuModifiers,
  pricingSettings,
  statusLabel,
  queueLane,
  stuckMinutes,
  now,
}: Props) {
  const menuCtx = useMemo(
    () => buildMenuPriceContext(menuItems, menuModifiers),
    [menuItems, menuModifiers]
  );
  const totals = useMemo(
    () => computeOrderTotals(parseOrderLineItems(order.items), menuCtx, pricingSettings),
    [order.items, menuCtx, pricingSettings]
  );

  const status = normalizeOrderStatus(order.status);
  const lane = queueLane ?? classifyKdsQueueLane(order);
  const laneLabel =
    statusLabel ?? (status === "canceled" ? "Canceled" : status === "completed" ? "Picked up" : kdsLaneLabel(order));
  const actions = getOrderActionsForStatus(order.status);
  const stuck = stuckMinutes != null && stuckMinutes >= 0;
  const primaryActions = actions.filter((a) => a !== "cancel");
  const showCancel = actions.includes("cancel");
  const actionBusy = !!pendingAction;
  const isLive = lane === "live_call" || lane === "building";
  const isDone = lane === "terminal";

  const placedAt = formatTicketClock(order.created_at);
  const ageMinutes = now ? minutesSinceUpdated(order.created_at, now) : null;

  const totalLabel = totals.complete
    ? formatMoney(totals.total)
    : totals.subtotal != null
      ? `${formatMoney(totals.subtotal)}+`
      : null;

  return (
    <li
      data-order-status={status}
      data-queue-lane={lane}
      aria-label={`Ticket ${ticketNumber(order.id)} for ${order.customer_name?.trim() || "guest"}, ${laneLabel}`}
      className={cn(
        "kds-ticket",
        isLive && "kds-ticket--live",
        lane === "ready" && "kds-ticket--ready",
        isDone && "kds-ticket--done",
        stuck && "kds-ticket--stuck",
        actionBusy && "opacity-95"
      )}
    >
      {/* Header: ticket number, status, time */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <span className="font-mono text-[13px] font-bold tracking-wide text-subtle">
          {ticketNumber(order.id)}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {stuck ? (
            <span className="badge badge--bad" role="status">
              <AlertTriangle size={11} aria-hidden />
              {formatStuckIdleLabel(stuckMinutes)}
            </span>
          ) : null}
          <PickupStatusBadge
            label={laneLabel}
            badgeClass={cn(LANE_BADGE[lane], status === "canceled" && "badge--bad")}
          />
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3 px-4">
        <CustomerLine name={order.customer_name} phone={order.customer_phone} />
        {placedAt ? (
          <p className="flex shrink-0 items-center gap-1 pb-0.5 text-[12.5px] font-medium tabular-nums text-subtle">
            <Clock size={12} aria-hidden />
            <time dateTime={order.created_at}>{placedAt}</time>
            {ageMinutes != null && !isDone ? (
              <span className={cn(ageMinutes >= 15 && "text-[rgb(var(--tile-amber-ink))]")}>
                · {ageMinutes < 1 ? "now" : `${ageMinutes}m`}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="kds-ticket__tear mt-3" aria-hidden />

      <div className="space-y-3 px-4 py-3">
        {isLive && parseOrderLineItems(order.items).length === 0 ? (
          <p className="text-[13.5px] text-muted">Guest is on the line. Items show up as they order.</p>
        ) : (
          <OrderItemsList items={order.items} size={isDone ? "compact" : "ticket"} />
        )}
        <FulfillmentLine
          fulfillmentType={order.fulfillment_type}
          address={order.delivery_address}
          instructions={order.delivery_instructions}
        />
      </div>

      {error ? (
        <div
          className="mx-4 mb-3 flex items-start justify-between gap-2 rounded-[10px] border border-danger/25 bg-danger/[0.05] px-3 py-2 text-[13px] text-danger"
          role="alert"
        >
          <span className="min-w-0 [overflow-wrap:anywhere]">{error}</span>
          <button type="button" onClick={onDismissError} className="shrink-0 font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/80 px-4 py-2">
        {totalLabel ? (
          <p className="font-mono text-[15px] font-bold tabular-nums text-ink">{totalLabel}</p>
        ) : (
          <p className="text-[12.5px] text-subtle">{totals.disclaimer}</p>
        )}
        {onViewDetails ? <OrderDetailsLink onClick={onViewDetails} /> : null}
      </div>

      {primaryActions.length > 0 || showCancel ? (
        <div className="grid gap-2 px-4 pb-4">
          {primaryActions.map((action) => (
            <OrderActionButton
              key={action}
              action={action}
              pending={pendingAction === action}
              disabled={actionBusy}
              onClick={() => onAction(action)}
            />
          ))}
          {showCancel ? (
            <OrderActionButton
              action="cancel"
              variant="cancel"
              pending={pendingAction === "cancel"}
              disabled={actionBusy}
              onClick={() => onAction("cancel")}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
