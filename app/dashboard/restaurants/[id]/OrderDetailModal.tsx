"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  getOrderActionsForStatus,
  normalizeOrderStatus,
  ORDER_STATUS_LABELS,
  STATUS_BADGE_CLASS,
  type OrderAction,
} from "@/lib/order-status";
import { OrderTotalsBreakdown, orderTotalsPrintRows } from "@/components/orders/OrderTotalsBreakdown";
import {
  computeOrderTotals,
  type OrderTotals,
} from "@/lib/orders/compute-order-totals";
import { formatMoney } from "@/lib/orders/money";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import {
  buildOrderStatusHistory,
  buildReceiptStatusHistory,
} from "@/lib/orders/status-history";
import type {
  DbItem,
  DbModifier,
  DraftOrderRow,
  PhoneOrderReceiptRow,
} from "@/lib/types";
import { cn } from "@/lib/cn";
import { OrderActionButton } from "./order-card-parts";

export type OrderDetailSelection =
  | { kind: "draft"; order: DraftOrderRow }
  | { kind: "receipt"; receipt: PhoneOrderReceiptRow };

type Props = {
  open: boolean;
  onClose: () => void;
  selection: OrderDetailSelection | null;
  restaurantName: string;
  menuItems: DbItem[];
  menuModifiers: DbModifier[];
  pricingSettings: OrderPricingSettings;
  pendingAction?: OrderAction | null;
  actionError?: string | null;
  onAction?: (action: OrderAction) => void;
  onDismissError?: () => void;
};

