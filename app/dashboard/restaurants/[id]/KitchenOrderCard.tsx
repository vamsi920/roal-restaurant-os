"use client";

import { useMemo } from "react";
import { OrderTotalsBreakdown } from "@/components/orders/OrderTotalsBreakdown";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import {
  getOrderActionsForStatus,
  normalizeOrderStatus,
  ORDER_ACTION_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_BADGE_CLASS,
  type OrderAction,
  type OrderStatusTimestamps,
} from "@/lib/order-status";
import type { DbItem, DbModifier, DraftOrderRow } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CustomerLine, OrderCardHeader, OrderItemsList } from "./order-card-parts";

const TIMELINE: {
  key: keyof OrderStatusTimestamps;
  label: string;
}[] = [
  { key: "accepted_at", label: "Accepted" },
  { key: "in_progress_at", label: "Started" },
  { key: "ready_at", label: "Ready" },
  { key: "completed_at", label: "Completed" },
  { key: "canceled_at", label: "Canceled" },
];

function formatTs(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

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
  borderClass?: string;
  bgClass?: string;
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
  borderClass = "border-accent/35",
  bgClass = "bg-accent/[0.04]",
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
  const actions = getOrderActionsForStatus(order.status);
  const badgeClass =
    STATUS_BADGE_CLASS[status] ?? "bg-elev text-muted";

  return (
    <li
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        borderClass,
        bgClass,
        pendingAction && "opacity-90"
      )}
    >
      <OrderCardHeader
        badge={ORDER_STATUS_LABELS[status]}
        badgeClass={badgeClass}
        sessionId={order.session_id}
      />
      <CustomerLine name={order.customer_name} phone={order.customer_phone} />
      <OrderItemsList items={order.items} />

      <OrderTotalsBreakdown totals={totals} compact className="mt-2" />

      <StatusTimeline order={order} />

      {error ? (
        <div className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-xs text-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="shrink-0 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {(onViewDetails || actions.length > 0) ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line/60 pt-3">
          {onViewDetails ? (
            <button
              type="button"
              onClick={onViewDetails}
              className="min-h-10 rounded-lg border border-line bg-elev px-3 py-2 text-xs font-semibold text-ink hover:bg-card"
            >
              Details
            </button>
          ) : null}
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={!!pendingAction}
              onClick={() => onAction(action)}
              className={cn(
                "min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                action === "cancel"
                  ? "border border-line bg-elev text-muted hover:bg-card"
                  : "btn-primary py-2"
              )}
            >
              {pendingAction === action ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner />
                  {ORDER_ACTION_LABELS[action]}…
                </span>
              ) : (
                ORDER_ACTION_LABELS[action]
              )}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-subtle">
        Updated {formatTs(order.updated_at) ?? "—"}
      </p>
    </li>
  );
}

function StatusTimeline({ order }: { order: DraftOrderRow }) {
  const entries = TIMELINE.filter((t) => order[t.key]).map((t) => ({
    label: t.label,
    at: formatTs(order[t.key]),
  }));

  if (entries.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
      {entries.map((e) => (
        <li key={e.label}>
          <span className="font-medium text-subtle">{e.label}</span> {e.at}
        </li>
      ))}
    </ul>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
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
