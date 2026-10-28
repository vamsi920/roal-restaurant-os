"use client";

import { formatPhoneForDisplay } from "@/lib/phone/e164";
import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, Play, Printer, UserRound } from "lucide-react";
import { Badge, IconTile } from "@/components/ui";
import { Notice } from "@/components/live-orders/workspace-ui";
import { DrawerSection, SideDrawer } from "@/components/live-orders/SideDrawer";
import { TranscriptBubbles } from "@/components/call-history/TranscriptBubbles";
import {
  getOrderActionsForStatus,
  normalizeOrderStatus,
  ORDER_STATUS_LABELS,
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
import type { OrderCallEvidence } from "@/lib/live-orders/call-evidence";
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
import { OrderActionButton, formatTicketClock, ticketNumber } from "./order-card-parts";

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
  callEvidence?: OrderCallEvidence | null;
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
  callEvidence = null,
  onAction,
  onDismissError,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
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
        history: buildOrderStatusHistory(order),
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        fulfillmentType: order.fulfillment_type,
        deliveryAddress: order.delivery_address,
        deliveryInstructions: order.delivery_instructions,
        sessionId: order.session_id,
        finalizedAt: null as string | null,
        callEvidence,
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
        history: buildReceiptStatusHistory(receipt),
      customerName: receipt.customer_name,
      customerPhone: receipt.customer_phone,
      fulfillmentType: receipt.fulfillment_type,
      deliveryAddress: receipt.delivery_address,
      deliveryInstructions: receipt.delivery_instructions,
      sessionId: receipt.session_id,
      finalizedAt: receipt.created_at,
      callEvidence,
      actions: [] as OrderAction[],
    };
  }, [selection, menuCtx, pricingSettings, callEvidence]);

  useEffect(() => {
    if (!open) setPrintError(null);
  }, [open]);

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

  const statusTone =
    detail?.status === "ready" || detail?.status === "completed" || detail?.kind === "receipt"
      ? "ok"
      : detail?.status === "canceled"
        ? "bad"
        : detail?.status === "draft"
          ? "live"
          : detail?.status === "new"
            ? "info"
            : "warn";

  const footer = detail ? (
    <div className="flex flex-col gap-2">
      {actionError ? (
        <Notice
          tone="bad"
          role="alert"
          action={
            onDismissError ? (
              <button type="button" className="font-semibold underline" onClick={onDismissError}>
                Dismiss
              </button>
            ) : null
          }
        >
          {actionError}
        </Notice>
      ) : null}

      {detail.actions.length > 0 && onAction ? (
        <div className="grid gap-2">
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
        <p className="text-[12.5px] text-[rgb(var(--tile-amber-ink))]" role="status">
          {printError}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">
          Close
        </button>
        <button type="button" onClick={handlePrint} className="btn-ghost w-full sm:w-auto">
          <Printer size={15} aria-hidden />
          Print receipt
        </button>
      </div>
    </div>
  ) : null;

  const placedAt = detail
    ? detail.kind === "draft"
      ? detail.order.created_at
      : detail.receipt.created_at
    : null;

  return (
    <SideDrawer
      open={open && !!detail}
      onClose={onClose}
      titleId="kds-order-detail-title"
      closeLabel="Close order summary"
      title={
        detail ? (
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span>Order summary</span>
            <span className="font-mono text-[14px] font-bold text-subtle">
              {ticketNumber(detail.kind === "draft" ? detail.order.id : detail.receipt.id)}
            </span>
          </span>
        ) : (
          "Order summary"
        )
      }
      subtitle={
        detail
          ? `${restaurantName} · ${detail.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}${
              placedAt ? ` · placed ${formatTicketClock(placedAt)}` : ""
            }`
          : null
      }
      badge={detail ? <Badge tone={statusTone}>{detail.statusLabel}</Badge> : null}
      footer={footer}
    >
      {detail ? (
        <>
          <DrawerSection title="Guest">
            <div className="flex items-center gap-3">
              <IconTile icon={UserRound} color="green" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {detail.customerName?.trim() || "Guest"}
                </p>
                {detail.customerPhone ? (
                  <p className="text-[13px] text-muted">{formatPhoneForDisplay(detail.customerPhone)}</p>
                ) : (
                  <p className="text-[13px] text-subtle">No phone on file</p>
                )}
              </div>
              {detail.customerPhone ? (
                <a
                  href={`tel:${detail.customerPhone.replace(/[^\d+]/g, "")}`}
                  className="btn-ghost btn-sm shrink-0"
                >
                  <Phone size={14} aria-hidden />
                  Call
                </a>
              ) : null}
            </div>
            {detail.fulfillmentType === "delivery" ? (
              <div className="mt-3 rounded-[10px] border border-line bg-elev px-3 py-2 text-[13px]">
                <p className="font-semibold text-ink">Delivery</p>
                <p className="mt-0.5 text-muted [overflow-wrap:anywhere]">
                  {detail.deliveryAddress?.trim() || "No delivery address on file"}
                </p>
                {detail.deliveryInstructions?.trim() ? (
                  <p className="kds-ticket__note mt-1.5 [overflow-wrap:anywhere]">
                    {detail.deliveryInstructions}
                  </p>
                ) : null}
              </div>
            ) : null}
          </DrawerSection>

          <DrawerSection title={`Items · ${detail.lineItems.length}`}>
            {detail.lineItems.length === 0 ? (
              <p className="text-[13px] text-subtle">No items yet</p>
            ) : (
              <ul className="divide-y divide-line rounded-[12px] border border-line">
                {detail.lineItems.map((line, i) => {
                  const est = detail.totals.lines[i];
                  return (
                    <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="flex min-w-0 gap-2.5">
                        <span className="w-6 shrink-0 font-mono text-[14px] font-bold tabular-nums text-ink">
                          {line.quantity}×
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-ink [overflow-wrap:anywhere]">
                            {line.name}
                          </p>
                          {line.customizations.length > 0 ? (
                            <p className="mt-0.5 text-[13px] text-muted [overflow-wrap:anywhere]">
                              {line.customizations.join(" · ")}
                            </p>
                          ) : null}
                          {line.notes ? (
                            <p className="kds-ticket__note mt-1 [overflow-wrap:anywhere]">{line.notes}</p>
                          ) : null}
                        </div>
                      </div>
                      <p className="shrink-0 font-mono text-[13.5px] tabular-nums text-ink">
                        {formatMoney(est?.lineTotal ?? null)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 rounded-[12px] bg-elev px-3 py-2">
              <OrderTotalsBreakdown totals={detail.totals} className="space-y-1.5 text-[13.5px]" />
            </div>
          </DrawerSection>

          {detail.history.length > 0 ? (
            <DrawerSection title="Timeline">
              <ol className="space-y-0 border-l border-line pl-4">
                {detail.history.map((h, idx) => (
                  <li key={`${h.iso}-${idx}`} className="relative pb-3.5 last:pb-0">
                    <span
                      className={cn(
                        "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                        h.tone === "call" && "bg-warning",
                        h.tone === "ticket" && "bg-accent",
                        h.tone === "kitchen" && "bg-ink",
                        h.tone === "done" && "bg-success",
                        h.tone === "danger" && "bg-danger"
                      )}
                      aria-hidden
                    />
                    <p className="text-[13.5px] font-semibold text-ink">
                      {h.label}
                      <span className="ml-2 font-normal tabular-nums text-subtle">{h.at}</span>
                    </p>
                    <p className="text-[12.5px] text-muted">{h.description}</p>
                  </li>
                ))}
              </ol>
            </DrawerSection>
          ) : null}

          {detail.callEvidence ? (
            <DrawerSection
              title="The call"
              action={
                detail.callEvidence.recordingUrl ? (
                  <a
                    href={detail.callEvidence.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost btn-sm"
                  >
                    <Play size={13} aria-hidden />
                    Recording
                  </a>
                ) : null
              }
            >
              {detail.callEvidence.transcriptSummary ? (
                <p className="mb-3 rounded-[12px] border border-line bg-elev px-3 py-2 text-[13.5px] text-muted [overflow-wrap:anywhere]">
                  {detail.callEvidence.transcriptSummary}
                </p>
              ) : null}
              {detail.callEvidence.transcriptLines.length > 0 ? (
                <TranscriptBubbles lines={detail.callEvidence.transcriptLines} />
              ) : !detail.callEvidence.transcriptSummary ? (
                <p className="text-[13px] text-subtle">The transcript hasn&apos;t arrived yet.</p>
              ) : null}
            </DrawerSection>
          ) : null}

          <details className="mt-6 rounded-[10px] border border-line px-3 py-2">
            <summary className="cursor-pointer text-[12.5px] font-medium text-subtle">Call reference</summary>
            <p className="mt-2 break-all font-mono text-[12px] text-subtle">{detail.sessionId}</p>
          </details>

          <div className="sr-only" aria-hidden>
            <div ref={printRef}>
              <ReceiptPrintBody restaurantName={restaurantName} detail={detail} />
            </div>
          </div>
        </>
      ) : null}
    </SideDrawer>
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
        {detail.customerPhone ? ` · ${formatPhoneForDisplay(detail.customerPhone)}` : ""}
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
