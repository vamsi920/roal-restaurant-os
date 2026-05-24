import type { OrderTotals } from "@/lib/orders/compute-order-totals";
import { formatMoney, formatPercent } from "@/lib/orders/money";

type Props = {
  totals: OrderTotals;
  compact?: boolean;
  className?: string;
};

export function OrderTotalsBreakdown({
  totals,
  compact = false,
  className,
}: Props) {
  if (!totals.complete && totals.subtotal == null) {
    return (
      <p className={className ?? "text-xs text-muted"}>{totals.disclaimer}</p>
    );
  }

  if (compact) {
    return (
      <p
        className={
          className ?? "font-mono-tabular text-sm font-semibold text-ink"
        }
      >
        {totals.complete ? (
          <>Total {formatMoney(totals.total)}</>
        ) : (
          <>Subtotal {formatMoney(totals.subtotal)}+</>
        )}
      </p>
    );
  }

  return (
    <dl className={className ?? "mt-3 space-y-2 text-sm"}>
      <Row label="Subtotal" value={formatMoney(totals.subtotal)} strong />
      {totals.discount > 0 ? (
        <Row label="Discount" value={`−${formatMoney(totals.discount)}`} />
      ) : null}
      {totals.serviceFeePercent > 0 ? (
        <Row
          label={`Service (${formatPercent(totals.serviceFeePercent)})`}
          value={formatMoney(totals.serviceFee)}
        />
      ) : totals.serviceFee > 0 ? (
        <Row label="Service" value={formatMoney(totals.serviceFee)} />
      ) : null}
      {totals.taxRatePercent > 0 ? (
        <Row
          label={`Tax (${formatPercent(totals.taxRatePercent)})`}
          value={formatMoney(totals.tax)}
        />
      ) : totals.tax > 0 ? (
        <Row label="Tax" value={formatMoney(totals.tax)} />
      ) : null}
      <div className="flex justify-between gap-4 border-t border-line pt-2 text-base">
        <dt className="font-semibold text-ink">Total</dt>
        <dd className="font-mono-tabular font-semibold text-ink">
          {formatMoney(totals.complete ? totals.total : totals.subtotal)}
          {!totals.complete ? "+" : null}
        </dd>
      </div>
      <p className="text-[11px] text-muted">{totals.disclaimer}</p>
    </dl>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-medium text-ink" : "text-muted"}>{label}</dt>
      <dd className="font-mono-tabular text-ink">{value}</dd>
    </div>
  );
}

export function orderTotalsPrintRows(totals: OrderTotals): string {
  const row = (label: string, value: string, extraClass = "") =>
    `<div class="${extraClass}"><span>${label}</span><span>${value}</span></div>`;
  const rows: string[] = [row("Subtotal", formatMoney(totals.subtotal))];
  if (totals.discount > 0) {
    rows.push(row("Discount", `−${formatMoney(totals.discount)}`));
  }
  if (totals.serviceFee > 0) {
    rows.push(row("Service", formatMoney(totals.serviceFee)));
  }
  if (totals.tax > 0) {
    rows.push(row("Tax", formatMoney(totals.tax)));
  }
  const totalLabel = totals.complete
    ? formatMoney(totals.total)
    : totals.subtotal != null
      ? `${formatMoney(totals.subtotal)} (partial)`
      : "—";
  rows.push(row("Total", totalLabel, "total-row"));
  return rows.join("");
}
