import Link from "next/link";
import {
  Check,
  DollarSign,
  FileText,
  ReceiptText,
  ScanLine,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  InlineLink,
  PageHeader,
  Panel,
  StatusChip,
  type Tone,
} from "@/components/dashboard/page-primitives";
import { EmptyState, IconTile, StatCard, formatMoney } from "@/components/ui";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/billing";
import { BILLING_LAUNCH_POSTURE } from "@/lib/billing/launch-posture";
import type { BillingSnapshot } from "@/lib/billing/types";
import { BillingCheckoutButtons } from "@/components/billing/BillingCheckoutButtons";
import { PhoneLineSetup } from "@/components/billing/PhoneLineSetup";

type Props = {
  snapshot: BillingSnapshot;
  orgBillingHref?: string;
  /** Owner just came back from paying: show the phone line being set up. */
  justStarted?: boolean;
  /** Owner backed out of the payment page. */
  checkoutCanceled?: boolean;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatLimit(limit: number): string {
  if (limit >= 1_000_000) return "Unlimited";
  return limit.toLocaleString();
}

function statusTone(status: BillingSnapshot["effectiveStatus"]): Tone {
  switch (status) {
    case "active":
    case "dev":
      return "ok";
    case "trialing":
      return "accent";
    case "past_due":
      return "warn";
    default:
      return "neutral";
  }
}

function meterTone(level: "ok" | "warning" | "exceeded"): string {
  if (level === "exceeded") return "bg-danger";
  if (level === "warning") return "bg-warning";
  return "bg-ink";
}

export function BillingDashboard({ snapshot, orgBillingHref, justStarted, checkoutCanceled }: Props) {
  const isRestaurantScope = snapshot.scope === "restaurant";
  const pilot = snapshot.providerMode === "dev";
  const usageTotal =
    snapshot.usage.menuScans + snapshot.usage.billablePhoneOrders + snapshot.usage.toolCalls;
  const organizationBillingHref = orgBillingHref ?? "/dashboard/billing";
  const canStartOnline = snapshot.canManageBilling && snapshot.checkoutEnabled;
  const planActive = snapshot.subscriptionStatus === "active";
  const noOrders = isRestaurantScope
    ? usageTotal === 0
    : snapshot.usage.billablePhoneOrders === 0;

  return (
    <div className="billing-dashboard org-page org-page--wide min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        className="billing-dashboard__header"
        eyebrow={
          isRestaurantScope && snapshot.restaurantName
            ? `Billing · ${snapshot.restaurantName}`
            : "Billing"
        }
        title={isRestaurantScope ? "Plan & location usage" : "Plan & usage"}
        lead={
          isRestaurantScope
            ? `Organization plan for ${snapshot.organizationName}. Usage below is this location only — ${formatDate(snapshot.periodStart)} to ${formatDate(snapshot.periodEnd)}.`
            : `${snapshot.organizationName} · ${formatDate(snapshot.periodStart)} to ${formatDate(snapshot.periodEnd)}.`
        }
        actions={
          isRestaurantScope ? (
            <Link href={organizationBillingHref} className="btn-ghost">
              Organization billing
            </Link>
          ) : undefined
        }
      />

      {justStarted && planActive ? <PhoneLineSetup /> : null}

      {checkoutCanceled && !planActive ? (
        <p className="billing-dashboard__notice panel p-3 text-[13px] text-muted" role="status">
          No problem, nothing was charged. Start your plan whenever you&apos;re ready.
        </p>
      ) : null}

      {!planActive ? (
        <div
          className="billing-dashboard__notice billing-dashboard__notice--pilot panel flex min-w-0 items-start gap-3 border-accent/25 bg-accent-soft/50 p-4 text-[13px] text-muted"
          role="status"
        >
          <IconTile icon={Sparkles} color="orange" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">You only pay $0.90 when a call becomes an order.</p>
            <p className="mt-1 text-pretty">
              No monthly fee and no setup fee. Calls about your hours, wrong numbers and hang-ups are free. Start your plan
              when you&apos;re ready for real calls, and we&apos;ll set up your own phone line.
            </p>
            {canStartOnline ? (
              <BillingCheckoutButtons snapshot={snapshot} />
            ) : (
              <p className="mt-2">
                <InlineLink href={`${BILLING_LAUNCH_POSTURE.contactPath}?topic=start-plan`}>Start my plan</InlineLink>
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label="Completed orders"
          value={snapshot.usage.billablePhoneOrders.toLocaleString()}
          hint="Receipt-backed phone orders this period"
          icon={ReceiptText}
          color="green"
        />
        <StatCard
          label="Estimated charge"
          value={
            <span className="text-money">
              {formatMoney(snapshot.usage.estimatedBillableChargeUsd)}
            </span>
          }
          hint={BILLING_LAUNCH_POSTURE.pilotRate}
          icon={DollarSign}
          color="orange"
        />
        <StatCard
          label="Menu scans"
          value={snapshot.usage.menuScans.toLocaleString()}
          icon={ScanLine}
          color="blue"
        />
        <StatCard
          label="Tool calls"
          value={snapshot.usage.toolCalls.toLocaleString()}
          icon={Wrench}
          color="amber"
        />
      </div>

      <div className="billing-dashboard__plan-grid grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          className="billing-dashboard__plan"
          title={isRestaurantScope ? "Organization plan" : "Current plan"}
          aside={<StatusChip tone={statusTone(snapshot.effectiveStatus)}>{statusLabel(snapshot.effectiveStatus)}</StatusChip>}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-display text-[24px] font-bold tracking-[-0.02em] text-ink">
              {BILLING_LAUNCH_POSTURE.pilotRate}
            </p>
            <p className="text-[13px] text-muted">No monthly fee</p>
          </div>
          <p className="mt-1.5 max-w-md text-[13px] text-muted">
            {BILLING_LAUNCH_POSTURE.pilotRateDetail}
          </p>

          {snapshot.isTrialActive ? (
            <p className="mt-3 rounded-[10px] border border-line bg-elev px-3 py-2 text-[13px] text-muted">
              Trial ends {formatDate(snapshot.trialEndsAt)}
              {snapshot.trialDaysRemaining != null ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-medium text-ink">
                    {snapshot.trialDaysRemaining} day
                    {snapshot.trialDaysRemaining === 1 ? "" : "s"} left
                  </span>
                </>
              ) : null}
            </p>
          ) : snapshot.subscriptionStatus === "trialing" ? (
            <p className="mt-3 text-[13px] text-warning">
              Your free trial ended.{" "}
              {canStartOnline ? (
                "Start your plan to keep taking calls."
              ) : (
                <>
                  <InlineLink href={`${BILLING_LAUNCH_POSTURE.contactPath}?topic=start-plan`}>Start your plan</InlineLink> to
                  keep taking calls.
                </>
              )}
            </p>
          ) : null}

          {snapshot.canManageBilling ? (
            snapshot.checkoutEnabled ? (
              planActive ? <BillingCheckoutButtons snapshot={snapshot} /> : null
            ) : pilot ? (
              <p className="mt-3 text-[13px] text-muted">
                Every completed order is counted here.{" "}
                <InlineLink href={`${BILLING_LAUNCH_POSTURE.contactPath}?topic=start-plan`}>Questions about your plan?</InlineLink>
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-muted">
                To change your plan,{" "}
                <InlineLink href={`${BILLING_LAUNCH_POSTURE.contactPath}?topic=start-plan`}>get in touch</InlineLink>.
              </p>
            )
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              Ask the account owner to start the plan or update payment.
            </p>
          )}
        </Panel>

        <Panel className="billing-dashboard__subscription" title="Subscription">
          <dl className="org-kv billing-dashboard__meta">
            <div className="billing-dashboard__meta-row flex flex-col sm:flex-row">
              <dt>Status</dt>
              <dd>{statusLabel(snapshot.effectiveStatus)}</dd>
            </div>
            <div className="billing-dashboard__meta-row flex flex-col sm:flex-row">
              <dt>Period</dt>
              <dd>
                {formatDate(snapshot.periodStart)} – {formatDate(snapshot.periodEnd)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-subtle [overflow-wrap:anywhere]">
            {snapshot.stripeCustomerLinked
              ? "Your card and past invoices are under Payment & invoices."
              : "Your card and invoices will show here once your plan starts."}
          </p>
        </Panel>
      </div>

      <Panel
        className="billing-dashboard__usage"
        title={isRestaurantScope ? "This location — usage this period" : "Usage this period"}
        hint={
          isRestaurantScope
            ? "Only completed phone orders at this location are charged."
            : "Only completed phone orders are charged."
        }
      >
        {noOrders ? (
          <p
            className="mb-3 rounded-[10px] border border-dashed border-line-strong bg-elev px-3 py-2.5 text-[13px] text-muted"
            role="status"
          >
            No billable phone orders yet this period. Missed and no-order calls are not charged.
          </p>
        ) : null}
        <ul className="billing-dashboard__meters grid gap-3 sm:grid-cols-2">
          {snapshot.limitChecks.map((check) => (
            <li
              key={check.key}
              className="billing-dashboard__meter min-w-0 rounded-[10px] border border-line bg-card px-3.5 py-3"
            >
              <div className="billing-dashboard__meter-head flex flex-col gap-0.5 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <span className="font-medium text-ink">{check.label}</span>
                <span className="tabular-nums text-muted sm:text-right">
                  {check.used.toLocaleString()} / {formatLimit(check.limit)} {check.unitLabel}
                </span>
              </div>
              <div
                className="billing-dashboard__meter-track mt-2.5 h-1.5 overflow-hidden rounded-full bg-elev ring-1 ring-inset ring-line"
                role="meter"
                aria-valuenow={check.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${check.label} usage`}
              >
                <div
                  className={cn("h-full rounded-full transition-all motion-reduce:transition-none", meterTone(check.level))}
                  style={{ width: `${Math.max(check.percent, check.used > 0 ? 4 : 0)}%` }}
                />
              </div>
              {check.level !== "ok" ? (
                <p
                  className={cn(
                    "mt-1.5 text-[12px]",
                    check.level === "exceeded" ? "text-danger" : "text-warning"
                  )}
                >
                  {check.level === "exceeded"
                    ? "At limit — upgrade or reduce usage."
                    : "Approaching limit."}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="billing-dashboard__features" title="Plan features">
        <ul className="billing-dashboard__feature-list grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {snapshot.features.map((feature) => (
            <li
              key={feature.key}
              className={cn(
                "flex items-center gap-2 py-1 text-[13px]",
                feature.enabled ? "text-ink" : "text-subtle"
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full",
                  feature.enabled ? "bg-success/10 text-success" : "bg-elev text-subtle"
                )}
                aria-hidden
              >
                {feature.enabled ? <Check size={11} strokeWidth={3} /> : <span className="h-1 w-1 rounded-full bg-current" />}
              </span>
              {feature.label}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        className="billing-dashboard__invoices"
        flush
        title={isRestaurantScope ? "Organization invoices" : "Invoices"}
        hint={
          snapshot.stripeCustomerLinked
            ? "Open Payment & invoices to see and download past invoices."
            : "Your monthly invoice lists here once your plan starts."
        }
      >
        <div className="billing-dashboard__invoice-table org-table min-w-0">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="is-num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="!p-0">
                  <EmptyState
                    icon={FileText}
                    className="w-full py-8"
                    title="No invoices yet"
                    body="Completed orders are billed at $0.90 each. Invoices list here once one is issued."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="billing-dashboard__footer text-[13px] text-subtle [overflow-wrap:anywhere]">
        <InlineLink href="/pricing">Public pricing</InlineLink> · Questions?{" "}
        <InlineLink href="/contact">Contact sales</InlineLink>
      </p>
    </div>
  );
}
