"use client";

import { useMemo } from "react";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { formatMoney } from "@/lib/orders/money";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import {
  classifyKdsQueueLane,
  formatStuckIdleLabel,
  kdsLaneLabel,
  type KdsQueueLane,
} from "@/lib/orders/kds-queue-lane";
import {
  getOrderActionsForStatus,
  normalizeOrderStatus,
  STATUS_BADGE_CLASS,
  type OrderAction,
} from "@/lib/order-status";
import type { DbItem, DbModifier, DraftOrderRow } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  CustomerLine,
  OrderActionButton,
  OrderDetailsLink,
  OrderItemsList,
  PickupStatusBadge,
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
}: Props) {
  const menuCtx = useMemo(
    () => buildMenuPriceContext(menuItems, menuModifiers),
    [menuItems, menuModifiers]
  );
  const totals = useMemo(
    () =>
      computeOrderTotals(
        parseOrderLineItems(order.items),
        menuCtx,
        pricingSettings
      ),
    [order.items, menuCtx, pricingSettings]
  );

  const status = normalizeOrderStatus(order.status);
  const lane = queueLane ?? classifyKdsQueueLane(order);
  const laneLabel = statusLabel ?? kdsLaneLabel(order);
  const actions = getOrderActionsForStatus(order.status);
  const badgeClass = STATUS_BADGE_CLASS[status] ?? "bg-elev text-muted";
  const stuck = stuckMinutes != null && stuckMinutes >= 0;
  const primaryActions = actions.filter((a) => a !== "cancel");
  const showCancel = actions.includes("cancel");
  const actionBusy = !!pendingAction;

  const totalLabel = totals.complete
    ? formatMoney(totals.total)
    : totals.subtotal != null
      ? `${formatMoney(totals.subtotal)}+`
      : null;

  return (
    <li
      data-order-status={status}
      data-queue-lane={lane}
      className={cn(
        "kds-order-card w-full max-w-full min-w-0",
        lane === "live_call" && "kds-order-card--live-call",
        lane === "building" && "kds-order-card--building",
        lane === "new_ticket" && "kds-order-card--ticket",
        stuck && "kds-order-card--stuck",
        actionBusy && "opacity-95"
      )}
    >
      <div className="kds-order-card__badges flex flex-wrap items-center gap-2">
        <PickupStatusBadge
          label={laneLabel}
          badgeClass={cn("kds-status-badge", badgeClass)}
        />
        {stuck ? (
          <span
            className="kds-status-badge bg-danger/15 text-danger"
            role="status"
          >
            {formatStuckIdleLabel(stuckMinutes)}
          </span>
        ) : null}
      </div>

      <CustomerLine name={order.customer_name} phone={order.customer_phone} />
      <OrderItemsList items={order.items} />

      {totalLabel ? (
        <p className="kds-order-card__total type-numeric mt-3 text-ink">
          {totalLabel}
        </p>
      ) : (
        <p className="kds-order-card__total-hint mt-3 text-sm text-muted">{totals.disclaimer}</p>
      )}

      {error ? (
        <div
          className="kds-order-card__error mt-3 flex items-start justify-between gap-2 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-xs text-danger"
          role="alert"
        >
          <span className="min-w-0 [overflow-wrap:anywhere]">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="shrink-0 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {primaryActions.length > 0 || showCancel ? (
        <div className="kds-order-card__actions mt-4 flex flex-col gap-2">
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

      {onViewDetails ? <OrderDetailsLink onClick={onViewDetails} /> : null}
    </li>
  );
}
