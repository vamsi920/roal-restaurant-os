import Link from "next/link";
import { AnalyticsRangePicker } from "@/components/analytics/AnalyticsRangePicker";
import {
  formatPercent,
  formatShortDate,
  formatUsdFromCents,
} from "@/components/analytics/format";
import { OrdersTrendChart } from "@/components/analytics/OrdersTrendChart";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Clock,
  DollarSign,
  PhoneCall,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/page-primitives";
import { EmptyState, StatCard } from "@/components/ui";
import { dayKeyInZone } from "@/lib/analytics/range";
import type { AnalyticsSnapshot } from "@/lib/analytics/types";

type Props = {
  snapshot: AnalyticsSnapshot;
  ordersHref?: string;
};

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

export function AnalyticsDashboard({ snapshot, ordersHref }: Props) {
  const { summary, peakHours, peakCallHours, peakCallWindows, topCallerQuestions } =
    snapshot;
  const { callOutcomes, upsellAttach } = summary;
  const isRestaurantScope = snapshot.scope === "restaurant";
  const ordersTaken = summary.ordersTaken;
  const questionCalls = topCallerQuestions.faqNoOrderCallCount;
  const hasData =
    ordersTaken > 0 ||
    summary.orderSessions > 0 ||
    summary.completedKitchenOrders > 0 ||
    summary.ordersCanceled > 0 ||
    callOutcomes.total > 0 ||
    callOutcomes.voicemailOrCallback > 0 ||
    callOutcomes.handoff > 0 ||
    summary.reservationRequests > 0;

  const emptyHref =
    ordersHref ??
    (snapshot.restaurantId
      ? `/dashboard/restaurants/${snapshot.restaurantId}`
      : "/dashboard/restaurants");
  const emptyCta = isRestaurantScope ? "Open kitchen" : "Open restaurants";
  const settingsHref = snapshot.restaurantId
    ? `/dashboard/restaurants/${snapshot.restaurantId}/settings`
    : "/dashboard/restaurants";

  const timeZone = snapshot.timeZone;
  const rangeLabel = `${formatShortDate(dayKeyInZone(snapshot.since, timeZone))}–${formatShortDate(
    dayKeyInZone(snapshot.until, timeZone)
  )}`;

  const busiestCallHour = peakCallHours[0] ?? null;
  const busiestWindow = peakCallWindows[0] ?? null;
  const busiestOrderHour = peakHours[0] ?? null;
  const busiestValue = busiestCallHour?.label ?? busiestOrderHour?.label ?? "—";
  const busiestHint = busiestCallHour
    ? busiestWindow && busiestWindow.hour === busiestCallHour.hour
      ? `Most calls on ${busiestWindow.dayLabel} around ${busiestCallHour.label}`
      : `${plural(busiestCallHour.orderCount, "call")} in that hour`
    : busiestOrderHour
      ? `${plural(busiestOrderHour.orderCount, "order")} in that hour`
      : "Shows up once calls come in";

  const upsellOn = upsellAttach.configuredRules > 0;
  const canceledTotal = summary.ordersCanceled + callOutcomes.canceled;

  return (
    <div className="analytics-dashboard org-page org-page--wide min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        className="analytics-dashboard__header"
        eyebrow={
          isRestaurantScope && snapshot.restaurantName
            ? snapshot.restaurantName
            : snapshot.organizationName
        }
        title="Reports"
        lead={
          <>
            {rangeLabel}
            {!isRestaurantScope ? (
              <>
                {" "}
                · {snapshot.restaurantCount} location{snapshot.restaurantCount === 1 ? "" : "s"}
              </>
            ) : null}
          </>
        }
        actions={<AnalyticsRangePicker active={snapshot.rangeKey} />}
      />

      {!hasData ? (
        <div className="analytics-dashboard__empty panel" role="status">
          <EmptyState
            icon={BarChart3}
            className="py-12"
            title="No activity in this range"
            body={
              isRestaurantScope
                ? "Calls and orders for this location show up here once your phone host starts answering."
                : "Calls and orders show up here once your locations start taking phone calls."
            }
            action={
              <Link href={emptyHref} className="btn-primary">
                {emptyCta}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <section
            className="analytics-dashboard__stats grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5"
            aria-label="Summary"
          >
            <StatCard
              label="Calls answered"
              value={callOutcomes.total.toLocaleString()}
              hint="Calls your phone host picked up"
              icon={PhoneCall}
              color="blue"
            />
            <StatCard
              label="Orders taken"
              value={ordersTaken.toLocaleString()}
              hint="Phone orders sent to your kitchen"
              icon={ShoppingBag}
              color="orange"
            />
            <StatCard
              label="Sales from phone orders"
              value={
                <span className="text-money">
                  {formatUsdFromCents(summary.revenueCents, summary.revenueComplete)}
                </span>
              }
              hint={
                summary.revenueComplete
                  ? "Order totals with tax and fees"
                  : "Some items had no menu price, so the real total is higher"
              }
              icon={DollarSign}
              color="green"
            />
            <StatCard
              label="Average order"
              value={
                <span className="text-money">
                  {formatUsdFromCents(summary.averageOrderCents, summary.averageOrderComplete)}
                </span>
              }
              hint={
                summary.averageOrderSampleSize > 0
                  ? `Across ${plural(summary.averageOrderSampleSize, "order")}`
                  : "Shows up after your first order"
              }
              icon={Receipt}
              color="amber"
            />
            <StatCard
              label="Busiest time"
              value={busiestValue}
              hint={busiestHint}
              icon={Clock}
              color="blue"
            />
            {summary.stuckOrderCount > 0 ? (
              <StatCard
                label="Orders waiting too long"
                value={
                  <span className="text-warning">
                    {summary.stuckOrderCount.toLocaleString()}
                  </span>
                }
                hint="Sitting in the kitchen 20+ minutes right now"
                icon={AlertTriangle}
                color="rose"
                href={isRestaurantScope ? emptyHref : undefined}
              />
            ) : null}
          </section>

          <section
            className="analytics-dashboard__stats analytics-dashboard__stats--followups grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
            aria-label="Other calls"
          >
            <StatTile
              label="Questions only"
              value={questionCalls.toLocaleString()}
              hint="Calls that ended without an order"
            />
            <StatTile
              label="Call backs needed"
              value={callOutcomes.voicemailOrCallback.toLocaleString()}
              hint="Left a message or asked for a call back"
            />
            <StatTile
              label="Reservations"
              value={summary.reservationRequests.toLocaleString()}
              hint="Table requests your host took"
            />
            <StatTile
              label="Sent to staff"
              value={callOutcomes.handoff.toLocaleString()}
              hint="Calls passed to your team"
            />
          </section>

          <Panel
            className="analytics-dashboard__chart"
            title="Calls and orders by day"
          >
            <div className="analytics-dashboard__chart-scroll min-w-0 max-w-full">
              <OrdersTrendChart points={snapshot.ordersOverTime} />
            </div>
          </Panel>

          {callOutcomes.total > 0 ? (
            <Panel
              className="analytics-dashboard__top-questions"
              title="Top questions callers ask"
              hint="From calls that ended without an order."
            >
              {questionCalls === 0 ? (
                <p className="py-4 text-center text-[13px] text-subtle">
                  Every call in this period was an order. No question-only calls yet.
                </p>
              ) : topCallerQuestions.topics.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-subtle">
                  Callers asked questions, but none fit a common topic yet.
                </p>
              ) : (
                <ol className="analytics-dashboard__top-questions-list -my-1 divide-y divide-line/70">
                  {topCallerQuestions.topics.map((row, idx) => (
                    <li key={row.topicId} className="analytics-dashboard__top-questions-row py-2.5">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex min-w-0 items-center gap-2.5 text-[13px] font-medium text-ink">
                            <span className="w-4 shrink-0 text-[11px] tabular-nums text-subtle">{idx + 1}</span>
                            <span className="[overflow-wrap:anywhere]">{row.label}</span>
                          </p>
                          {row.exampleSnippets.length > 0 ? (
                            <ul className="mt-1 space-y-0.5 pl-[26px] text-[12px] text-muted">
                              {row.exampleSnippets.map((snippet) => (
                                <li key={snippet} className="[overflow-wrap:anywhere]">
                                  &ldquo;{snippet}&rdquo;
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-[13px] tabular-nums text-muted">
                          <span className="font-medium text-ink">{plural(row.count, "call")}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          ) : null}

          <div className="analytics-dashboard__grid grid min-w-0 gap-3 lg:grid-cols-2">
            <Panel
              className="analytics-dashboard__popular"
              title="Most ordered items"
              hint="From phone orders in this period."
            >
              {snapshot.popularItems.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-subtle">No orders yet.</p>
              ) : (
                <ol className="analytics-dashboard__popular-list -my-1 divide-y divide-line/70">
                  {snapshot.popularItems.map((row, idx) => (
                    <li
                      key={row.name}
                      className="analytics-dashboard__popular-row flex items-center justify-between gap-3 py-2 text-[13px]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-elev text-[11px] font-semibold tabular-nums text-subtle ring-1 ring-inset ring-line">
                          {idx + 1}
                        </span>
                        <span className="truncate font-medium text-ink">{row.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">{row.quantity} sold</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            {peakCallWindows.length > 0 ? (
              <Panel
                className="analytics-dashboard__rush-windows min-w-0"
                title="Busiest call times"
                hint="When calls come in, by day and hour."
              >
                <div className="grid grid-cols-2 gap-2">
                  {peakCallWindows.map((row) => (
                    <div
                      key={`${row.dayOfWeek}-${row.hour}`}
                      className="min-w-0 rounded-[12px] border border-line bg-elev px-3.5 py-3"
                    >
                      <p className="org-kicker">
                        {row.dayLabel} · {row.hourLabel}
                      </p>
                      <p className="mt-1 font-display text-[18px] font-bold tabular-nums tracking-[-0.01em] text-ink">
                        {plural(row.callCount, "call")}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            <Panel
              className="analytics-dashboard__upsells min-w-0"
              title="Add-on offers"
              hint={
                upsellOn
                  ? "When your host suggests an add-on, like a drink or dessert."
                  : undefined
              }
            >
              {upsellOn ? (
                <dl className="analytics-dashboard__upsell-list org-kv">
                  <Row
                    label="Orders that took an add-on"
                    value={`${upsellAttach.attachedOrders} of ${upsellAttach.eligibleOrders} (${formatPercent(upsellAttach.attachPercent)})`}
                  />
                  <Row
                    label="Extra sales from add-ons"
                    value={formatUsdFromCents(
                      upsellAttach.attributedRevenueCents,
                      upsellAttach.revenueComplete
                    )}
                  />
                </dl>
              ) : (
                <p className="text-[13px] text-muted">
                  Your host can suggest add-ons, like a drink with every pizza.{" "}
                  <Link href={settingsHref} className="org-link font-medium hover:underline">
                    Set them up in Settings
                  </Link>
                </p>
              )}
            </Panel>
          </div>

          <details className="analytics-dashboard__more panel group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] px-[1.125rem] text-[14px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:min-h-12 [&::-webkit-details-marker]:hidden">
              Kitchen details
              <ChevronDown
                size={16}
                strokeWidth={2}
                className="text-subtle transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>
            <div className="border-t border-line p-4">
              <section
                className="analytics-dashboard__stats analytics-dashboard__stats--tertiary grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
                aria-label="Kitchen"
              >
                <StatTile
                  label="Orders marked done"
                  value={summary.completedKitchenOrders.toLocaleString()}
                  hint="Finished on the kitchen screen"
                />
                <StatTile
                  label="Average prep time"
                  value={summary.avgPrepMinutes != null ? `${summary.avgPrepMinutes} min` : "—"}
                  hint={
                    summary.prepSampleSize > 0
                      ? `Across ${plural(summary.prepSampleSize, "order")}`
                      : "From order in to marked done"
                  }
                />
                <StatTile
                  label="Canceled orders"
                  value={canceledTotal.toLocaleString()}
                  hint="Canceled by the caller or your team"
                />
                <StatTile
                  label="Hung up early"
                  value={callOutcomes.abandoned.toLocaleString()}
                  hint="Caller left before finishing"
                />
              </section>
            </div>
          </details>

          {snapshot.scope === "organization" && snapshot.byRestaurant.length > 1 ? (
            <Panel
              className="analytics-dashboard__by-location"
              flush
              title="By location"
            >
              <div className="analytics-dashboard__location-table org-table min-w-0">
                <table>
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th className="is-num">Calls</th>
                      <th className="is-num">Orders</th>
                      <th className="is-num">Questions only</th>
                      <th className="is-num">Waiting too long</th>
                      <th className="is-num">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.byRestaurant.map((row) => (
                      <tr key={row.restaurantId}>
                        <td data-label="Location" className="font-medium text-ink">
                          <Link
                            href={`/dashboard/restaurants/${row.restaurantId}/analytics`}
                            className="org-link hover:underline"
                          >
                            {row.restaurantName}
                          </Link>
                        </td>
                        <td data-label="Calls" className="is-num">{row.callCount}</td>
                        <td data-label="Orders" className="is-num">{row.sessionsCompleted}</td>
                        <td data-label="Questions only" className="is-num">{row.faqNoOrderCallCount}</td>
                        <td data-label="Waiting too long" className="is-num">{row.stuckOrders}</td>
                        <td data-label="Sales" className="is-num">
                          {formatUsdFromCents(row.revenueCents, row.revenueComplete)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="analytics-dashboard__upsell-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
