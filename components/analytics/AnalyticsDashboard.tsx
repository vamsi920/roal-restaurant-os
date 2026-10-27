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
  PhoneIncoming,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/page-primitives";
import { EmptyState, StatCard } from "@/components/ui";
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
  const { summary, menuScans, conversionTrend, peakHours, peakCallHours, peakCallWindows } =
    snapshot;
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

  const upsellOn = summary.upsellAttach.configuredRules > 0;

  return (
    <div className="analytics-dashboard org-page org-page--wide min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        className="analytics-dashboard__header"
        eyebrow={
          isRestaurantScope && snapshot.restaurantName
            ? snapshot.restaurantName
            : snapshot.organizationName
        }
        title={isRestaurantScope ? "Phone order sessions" : "Calls & orders"}
        lead={
          <>
            {formatShortDate(snapshot.since.slice(0, 10))}–
            {formatShortDate(snapshot.until.slice(0, 10))}
            {!isRestaurantScope ? (
              <>
                {" "}
                · {snapshot.restaurantCount} location{snapshot.restaurantCount === 1 ? "" : "s"}
              </>
            ) : null}
            . Order counts use unique session IDs; call counts use ElevenLabs post-call webhooks.
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
                ? "Order sessions and outcomes for this location appear once phone orders are recorded."
                : "Order sessions and kitchen outcomes appear as your locations use ROAL."
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
          <section className="analytics-dashboard__stats grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label="Orders">
            <StatCard
              label="Order sessions"
              value={summary.orderSessions.toLocaleString()}
              hint="Unique sessions with draft, receipt, or usage activity"
              icon={ShoppingBag}
              color="orange"
            />
            <StatCard
              label="Session → completed"
              value={formatPercent(summary.sessionConversionPercent)}
              hint={`${summary.sessionsWithCompletedOrder} sessions with a saved phone receipt`}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              label="Avg order estimate"
              value={
                <span className="text-money">
                  {formatUsdFromCents(summary.averageOrderCents, summary.averageOrderComplete)}
                </span>
              }
              hint={
                summary.averageOrderSampleSize > 0
                  ? `${summary.averageOrderSampleSize} finalized receipts · menu + tax/fee`
                  : "From finalized phone receipts with menu prices"
              }
              icon={DollarSign}
              color="amber"
            />
            <StatCard
              label="Stuck orders"
              value={
                <span className={summary.stuckOrderCount > 0 ? "text-warning" : undefined}>
                  {summary.stuckOrderCount.toLocaleString()}
                </span>
              }
              hint="Kitchen queue idle 20+ minutes (current snapshot)"
              icon={AlertTriangle}
              color="rose"
            />
          </section>

          <section className="analytics-dashboard__stats analytics-dashboard__stats--secondary grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label="Calls">
            <StatCard
              label="Calls recorded"
              value={callOutcomes.total.toLocaleString()}
              hint="ElevenLabs post-call webhook sessions"
              icon={PhoneCall}
              color="blue"
            />
            <StatCard
              label="Call orders"
              value={callOutcomes.completed.toLocaleString()}
              hint="Calls with a saved phone receipt (not transcript-only)"
              icon={PhoneIncoming}
              color="green"
            />
            <StatCard
              label="Conversion trend"
              value={formatTrendDelta(conversionTrend.deltaPoints)}
              hint={
                conversionTrend.recentSessions > 0 || conversionTrend.priorSessions > 0
                  ? `Recent ${formatPercent(conversionTrend.recentPercent)} vs earlier ${formatPercent(conversionTrend.priorPercent)} · ${conversionTrend.label.toLowerCase()}`
                  : conversionTrend.label
              }
              icon={TrendingUp}
              color="orange"
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
              icon={Clock}
              color="amber"
            />
          </section>

          <section className="analytics-dashboard__stats analytics-dashboard__stats--followups grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label="Call outcomes">
            <StatTile
              label="FAQ / no order"
              value={callOutcomes.noOrder.toLocaleString()}
              hint="Calls that ended without an order"
            />
            <StatTile
              label="Voicemail / callback"
              value={callOutcomes.voicemailOrCallback.toLocaleString()}
              hint="Guest follow-up needed"
            />
            <StatTile
              label="Reservations"
              value={summary.reservationRequests.toLocaleString()}
              hint="Captured by the phone host"
            />
            <StatTile
              label="Staff handoffs"
              value={callOutcomes.handoff.toLocaleString()}
              hint="Calls routed to staff"
            />
          </section>

          <Panel
            className="analytics-dashboard__chart"
            title="Sessions over time"
            hint="Daily unique order sessions, finalized phone receipts, and cancellations."
          >
            <div className="analytics-dashboard__chart-scroll min-w-0 max-w-full">
              <OrdersTrendChart points={snapshot.ordersOverTime} />
            </div>
          </Panel>

          <div className="analytics-dashboard__grid grid min-w-0 gap-3 lg:grid-cols-2">
            <Panel
              className="analytics-dashboard__popular"
              title="Popular items"
              hint="From completed orders and finalized receipts in this period."
            >
              {snapshot.popularItems.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-subtle">No line items yet.</p>
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

            <Panel
              className="analytics-dashboard__menu-scans"
              title="Upsells & menu scans"
              hint={
                upsellOn
                  ? "Smart upsells are on for every call — attach rate compares offers to completed order lines."
                  : "Configure add-on rules in the restaurant profile to track upsells."
              }
            >
              <dl className="analytics-dashboard__menu-scans-list org-kv">
                <Row label="Upsell attach rate" value={formatPercent(summary.upsellAttach.attachPercent)} />
                <Row
                  label="Upsell eligible orders"
                  value={`${summary.upsellAttach.attachedOrders} of ${summary.upsellAttach.eligibleOrders} eligible orders`}
                />
                <Row
                  label="Upsell revenue"
                  value={formatUsdFromCents(
                    summary.upsellAttach.attributedRevenueCents,
                    summary.upsellAttach.revenueComplete
                  )}
                />
                <Row label="Menu scan success" value={formatPercent(menuScans.successPercent)} />
                <Row label="Menu scans extracted" value={menuScans.extracted} />
                <Row label="Menu scans failed" value={menuScans.failed} />
              </dl>
            </Panel>
          </div>

          <details className="analytics-dashboard__more panel group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] px-[1.125rem] text-[14px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:min-h-12 [&::-webkit-details-marker]:hidden">
              More metrics
              <ChevronDown
                size={16}
                strokeWidth={2}
                className="text-subtle transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>
            <div className="border-t border-line p-4">
              <section className="analytics-dashboard__stats analytics-dashboard__stats--tertiary grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label="Kitchen">
                <StatTile
                  label="Orders finalized"
                  value={summary.ordersFinalized.toLocaleString()}
                  hint="Phone receipts saved (finalize_order)"
                />
                <StatTile
                  label="Kitchen completed"
                  value={summary.completedKitchenOrders.toLocaleString()}
                  hint="Draft orders marked completed on Live orders"
                />
                <StatTile
                  label="Est. revenue (total)"
                  value={
                    <span className="text-money">
                      {formatUsdFromCents(summary.revenueCents, summary.revenueComplete)}
                    </span>
                  }
                  hint={
                    summary.revenueOrderCount > 0
                      ? `${summary.revenueOrderCount} finalized phone receipts`
                      : "From saved phone receipts with menu prices"
                  }
                />
                <StatTile
                  label="Avg prep time"
                  value={summary.avgPrepMinutes != null ? `${summary.avgPrepMinutes} min` : "—"}
                  hint={
                    summary.prepSampleSize > 0
                      ? `${summary.prepSampleSize} completed orders`
                      : "Created → completed"
                  }
                />
              </section>
              <section className="analytics-dashboard__stats analytics-dashboard__stats--outcomes mt-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label="Outcomes">
                <StatTile
                  label="Active calls"
                  value={callOutcomes.active.toLocaleString()}
                  hint="Calls still in progress when last synced"
                />
                <StatTile
                  label="Abandoned calls"
                  value={callOutcomes.abandoned.toLocaleString()}
                  hint="Failed initiation or abandoned conversation"
                />
                <StatTile
                  label="Canceled"
                  value={(summary.ordersCanceled + callOutcomes.canceled).toLocaleString()}
                  hint="Kitchen cancellations plus call-level cancels"
                />
                <StatTile
                  label="Controlled upsell lift"
                  value={formatUsdFromCents(
                    summary.upsellAttach.experimentTicketLiftCents,
                    summary.upsellAttach.experimentLiftComplete
                  )}
                  hint={
                    summary.upsellAttach.experimentTicketLiftPercent != null
                      ? `${formatPercent(summary.upsellAttach.experimentTicketLiftPercent)} treatment vs control · ${summary.upsellAttach.experimentTreatmentOrders}/${summary.upsellAttach.experimentControlOrders} split`
                      : "Needs treatment and control eligible orders"
                  }
                />
              </section>
            </div>
          </details>

          {callOutcomes.total > 0 ? (
            <Panel
              className="analytics-dashboard__top-questions"
              title="Top questions callers ask"
              hint="Topics from FAQ / no-order calls in this period, based on transcript summaries."
            >
              {snapshot.topCallerQuestions.faqNoOrderCallCount === 0 ? (
                <p className="py-4 text-center text-[13px] text-subtle">No FAQ / no-order calls in this range yet.</p>
              ) : snapshot.topCallerQuestions.topics.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-subtle">
                  FAQ / no-order calls were recorded, but no question topics could be classified yet.
                </p>
              ) : (
                <ol className="analytics-dashboard__top-questions-list -my-1 divide-y divide-line/70">
                  {snapshot.topCallerQuestions.topics.map((row, idx) => (
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
                          <span className="font-medium text-ink">{row.count}</span>{" "}
                          <span className="text-subtle">({formatPercent(row.percentOfFaqCalls)})</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          ) : null}

          {peakCallWindows.length > 0 ? (
            <Panel
              className="analytics-dashboard__rush-windows"
              title="Busiest call windows"
              hint="Day and hour buckets from ElevenLabs post-call webhooks, shown in UTC."
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {peakCallWindows.map((row) => (
                  <div
                    key={`${row.dayOfWeekUtc}-${row.hourUtc}`}
                    className="rounded-[12px] border border-line bg-elev px-3.5 py-3"
                  >
                    <p className="org-kicker">
                      {row.dayLabel} · {row.hourLabel} UTC
                    </p>
                    <p className="mt-1 font-display text-[18px] font-bold tabular-nums tracking-[-0.01em] text-ink">
                      {row.callCount} call{row.callCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {row.completedCount} order call{row.completedCount === 1 ? "" : "s"} ·{" "}
                      {formatPercent(row.conversionPercent)} conversion
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {snapshot.scope === "organization" && snapshot.byRestaurant.length > 1 ? (
            <Panel
              className="analytics-dashboard__by-location"
              flush
              title="By location"
              hint="Session conversion = completed sessions ÷ order sessions per location."
            >
              <div className="analytics-dashboard__location-table org-table min-w-0">
                <table className="xl:min-w-[900px]">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th className="is-num">Sessions</th>
                      <th className="is-num">Calls</th>
                      <th className="is-num">Call orders</th>
                      <th className="is-num">FAQ / no order</th>
                      <th className="is-num">Completed</th>
                      <th className="is-num">Stuck</th>
                      <th className="is-num">Conversion</th>
                      <th className="is-num">Upsell</th>
                      <th className="is-num">Revenue est.</th>
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
                        <td data-label="Sessions" className="is-num">{row.orderSessions}</td>
                        <td data-label="Calls" className="is-num">{row.callCount}</td>
                        <td data-label="Call orders" className="is-num">
                          <span>
                            {row.callOrderCount}
                            <span className="ml-1 text-subtle">({formatPercent(row.callConversionPercent)})</span>
                          </span>
                        </td>
                        <td data-label="FAQ / no order" className="is-num">
                          <span>
                            {row.faqNoOrderCallCount}
                            <span className="ml-1 text-subtle">({formatPercent(row.faqNoOrderPercent)})</span>
                          </span>
                        </td>
                        <td data-label="Completed" className="is-num">{row.sessionsCompleted}</td>
                        <td data-label="Stuck" className="is-num">{row.stuckOrders}</td>
                        <td data-label="Conversion" className="is-num">{formatPercent(row.conversionPercent)}</td>
                        <td data-label="Upsell" className="is-num">
                          <span>
                            {formatPercent(row.upsellAttachPercent)}
                            <span className="ml-1 text-subtle">
                              ({row.upsellAttachedOrders}/{row.upsellEligibleOrders})
                            </span>
                          </span>
                        </td>
                        <td data-label="Revenue est." className="is-num">
                          {formatUsdFromCents(row.revenueCents, row.revenueComplete)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}

          <p className="analytics-dashboard__footnote max-w-3xl text-[12px] leading-relaxed text-subtle [overflow-wrap:anywhere]">
            Order sessions are deduplicated by session ID across drafts, receipts, and usage events.
            Call outcomes come from ElevenLabs post-call webhook events when configured. Upsell
            attach rate compares configured trigger and offer text to completed order line items.
            Controlled upsell lift uses the deterministic treatment/control split from
            conversation-init. Revenue and average order use menu prices, tax, and service fee from
            each location&apos;s profile; unmatched items are excluded.
          </p>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="analytics-dashboard__menu-scan-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
