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

function formatTrendDelta(delta: number | null): string {
  if (delta == null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} pts`;
}

export function AnalyticsDashboard({ snapshot, ordersHref }: Props) {
  const {
    summary,
    menuScans,
    conversionTrend,
    peakHours,
    peakCallHours,
    peakCallWindows,
  } = snapshot;
  const { callOutcomes } = summary;
  const isRestaurantScope = snapshot.scope === "restaurant";
  const hasData =
    summary.orderSessions > 0 ||
    summary.sessionsWithCompletedOrder > 0 ||
    summary.ordersFinalized > 0 ||
    summary.completedKitchenOrders > 0 ||
    summary.ordersCanceled > 0 ||
    callOutcomes.total > 0 ||
    callOutcomes.voicemailOrCallback > 0 ||
    callOutcomes.handoff > 0 ||
    summary.reservationRequests > 0 ||
    summary.upsellAttach.configuredRules > 0 ||
    menuScans.attempts > 0;

  const emptyHref =
    ordersHref ??
    (snapshot.restaurantId
      ? `/dashboard/restaurants/${snapshot.restaurantId}`
      : "/dashboard/restaurants");
  const emptyCta = isRestaurantScope ? "Open live orders" : "Open restaurants";

  const peakLabel =
    peakHours.length > 0
      ? peakHours.map((h) => `${h.label} UTC (${h.orderCount})`).join(" · ")
      : "—";
  const peakCallLabel =
    peakCallHours.length > 0
      ? peakCallHours.map((h) => `${h.label} UTC (${h.orderCount})`).join(" · ")
      : "—";

  return (
    <div className="analytics-dashboard min-w-0 max-w-full space-y-8 overflow-x-hidden sm:space-y-10">
      <header className="analytics-dashboard__header flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="type-eyebrow text-accent">Analytics</p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {isRestaurantScope ? "Phone order sessions" : "Orders & operations"}
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
          <p className="mt-1 max-w-2xl text-pretty text-xs text-subtle">
            Order counts use unique session IDs from drafts, receipts, and usage
            events. Call counts use ElevenLabs post-call webhook events when
            configured.
          </p>
        </div>
        <AnalyticsRangePicker active={snapshot.rangeKey} />
      </header>

      {!hasData ? (
        <div className="analytics-dashboard__empty rounded-xl border border-dashed border-line bg-elev px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">No activity in this range</p>
          <p className="mt-2 text-sm text-muted">
            {isRestaurantScope
              ? "Order sessions and outcomes for this location appear once phone orders are recorded."
              : "Order sessions and kitchen outcomes appear as your locations use ROAL."}
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
        <StatCard
          label="Order sessions"
          value={summary.orderSessions.toLocaleString()}
          hint="Unique session IDs with draft, receipt, or usage activity"
        />
        <StatCard
          label="Session → completed"
          value={formatPercent(summary.sessionConversionPercent)}
          hint={`${summary.sessionsWithCompletedOrder} sessions with a saved phone receipt`}
        />
        <StatCard
          label="Avg order estimate"
          value={formatUsdFromCents(
            summary.averageOrderCents,
            summary.averageOrderComplete
          )}
          hint={
            summary.averageOrderSampleSize > 0
              ? `${summary.averageOrderSampleSize} finalized receipts · menu + tax/fee`
              : "From finalized phone receipts with menu prices"
          }
        />
        <StatCard
          label="Stuck orders"
          value={summary.stuckOrderCount.toLocaleString()}
          hint={`Kitchen queue idle ${20}+ minutes (current snapshot)`}
        />
      </section>

      <section className="analytics-dashboard__stats analytics-dashboard__stats--secondary grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Calls recorded"
          value={callOutcomes.total.toLocaleString()}
          hint="ElevenLabs post-call webhook sessions"
        />
        <StatCard
          label="Order calls"
          value={callOutcomes.completed.toLocaleString()}
          hint="Calls with a saved phone receipt (not transcript-only)"
        />
        <StatCard
          label="Conversion trend"
          value={formatTrendDelta(conversionTrend.deltaPoints)}
          hint={
            conversionTrend.recentSessions > 0 ||
            conversionTrend.priorSessions > 0
              ? `Recent ${formatPercent(conversionTrend.recentPercent)} vs earlier ${formatPercent(conversionTrend.priorPercent)} · ${conversionTrend.label.toLowerCase()}`
              : conversionTrend.label
          }
        />
        <StatCard
          label="Peak call hours"
          value={peakCallHours[0] ? peakCallHours[0].label : "—"}
          hint={
            peakCallHours.length > 0
              ? `UTC from post-call webhooks · ${peakCallLabel}`
              : peakHours.length > 0
                ? `No call webhooks yet. Receipt peak: ${peakLabel}`
                : "No call events in range"
          }
        />
      </section>

      <section className="analytics-dashboard__stats analytics-dashboard__stats--upsell grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upsell attach rate"
          value={formatPercent(summary.upsellAttach.attachPercent)}
          hint={
            summary.upsellAttach.configuredRules > 0
              ? `${summary.upsellAttach.attachedOrders} accepted · ${summary.upsellAttach.skippedOrders} skipped · ${summary.upsellAttach.eligibleOrders} suggested`
              : "Configure add-on rules in Restaurant profile"
          }
        />
        <StatCard
          label="Upsell revenue"
          value={formatUsdFromCents(
            summary.upsellAttach.attributedRevenueCents,
            summary.upsellAttach.revenueComplete
          )}
          hint="Estimated subtotal from attached offer items"
        />
        <StatCard
          label="Controlled upsell lift"
          value={formatUsdFromCents(
            summary.upsellAttach.experimentTicketLiftCents,
            summary.upsellAttach.experimentLiftComplete
          )}
          hint={
            summary.upsellAttach.experimentTicketLiftPercent != null
              ? `${formatPercent(summary.upsellAttach.experimentTicketLiftPercent)} treatment vs control`
              : "Needs treatment and control eligible orders"
          }
        />
        <StatCard
          label="Experiment split"
          value={`${summary.upsellAttach.experimentTreatmentOrders}/${summary.upsellAttach.experimentControlOrders}`}
          hint={`${summary.upsellAttach.configuredRules} active rules · treatment/control eligible orders`}
        />
      </section>

      <section className="analytics-dashboard__stats analytics-dashboard__stats--tertiary grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders finalized"
          value={summary.ordersFinalized.toLocaleString()}
          hint="Phone receipts saved (finalize_order)"
        />
        <StatCard
          label="Kitchen completed"
          value={summary.completedKitchenOrders.toLocaleString()}
          hint="Draft orders marked completed in KDS"
        />
        <StatCard
          label="Est. revenue (total)"
          value={formatUsdFromCents(
            summary.revenueCents,
            summary.revenueComplete
          )}
          hint={
            summary.revenueOrderCount > 0
              ? `${summary.revenueOrderCount} finalized phone receipts`
              : "From saved phone receipts with menu prices"
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

      <section className="analytics-dashboard__stats analytics-dashboard__stats--followups grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Voicemail / callback"
          value={callOutcomes.voicemailOrCallback.toLocaleString()}
          hint="Post-call webhook metadata · guest follow-up needed"
        />
        <StatCard
          label="Staff handoffs"
          value={callOutcomes.handoff.toLocaleString()}
          hint="Calls routed to staff from webhook metadata"
        />
        <StatCard
          label="Reservations"
          value={summary.reservationRequests.toLocaleString()}
          hint="Reservation requests captured by the voice agent"
        />
        <StatCard
          label="Active calls"
          value={callOutcomes.active.toLocaleString()}
          hint="Calls still in progress when last synced"
        />
      </section>

      <section className="analytics-dashboard__stats analytics-dashboard__stats--outcomes grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="FAQ / no order"
          value={callOutcomes.noOrder.toLocaleString()}
          hint="Calls that ended without an order"
        />
        <StatCard
          label="Abandoned calls"
          value={callOutcomes.abandoned.toLocaleString()}
          hint="Failed initiation or abandoned conversation"
        />
        <StatCard
          label="Canceled"
          value={(summary.ordersCanceled + callOutcomes.canceled).toLocaleString()}
          hint="Kitchen cancellations plus call-level cancels"
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
      </section>

      {callOutcomes.total > 0 ? (
        <section className="analytics-dashboard__top-questions min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">
              Top questions callers ask
            </h2>
            <p className="mt-1 text-xs text-muted">
              Topics from FAQ / no-order calls in this period, based on call
              transcript summaries.
            </p>
          </div>
          {snapshot.topCallerQuestions.faqNoOrderCallCount === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No FAQ / no-order calls in this range yet.
            </p>
          ) : snapshot.topCallerQuestions.topics.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              FAQ / no-order calls were recorded, but no question topics could
              be classified yet.
            </p>
          ) : (
            <ol className="analytics-dashboard__top-questions-list mt-4 space-y-2">
              {snapshot.topCallerQuestions.topics.map((row, idx) => (
                <li
                  key={row.topicId}
                  className="analytics-dashboard__top-questions-row rounded-lg border border-line bg-elev px-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                        <span className="w-5 shrink-0 text-xs text-subtle">
                          {idx + 1}
                        </span>
                        <span className="[overflow-wrap:anywhere]">{row.label}</span>
                      </p>
                      {row.exampleSnippets.length > 0 ? (
                        <ul className="mt-2 space-y-1 pl-7 text-xs text-muted">
                          {row.exampleSnippets.map((snippet) => (
                            <li
                              key={snippet}
                              className="[overflow-wrap:anywhere] before:mr-1 before:text-subtle before:content-['“'] after:text-subtle after:content-['”']"
                            >
                              {snippet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="shrink-0 pl-7 text-sm text-muted sm:pl-0 sm:text-right">
                      <span className="font-medium text-ink">{row.count}</span>
                      <span className="ml-1 text-subtle">
                        ({formatPercent(row.percentOfFaqCalls)})
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {peakCallWindows.length > 0 ? (
        <section className="analytics-dashboard__rush-windows min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">Busiest call windows</h2>
              <p className="mt-1 text-xs text-muted">
                Day and hour buckets from ElevenLabs post-call webhooks, shown in UTC.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {peakCallWindows.map((row) => (
              <div
                key={`${row.dayOfWeekUtc}-${row.hourUtc}`}
                className="rounded-lg border border-line bg-elev px-3 py-2.5"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                  {row.dayLabel} · {row.hourLabel} UTC
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {row.callCount} call{row.callCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {row.completedCount} order call
                  {row.completedCount === 1 ? "" : "s"} ·{" "}
                  {formatPercent(row.conversionPercent)} conversion
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="analytics-dashboard__chart min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Sessions over time</h2>
        <p className="mt-1 text-xs text-muted">
          Daily unique order sessions, finalized phone receipts, and
          cancellations.
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
            Session conversion = completed sessions ÷ order sessions per
            location.
          </p>
          <div className="analytics-dashboard__location-table dashboard-table mt-4 min-w-0">
            <table className="w-full min-w-0 text-left text-sm xl:min-w-[900px]">
              <thead className="text-xs uppercase tracking-wider text-subtle">
                <tr className="border-b border-line">
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Sessions</th>
                  <th className="px-2 py-2 font-medium">Calls</th>
                  <th className="px-2 py-2 font-medium">Call orders</th>
                  <th className="px-2 py-2 font-medium">FAQ / no order</th>
                  <th className="px-2 py-2 font-medium">Completed</th>
                  <th className="px-2 py-2 font-medium">Finalized</th>
                  <th className="px-2 py-2 font-medium">Kitchen done</th>
                  <th className="px-2 py-2 font-medium">Stuck</th>
                  <th className="px-2 py-2 font-medium">Conversion</th>
                  <th className="px-2 py-2 font-medium">Upsell</th>
                  <th className="px-2 py-2 font-medium">Upsell rev.</th>
                  <th className="px-2 py-2 font-medium">Revenue est.</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.byRestaurant.map((row) => (
                  <tr key={row.restaurantId} className="border-b border-line/60">
                    <td data-label="Location" className="px-2 py-2.5 font-medium text-ink lg:px-2">
                      <Link
                        href={`/dashboard/restaurants/${row.restaurantId}/analytics`}
                        className="hover:text-accent"
                      >
                        {row.restaurantName}
                      </Link>
                    </td>
                    <td data-label="Sessions" className="px-2 py-2.5 text-muted">
                      {row.orderSessions}
                    </td>
                    <td data-label="Calls" className="px-2 py-2.5 text-muted">
                      {row.callCount}
                    </td>
                    <td data-label="Call orders" className="px-2 py-2.5 text-muted">
                      {row.callOrderCount}
                      <span className="ml-1 text-subtle">
                        ({formatPercent(row.callConversionPercent)})
                      </span>
                    </td>
                    <td data-label="FAQ / no order" className="px-2 py-2.5 text-muted">
                      {row.faqNoOrderCallCount}
                      <span className="ml-1 text-subtle">
                        ({formatPercent(row.faqNoOrderPercent)})
                      </span>
                    </td>
                    <td data-label="Completed" className="px-2 py-2.5 text-muted">
                      {row.sessionsCompleted}
                    </td>
                    <td data-label="Finalized" className="px-2 py-2.5 text-muted">
                      {row.finalized}
                    </td>
                    <td data-label="Kitchen done" className="px-2 py-2.5 text-muted">
                      {row.completedKitchen}
                    </td>
                    <td data-label="Stuck" className="px-2 py-2.5 text-muted">
                      {row.stuckOrders}
                    </td>
                    <td data-label="Conversion" className="px-2 py-2.5 text-muted">
                      {formatPercent(row.conversionPercent)}
                    </td>
                    <td data-label="Upsell" className="px-2 py-2.5 text-muted">
                      {formatPercent(row.upsellAttachPercent)}
                      <span className="ml-1 text-subtle">
                        ({row.upsellAttachedOrders}/{row.upsellEligibleOrders})
                      </span>
                    </td>
                    <td data-label="Upsell rev." className="px-2 py-2.5 text-muted">
                      {formatUsdFromCents(
                        row.upsellAttributedRevenueCents,
                        row.upsellRevenueComplete
                      )}
                    </td>
                    <td data-label="Revenue est." className="px-2 py-2.5 text-muted">
                      {formatUsdFromCents(
                        row.revenueCents,
                        row.revenueComplete
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="analytics-dashboard__footnote text-xs text-subtle [overflow-wrap:anywhere]">
        Order sessions are deduplicated by session ID across drafts, receipts,
        and usage events. Call outcomes come from ElevenLabs post-call webhook
        events when configured. Upsell attach rate compares configured trigger
        and offer text to completed order line items; upsell revenue estimates
        the matched offer line subtotal. Controlled upsell lift uses the
        deterministic treatment/control call split from conversation-init;
        control calls suppress proactive configured upsells. Revenue and average order use menu prices,
        tax, and service fee from each location&apos;s profile; unmatched items are
        excluded.
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
