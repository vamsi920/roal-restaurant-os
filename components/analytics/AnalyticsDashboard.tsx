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
  ordersHref?: string;
};

export function AnalyticsDashboard({ snapshot, ordersHref }: Props) {
  const { summary, menuScans } = snapshot;
  const isRestaurantScope = snapshot.scope === "restaurant";
  const hasData =
    summary.voiceOrders > 0 ||
    summary.ordersCompleted > 0 ||
    summary.ordersFinalized > 0 ||
    summary.ordersCanceled > 0 ||
    menuScans.attempts > 0;

  const emptyHref =
    ordersHref ??
    (snapshot.restaurantId
      ? `/dashboard/restaurants/${snapshot.restaurantId}`
      : "/dashboard/restaurants");
  const emptyCta = isRestaurantScope ? "Open live orders" : "Open restaurants";

  return (
    <div className="analytics-dashboard min-w-0 max-w-full space-y-8 overflow-x-hidden sm:space-y-10">
      <header className="analytics-dashboard__header flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="type-eyebrow text-accent">
            Analytics
          </p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {isRestaurantScope ? "Calls & orders" : "Orders & operations"}
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm text-muted">
            {isRestaurantScope && snapshot.restaurantName
              ? `${snapshot.restaurantName} · `
              : `${snapshot.organizationName} · `}
            {formatShortDate(snapshot.since.slice(0, 10))}
            –{formatShortDate(snapshot.until.slice(0, 10))}
            {!isRestaurantScope ? (
              <>
                {" "}
                · {snapshot.restaurantCount} location
                {snapshot.restaurantCount === 1 ? "" : "s"}
              </>
            ) : null}
          </p>
        </div>
        <AnalyticsRangePicker active={snapshot.rangeKey} />
      </header>

      {!hasData ? (
        <div className="analytics-dashboard__empty rounded-xl border border-dashed border-line bg-elev px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">No activity in this range</p>
          <p className="mt-2 text-sm text-muted">
            {isRestaurantScope
              ? "Phone orders and call outcomes for this location will show up here once recorded."
              : "Voice orders and kitchen outcomes will appear here as your locations use ROAL."}
          </p>
          <Link
            href={emptyHref}
            className="btn-primary kds-thumb-btn mt-5 inline-flex min-h-11 w-full justify-center sm:w-auto"
          >
            {emptyCta}
          </Link>
        </div>
      ) : (
        <>
      <section className="analytics-dashboard__stats grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="analytics-dashboard__stats analytics-dashboard__stats--secondary grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="analytics-dashboard__chart min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Calls & orders over time</h2>
        <p className="mt-1 text-xs text-muted">
          Daily voice placements (usage), kitchen completions, and cancellations.
        </p>
        <div className="analytics-dashboard__chart-scroll mt-5 min-w-0 max-w-full">
          <OrdersTrendChart points={snapshot.ordersOverTime} />
        </div>
      </section>

      <div className="analytics-dashboard__grid grid min-w-0 gap-4 lg:grid-cols-2">
        <section className="analytics-dashboard__popular min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Popular items</h2>
          <p className="mt-1 text-xs text-muted">
            From completed orders and finalized receipts in this period.
          </p>
          {snapshot.popularItems.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No line items yet.</p>
          ) : (
            <ol className="analytics-dashboard__popular-list mt-4 space-y-2">
              {snapshot.popularItems.map((row, idx) => (
                <li
                  key={row.name}
                  className="analytics-dashboard__popular-row flex flex-col gap-1 rounded-lg border border-line bg-elev px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-xs text-subtle">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-ink [overflow-wrap:anywhere]">
                      {row.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted sm:text-right">
                    {row.quantity} sold
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="analytics-dashboard__menu-scans min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Menu scan health</h2>
          <p className="mt-1 text-xs text-muted">
            Extraction outcomes from imports and metered scan events.
          </p>
          <dl className="analytics-dashboard__menu-scans-list mt-4 space-y-3 text-sm">
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

      {snapshot.scope === "organization" && snapshot.byRestaurant.length > 1 ? (
        <section className="analytics-dashboard__by-location min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-ink">By location</h2>
          <p className="mt-1 text-xs text-muted">
            Conversion uses completed voice orders vs placements per restaurant.
          </p>
          <div className="analytics-dashboard__location-table dashboard-table mt-4 min-w-0">
            <table className="w-full min-w-0 text-left text-sm xl:min-w-[640px]">
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
                    <td data-label="Location" className="px-2 py-2.5 font-medium text-ink lg:px-2">
                      <Link
                        href={`/dashboard/restaurants/${row.restaurantId}`}
                        className="hover:text-accent"
                      >
                        {row.restaurantName}
                      </Link>
                    </td>
                    <td data-label="Voice" className="px-2 py-2.5 text-muted">
                      {row.voiceOrders}
                    </td>
                    <td data-label="Finalized" className="px-2 py-2.5 text-muted">
                      {row.finalized}
                    </td>
                    <td data-label="Completed" className="px-2 py-2.5 text-muted">
                      {row.completed}
                    </td>
                    <td data-label="Canceled" className="px-2 py-2.5 text-muted">
                      {row.canceled}
                    </td>
                    <td data-label="Conversion" className="px-2 py-2.5 text-muted">
                      {formatPercent(row.conversionPercent)}
                    </td>
                    <td data-label="Revenue est." className="px-2 py-2.5 text-muted">
                      {formatUsdFromCents(
                        row.revenueCents,
                        row.revenueComplete
                      )}
                    </td>
                    <td data-label="Avg prep" className="px-2 py-2.5 text-muted">
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

      <p className="analytics-dashboard__footnote text-xs text-subtle [overflow-wrap:anywhere]">
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
    <div className="analytics-dashboard__stat min-w-0 rounded-xl border border-line bg-card px-4 py-3 shadow-sm">
      <p className="text-caption uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">{hint}</p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="analytics-dashboard__menu-scan-row flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink sm:text-right">{value}</dd>
    </div>
  );
}
