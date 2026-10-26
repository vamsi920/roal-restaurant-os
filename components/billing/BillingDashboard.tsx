import Link from "next/link";
import {
  InlineLink,
  PageHeader,
  Panel,
  StatTile,
  StatusChip,
  type Tone,
} from "@/components/dashboard/page-primitives";
import { cn } from "@/lib/cn";
import { BILLING_PLANS, statusLabel } from "@/lib/billing";
import { BILLING_LAUNCH_POSTURE } from "@/lib/billing/launch-posture";
import type { BillingSnapshot } from "@/lib/billing/types";
import { BillingCheckoutButtons } from "@/components/billing/BillingCheckoutButtons";

type Props = {
  snapshot: BillingSnapshot;
  orgBillingHref?: string;
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

export function BillingDashboard({ snapshot, orgBillingHref }: Props) {
  const { plan, effectiveLimits } = snapshot;
  const isRestaurantScope = snapshot.scope === "restaurant";
  const pilot = snapshot.providerMode === "dev";
  const usageTotal =
    snapshot.usage.menuScans + snapshot.usage.billablePhoneOrders + snapshot.usage.toolCalls;
  const organizationBillingHref = orgBillingHref ?? "/dashboard/billing";
  const noOrders = isRestaurantScope
    ? usageTotal === 0
    : snapshot.usage.billablePhoneOrders === 0;

  return (
    <div className="billing-dashboard dashboard-page dashboard-page--wide min-w-0 space-y-5 overflow-x-hidden">
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

      {pilot ? (
        <div
          className="billing-dashboard__notice billing-dashboard__notice--pilot dashboard-panel border-accent/30 bg-accent-soft/60 text-[13px] text-muted"
          role="status"
        >
          <p className="font-medium text-ink">Pilot billing mode</p>
          <p className="mt-1 text-pretty">
            {BILLING_LAUNCH_POSTURE.devMode} Public pricing is {BILLING_LAUNCH_POSTURE.pilotRate}{" "}
            ({BILLING_LAUNCH_POSTURE.model}). {BILLING_LAUNCH_POSTURE.selfServeCheckout}{" "}
            {BILLING_LAUNCH_POSTURE.pilotBilling}
          </p>
          <p className="billing-dashboard__notice-links mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
            <InlineLink href={BILLING_LAUNCH_POSTURE.publicPricingPath}>Public pricing</InlineLink>
            <InlineLink href={BILLING_LAUNCH_POSTURE.contactPath}>Contact for pilot terms</InlineLink>
          </p>
        </div>
      ) : !snapshot.checkoutEnabled ? (
        <div
          className="billing-dashboard__notice billing-dashboard__notice--stripe dashboard-panel border-warning/35 bg-warning/5 text-[13px] text-muted"
          role="status"
        >
          <p className="font-medium text-ink">Stripe keys detected — checkout not live</p>
          <p className="mt-1 text-pretty">
            API keys are configured, but {BILLING_LAUNCH_POSTURE.selfServeCheckout.toLowerCase()}{" "}
            {BILLING_LAUNCH_POSTURE.pilotBilling}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Completed orders"
          value={snapshot.usage.billablePhoneOrders.toLocaleString()}
          hint="Receipt-backed phone orders this period"
        />
        <StatTile
          label="Estimated charge"
          value={`$${snapshot.usage.estimatedBillableChargeUsd.toFixed(2)}`}
          hint={BILLING_LAUNCH_POSTURE.pilotRate}
        />
        <StatTile label="Menu scans" value={snapshot.usage.menuScans.toLocaleString()} />
        <StatTile label="Tool calls" value={snapshot.usage.toolCalls.toLocaleString()} />
      </div>

      <div className="billing-dashboard__plan-grid grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          className="billing-dashboard__plan"
          title={isRestaurantScope ? "Organization plan" : "Current plan"}
          aside={<StatusChip tone={statusTone(snapshot.effectiveStatus)}>{statusLabel(snapshot.effectiveStatus)}</StatusChip>}
        >
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-display text-[22px] font-semibold tracking-tight text-ink">
              {pilot
                ? BILLING_LAUNCH_POSTURE.pilotRate
                : plan.monthlyPriceUsd != null
                  ? `$${plan.monthlyPriceUsd} / month`
                  : "Custom pricing"}
            </p>
            <p className="text-[13px] text-muted">{plan.name}</p>
          </div>
          <p className="mt-1.5 max-w-md text-[13px] text-muted">
            {pilot ? BILLING_LAUNCH_POSTURE.pilotRateDetail : plan.description}
          </p>

          {snapshot.isTrialActive ? (
            <p className="mt-3 rounded-md bg-elev px-3 py-2 text-[13px] text-muted">
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
              Trial ended.{" "}
              <InlineLink href={BILLING_LAUNCH_POSTURE.contactPath}>Contact sales</InlineLink> for
              pilot terms — self-serve checkout is not live yet.
            </p>
          ) : null}

          {snapshot.canManageBilling ? (
            snapshot.checkoutEnabled ? (
              <BillingCheckoutButtons snapshot={snapshot} />
            ) : pilot ? (
              <p className="mt-3 text-[13px] text-muted">
                No self-serve checkout in pilot mode. Usage is tracked here; billing is agreed via{" "}
                <InlineLink href={BILLING_LAUNCH_POSTURE.contactPath}>contact sales</InlineLink>.
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-muted">
                Upgrade and payment buttons appear when Stripe Checkout is enabled. Until then,
                contact sales for plan changes.
              </p>
            )
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              Ask an organization admin to change plans or payment methods.
            </p>
          )}
        </Panel>

        <Panel className="billing-dashboard__subscription" title="Subscription">
          <dl className="dashboard-kv billing-dashboard__meta mt-3">
            <div className="billing-dashboard__meta-row flex flex-col sm:flex-row">
              <dt>Status</dt>
              <dd>{statusLabel(snapshot.effectiveStatus)}</dd>
            </div>
            <div className="billing-dashboard__meta-row flex flex-col sm:flex-row">
              <dt>Provider</dt>
              <dd>
                {snapshot.providerMode === "stripe"
                  ? snapshot.checkoutEnabled
                    ? "Stripe"
                    : "Stripe (keys only)"
                  : "Development"}
              </dd>
            </div>
            <div className="billing-dashboard__meta-row flex flex-col sm:flex-row">
              <dt>Stripe customer</dt>
              <dd className="font-mono text-[12px] font-normal text-muted">
                {snapshot.stripeCustomerLinked ? "Linked" : "—"}
              </dd>
            </div>
            <div className="billing-dashboard__meta-row flex flex-col sm:flex-row">
              <dt>Period</dt>
              <dd>
                {formatDate(snapshot.periodStart)} – {formatDate(snapshot.periodEnd)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-subtle [overflow-wrap:anywhere]">
            {snapshot.checkoutEnabled
              ? "Invoices and payment methods appear here once billing is active."
              : "Invoices and payment methods appear here after Stripe Checkout and Customer Portal are enabled."}
          </p>
        </Panel>
      </div>

      <Panel
        className="billing-dashboard__usage"
        title={isRestaurantScope ? "This location — usage this period" : "Usage this period"}
        hint={
          isRestaurantScope
            ? "Only receipt-backed phone orders for this location count toward pilot charges."
            : "Only receipt-backed phone orders across accessible locations count toward pilot charges."
        }
      >
        {noOrders ? (
          <p
            className="mt-3 rounded-md border border-dashed border-line-strong bg-elev px-3 py-2.5 text-[13px] text-muted"
            role="status"
          >
            No billable phone orders yet this period. Missed and no-order calls are not charged.
          </p>
        ) : null}
        <ul className="billing-dashboard__meters mt-3 grid gap-3 sm:grid-cols-2">
          {snapshot.limitChecks.map((check) => (
            <li
              key={check.key}
              className="billing-dashboard__meter min-w-0 rounded-md border border-line bg-elev px-3 py-2.5"
            >
              <div className="billing-dashboard__meter-head flex flex-col gap-0.5 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <span className="font-medium text-ink">{check.label}</span>
                <span className="tabular-nums text-muted sm:text-right">
                  {check.used.toLocaleString()} / {formatLimit(check.limit)} {check.unitLabel}
                </span>
              </div>
              <div
                className="billing-dashboard__meter-track mt-2 h-1.5 overflow-hidden rounded-full bg-line"
                role="meter"
                aria-valuenow={check.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${check.label} usage`}
              >
                <div
                  className={cn("h-full rounded-full transition-all", meterTone(check.level))}
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
        {pilot ? (
          <p className="mt-3 text-[12px] text-subtle">
            Dev mode caps: {formatLimit(effectiveLimits.max_active_locations)} locations; other
            meters are effectively unlimited. Tier limits are for future self-serve plans, not pilot
            invoicing.
          </p>
        ) : null}
      </Panel>

      <Panel className="billing-dashboard__features" title="Plan features">
        <ul className="billing-dashboard__feature-list mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
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
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  feature.enabled ? "bg-success" : "bg-line-strong"
                )}
                aria-hidden
              />
              {feature.label}
            </li>
          ))}
        </ul>
      </Panel>

      {snapshot.upgradePlanIds.length > 0 ? (
        <Panel
          className="billing-dashboard__compare"
          title={
            pilot || !snapshot.checkoutEnabled
              ? "Future self-serve tiers (not active)"
              : "Compare plans"
          }
          hint={
            pilot || !snapshot.checkoutEnabled
              ? `Monthly SaaS tiers are placeholders for a future Stripe checkout release. Pilots use ${BILLING_LAUNCH_POSTURE.pilotRate}.`
              : undefined
          }
        >
          <ul className="billing-dashboard__tier-grid mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(["starter", "growth", "enterprise"] as const).map((id) => {
              const p = BILLING_PLANS[id];
              const current = id === plan.id;
              return (
                <li
                  key={id}
                  className={cn(
                    "billing-dashboard__tier flex min-w-0 flex-col rounded-md border p-3.5",
                    current ? "border-ink" : "border-line bg-elev"
                  )}
                >
                  <p className="dashboard-page__kicker">
                    {p.name}
                    {current ? " · Current" : null}
                  </p>
                  <p className="mt-1.5 text-[17px] font-semibold tracking-tight text-ink">
                    {p.monthlyPriceUsd != null ? `$${p.monthlyPriceUsd}/mo` : "Contact us"}
                  </p>
                  <p className="mt-1.5 flex-1 text-[13px] text-muted">{p.description}</p>
                  <p className="mt-2 text-[12px] text-subtle">
                    Up to {formatLimit(p.limits.max_active_locations)} locations
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Panel
        className="billing-dashboard__invoices"
        flush
        title={isRestaurantScope ? "Organization invoices" : "Invoices"}
        hint={
          snapshot.checkoutEnabled
            ? "Invoice history and PDF downloads list here once billing is active."
            : pilot
              ? "Pilot invoices are handled manually — no Stripe invoices in this mode."
              : "Invoice history appears here after Stripe Checkout ships."
        }
      >
        <div className="billing-dashboard__invoice-table dashboard-table min-w-0">
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
                <td colSpan={3} className="text-muted">
                  No invoices yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="billing-dashboard__footer text-[13px] text-muted [overflow-wrap:anywhere]">
        <InlineLink href="/pricing">Public pricing</InlineLink> · Questions?{" "}
        <InlineLink href="/contact">Contact sales</InlineLink>
      </p>
    </div>
  );
}