export function OrderDetailModal({
  open,
  onClose,
  selection,
  restaurantName,
  menuItems,
  menuModifiers,
  pricingSettings,
  pendingAction = null,
  actionError = null,
  onAction,
  onDismissError,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const menuCtx = useMemo(
    () => buildMenuPriceContext(menuItems, menuModifiers),
    [menuItems, menuModifiers]
  );

  const detail = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === "draft") {
      const order = selection.order;
      const lineItems = parseOrderLineItems(order.items);
      const totals = computeOrderTotals(lineItems, menuCtx, pricingSettings);
      const status = normalizeOrderStatus(order.status);
      return {
        kind: "draft" as const,
        order,
        lineItems,
        totals,
        status,
        statusLabel: ORDER_STATUS_LABELS[status],
        badgeClass: STATUS_BADGE_CLASS[status] ?? "bg-elev text-muted",
        history: buildOrderStatusHistory(order),
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        sessionId: order.session_id,
        finalizedAt: null as string | null,
        actions: getOrderActionsForStatus(order.status),
      };
    }

    const receipt = selection.receipt;
    const lineItems = parseOrderLineItems(receipt.items);
    const totals = computeOrderTotals(lineItems, menuCtx, pricingSettings);
    return {
      kind: "receipt" as const,
      receipt,
      lineItems,
      totals,
      status: null,
      statusLabel: "Done",
      badgeClass: "bg-elev text-muted",
      history: buildReceiptStatusHistory(receipt.created_at),
      customerName: receipt.customer_name,
      customerPhone: receipt.customer_phone,
      sessionId: receipt.session_id,
      finalizedAt: receipt.created_at,
      actions: [] as OrderAction[],
    };
  }, [selection, menuCtx, pricingSettings]);

  useEffect(() => {
    if (!open) {
      setPrintError(null);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !detail) return;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, detail]);

  function handlePrint() {
    if (!printRef.current || !detail) return;
    setPrintError(null);
    const html = printRef.current.innerHTML;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      setPrintError("Allow pop-ups to print, or use the browser print dialog.");
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8" />
      <title>Receipt — ${escapeHtml(restaurantName)}</title>
      <style>
        body { font-family: system-ui, sans-serif; font-size: 14px; color: #111; padding: 24px; max-width: 400px; margin: 0 auto; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .muted { color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { text-align: left; padding: 6px 0; vertical-align: top; }
        th { border-bottom: 1px solid #ccc; font-size: 11px; text-transform: uppercase; color: #666; }
        .qty { width: 32px; }
        .money { text-align: right; white-space: nowrap; }
        .line-mod { font-size: 12px; color: #555; margin: 2px 0 0 16px; }
        .line-note { font-size: 12px; color: #333; font-style: italic; margin: 2px 0 0 16px; }
        .totals { border-top: 1px solid #ccc; padding-top: 12px; margin-top: 12px; }
        .totals div { display: flex; justify-content: space-between; margin: 4px 0; }
        .total-row { font-weight: 700; font-size: 16px; margin-top: 8px; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <Transition appear show={open && !!detail} as={Fragment}>
      <Dialog
        as="div"
        className="kds-order-detail-dialog kds-modal-layer"
        onClose={onClose}
        aria-labelledby="kds-order-detail-title"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="kds-order-detail-dialog__viewport fixed inset-0 overflow-y-auto overscroll-contain">
          <div className="kds-order-detail-dialog__position flex min-h-full items-end justify-center sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-[0.98]"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-[0.98]"
            >
              <Dialog.Panel className="kds-order-detail-dialog__panel glass-card flex max-h-[min(92dvh,720px)] w-full max-w-full flex-col overflow-hidden rounded-t-2xl shadow-xl sm:max-h-[min(88dvh,680px)] sm:max-w-lg sm:rounded-2xl">
                {detail ? (
                  <>
                    <div
                      className="kds-order-detail-dialog__grabber sm:hidden"
                      aria-hidden
                    />
                    <div className="kds-order-detail-dialog__header flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 pb-4 pt-3 sm:px-5 sm:py-4">
                      <div className="min-w-0">
                        <Dialog.Title
                          id="kds-order-detail-title"
                          className="text-lg font-semibold tracking-tight"
                        >
                          Order summary
                        </Dialog.Title>
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {restaurantName} · Pickup
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-semibold",
                            detail.badgeClass
                          )}
                        >
                          {detail.statusLabel}
                        </span>
                        <button
                          ref={closeRef}
                          type="button"
                          onClick={onClose}
                          className="kds-order-detail-dialog__close kds-thumb-btn grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-elev text-muted hover:text-ink"
                          aria-label="Close order summary"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="kds-order-detail-dialog__body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                      <section>
                        <h3 className="text-sm font-semibold text-ink">Customer</h3>
                        <p className="mt-2 text-base font-semibold text-ink">
                          {detail.customerName?.trim() || "Guest"}
                        </p>
                        {detail.customerPhone ? (
                          <a
                            href={`tel:${detail.customerPhone.replace(/[^\d+]/g, "")}`}
                            className="mt-1 inline-block text-base text-accent hover:underline"
                          >
                            {detail.customerPhone}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-muted">No phone on file</p>
                        )}
                      </section>

                      <section className="mt-6">
                        <h3 className="text-sm font-semibold text-ink">Items</h3>
                        {detail.lineItems.length === 0 ? (
                          <p className="mt-2 text-sm text-muted">No items yet</p>
                        ) : (
                          <ul className="mt-3 divide-y divide-line">
                            {detail.lineItems.map((line, i) => {
                              const est = detail.totals.lines[i];
                              return (
                                <li key={i} className="py-3 first:pt-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="kds-order-detail-dialog__line min-w-0">
                                      <p className="text-sm font-medium text-ink [overflow-wrap:anywhere]">
                                        {line.quantity}× {line.name}
                                      </p>
                                      {line.customizations.length > 0 ? (
                                        <ul className="mt-1.5 space-y-0.5">
                                          {line.customizations.map((c) => (
                                            <li
                                              key={c}
                                              className="text-sm text-muted"
                                            >
                                              {c}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : null}
                                      {line.notes ? (
                                        <p className="mt-1 text-sm text-muted">
                                          {line.notes}
                                        </p>
                                      ) : null}
                                    </div>
                                    <p className="type-numeric-sm shrink-0 text-ink">
                                      {formatMoney(est?.lineTotal ?? null)}
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>

                      <section className="mt-6 rounded-xl border border-line bg-elev p-4">
                        <h3 className="text-sm font-semibold text-ink">Total</h3>
                        <OrderTotalsBreakdown totals={detail.totals} className="mt-2" />
                      </section>

                      {detail.history.length > 0 ? (
                        <section className="mt-6">
                          <h3 className="text-sm font-semibold text-ink">Timeline</h3>
                          <ol className="mt-3 space-y-0 border-l border-line pl-4">
                            {detail.history.map((h, idx) => (
                              <li
                                key={`${h.iso}-${idx}`}
                                className="relative pb-4 last:pb-0"
                              >
                                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-accent" />
                                <p className="text-sm font-medium text-ink">
                                  {h.label}
                                </p>
                                <p className="text-sm text-muted">{h.at}</p>
                              </li>
                            ))}
                          </ol>
                        </section>
                      ) : null}

                      <details className="mt-6 rounded-lg border border-line/80 bg-elev/50 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-medium text-muted">
                          Call reference
                        </summary>
                        <p className="mt-2 break-all text-xs text-subtle">
                          {detail.sessionId}
                        </p>
                      </details>
                    </div>

                    <div className="kds-order-detail-dialog__footer flex shrink-0 flex-col gap-2 border-t border-line bg-card p-4 sm:px-5">
                      {actionError ? (
                        <div
                          className="kds-order-detail-dialog__error flex items-start justify-between gap-2 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger"
                          role="alert"
                        >
                          <span className="min-w-0 [overflow-wrap:anywhere]">
                            {actionError}
                          </span>
                          {onDismissError ? (
                            <button
                              type="button"
                              className="shrink-0 font-medium underline"
                              onClick={onDismissError}
                            >
                              Dismiss
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {detail.actions.length > 0 && onAction ? (
                        <div className="kds-order-detail-dialog__actions flex flex-col gap-2">
                          {detail.actions
                            .filter((a) => a !== "cancel")
                            .map((action) => (
                              <OrderActionButton
                                key={action}
                                action={action}
                                pending={pendingAction === action}
                                disabled={!!pendingAction}
                                onClick={() => onAction(action)}
                              />
                            ))}
                          {detail.actions.includes("cancel") ? (
                            <OrderActionButton
                              action="cancel"
                              variant="cancel"
                              pending={pendingAction === "cancel"}
                              disabled={!!pendingAction}
                              onClick={() => onAction("cancel")}
                            />
                          ) : null}
                        </div>
                      ) : null}

                      {printError ? (
                        <p className="text-xs text-warning" role="status">
                          {printError}
                        </p>
                      ) : null}
                      <div className="kds-order-detail-dialog__footer-tools flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={onClose}
                          className="btn-ghost min-h-11 w-full sm:w-auto"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="btn-primary min-h-11 w-full justify-center sm:w-auto"
                        >
                          Print receipt
                        </button>
                      </div>
                    </div>

                    <div className="sr-only" aria-hidden>
                      <div ref={printRef}>
                        <ReceiptPrintBody
                          restaurantName={restaurantName}
                          detail={detail}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

type PrintDetail = {
  customerName: string | null;
  customerPhone: string | null;
  statusLabel: string;
  finalizedAt: string | null;
  lineItems: ReturnType<typeof parseOrderLineItems>;
  totals: OrderTotals;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ReceiptPrintBody({
  restaurantName,
  detail,
}: {
  restaurantName: string;
  detail: PrintDetail;
}) {
  return (
    <>
      <h1>{restaurantName}</h1>
      <p className="muted">Phone order receipt</p>
      <p className="muted">
        {detail.finalizedAt
          ? `Finalized ${new Date(detail.finalizedAt).toLocaleString()}`
          : `Printed ${new Date().toLocaleString()}`}
      </p>
      <p>
        <strong>{detail.customerName ?? "Guest"}</strong>
        {detail.customerPhone ? ` · ${detail.customerPhone}` : ""}
      </p>
      <p className="muted">Status: {detail.statusLabel}</p>
      <table>
        <thead>
          <tr>
            <th className="qty">Qty</th>
            <th>Item</th>
            <th className="money">Amount</th>
          </tr>
        </thead>
        <tbody>
          {detail.lineItems.map((line, i) => {
            const est = detail.totals.lines[i];
            return (
              <tr key={i}>
                <td className="qty">{line.quantity}</td>
                <td>
                  {line.name}
                  {line.customizations.map((c) => (
                    <div key={c} className="line-mod">
                      + {c}
                    </div>
                  ))}
                  {line.notes ? (
                    <div className="line-note">Note: {line.notes}</div>
                  ) : null}
                </td>
                <td className="money">
                  {formatMoney(est?.lineTotal ?? null)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div
        className="totals"
        dangerouslySetInnerHTML={{
          __html: orderTotalsPrintRows(detail.totals),
        }}
      />
      <p className="muted">{detail.totals.disclaimer}</p>
    </>
  );
}
