import Link from "next/link";
import { AnalyticsRangePicker } from "@/components/analytics/AnalyticsRangePicker";
import {
  formatPercent,
  formatShortDate,
  formatUsdFromCents,
} from "@/components/analytics/format";
import { OrdersTrendChart } from "@/components/analytics/OrdersTrendChart";
import type { AnalyticsSnapshot } from "@/lib/analytics/types";
type Props = {
  snapshot: AnalyticsSnapshot;
};

export function AnalyticsDashboard({ snapshot }: Props) {
  const { summary, menuScans } = snapshot;
  const hasData =
    summary.voiceOrders > 0 ||
    summary.ordersCompleted > 0 ||
    summary.ordersFinalized > 0 ||
    summary.ordersCanceled > 0 ||
    menuScans.attempts > 0;

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
            Analytics
          </p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Orders & operations
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm text-muted">
            {snapshot.organizationName} · {formatShortDate(snapshot.since.slice(0, 10))}
            –{formatShortDate(snapshot.until.slice(0, 10))} ·{" "}
            {snapshot.restaurantCount} location
            {snapshot.restaurantCount === 1 ? "" : "s"}
          </p>
        </div>
        <AnalyticsRangePicker active={snapshot.rangeKey} />
      </header>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-line bg-elev px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">No activity in this range</p>
          <p className="mt-2 text-sm text-muted">
            Voice orders, menu scans, and kitchen completions will appear here as
            you use ROAL.
          </p>
          <Link href="/dashboard/restaurants" className="btn-primary mt-5 inline-flex">
            Open restaurants
          </Link>
        </div>
      ) : (
        <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Voice orders" value={summary.voiceOrders.toLocaleString()} />
        <StatCard
          label="Draft → completed"
          value={formatPercent(summary.conversionPercent)}
          hint={`${summary.ordersCompleted} completed / ${summary.voiceOrders} placed`}
        />
        <StatCard
          label="Est. revenue"
          value={formatUsdFromCents(
            summary.revenueCents,
            summary.revenueComplete
          )}
          hint={
            summary.revenueOrderCount > 0
              ? `${summary.revenueOrderCount} completed orders · menu-priced`
              : "From completed kitchen orders"
          }
        />
        <StatCard
          label="Avg prep time"
          value={
            summary.avgPrepMinutes != null
              ? `${summary.avgPrepMinutes} min`
              : "—"
          }
          hint={
            summary.prepSampleSize > 0
              ? `${summary.prepSampleSize} completed orders`
              : "Created → completed"
          }
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders finalized"
          value={summary.ordersFinalized.toLocaleString()}
          hint="Phone receipts (finalize_order)"
        />
        <StatCard
          label="Canceled"
          value={summary.ordersCanceled.toLocaleString()}
          hint="Kitchen cancellations"
        />
        <StatCard
          label="Menu scan success"
          value={formatPercent(menuScans.successPercent)}
          hint={
            menuScans.attempts > 0
              ? `${menuScans.extracted + menuScans.committed} ok · ${menuScans.failed} failed`
              : "Imports + usage events"
          }
        />
        <StatCard
          label="Scans attempted"
          value={menuScans.attempts.toLocaleString()}
          hint={`${menuScans.committed} committed to menu`}
        />
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Calls & orders over time</h2>
        <p className="mt-1 text-xs text-muted">
          Daily voice placements (usage), kitchen completions, and cancellations.
        </p>
        <div className="mt-5">
          <OrdersTrendChart points={snapshot.ordersOverTime} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Popular items</h2>
          <p className="mt-1 text-xs text-muted">
            From completed orders and finalized receipts in this period.
          </p>
          {snapshot.popularItems.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No line items yet.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {snapshot.popularItems.map((row, idx) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-elev px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-xs text-subtle">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium text-ink">
                      {row.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted">
                    {row.quantity} sold
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Menu scan health</h2>
          <p className="mt-1 text-xs text-muted">
            Extraction outcomes from imports and metered scan events.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Extracted" value={menuScans.extracted} />
            <Row label="Committed to menu" value={menuScans.committed} />
            <Row label="Failed" value={menuScans.failed} />
            <Row
              label="Success rate"
              value={formatPercent(menuScans.successPercent)}
            />
          </dl>
        </section>
      </div>

      {snapshot.byRestaurant.length > 1 ? (
        <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">By location</h2>
          <p className="mt-1 text-xs text-muted">
            Conversion uses completed voice orders vs placements per restaurant.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-subtle">
                <tr className="border-b border-line">
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Voice</th>
                  <th className="px-2 py-2 font-medium">Finalized</th>
                  <th className="px-2 py-2 font-medium">Completed</th>
                  <th className="px-2 py-2 font-medium">Canceled</th>
                  <th className="px-2 py-2 font-medium">Conversion</th>
                  <th className="px-2 py-2 font-medium">Revenue est.</th>
                  <th className="px-2 py-2 font-medium">Avg prep</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.byRestaurant.map((row) => (
                  <tr key={row.restaurantId} className="border-b border-line/60">
                    <td className="px-2 py-2.5 font-medium text-ink">
                      <Link
                        href={`/dashboard/restaurants/${row.restaurantId}`}
                        className="hover:text-accent"
                      >
                        {row.restaurantName}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-muted">{row.voiceOrders}</td>
                    <td className="px-2 py-2.5 text-muted">{row.finalized}</td>
                    <td className="px-2 py-2.5 text-muted">{row.completed}</td>
                    <td className="px-2 py-2.5 text-muted">{row.canceled}</td>
                    <td className="px-2 py-2.5 text-muted">
                      {formatPercent(row.conversionPercent)}
                    </td>
                    <td className="px-2 py-2.5 text-muted">
                      {formatUsdFromCents(
                        row.revenueCents,
                        row.revenueComplete
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-muted">
                      {row.avgPrepMinutes != null
                        ? `${row.avgPrepMinutes} min`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="text-xs text-subtle">
        Revenue estimates use menu prices, tax, and service fee from each
        location&apos;s profile. Unmatched items are excluded; totals may be
        incomplete when line items lack prices.
      </p>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
