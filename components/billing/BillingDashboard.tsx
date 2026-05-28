import Link from "next/link";
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

function statusTone(
  status: BillingSnapshot["effectiveStatus"]
): string {
  switch (status) {
    case "active":
    case "dev":
      return "bg-success/10 text-success";
    case "trialing":
      return "bg-accent/12 text-accent";
    case "past_due":
      return "bg-warning/12 text-warning";
    case "canceled":
    case "paused":
      return "bg-muted/20 text-muted";
    default:
      return "bg-elev text-muted";
  }
}

function meterTone(level: "ok" | "warning" | "exceeded"): string {
  if (level === "exceeded") return "bg-danger";
  if (level === "warning") return "bg-warning";
  return "bg-accent";
}

export function BillingDashboard({ snapshot, orgBillingHref }: Props) {
  const { plan, effectiveLimits } = snapshot;
  const isRestaurantScope = snapshot.scope === "restaurant";
  const usageTotal =
    snapshot.usage.menuScans +
    snapshot.usage.voiceOrders +
    snapshot.usage.completedOrders +
    snapshot.usage.toolCalls;
  const organizationBillingHref = orgBillingHref ?? "/dashboard/billing";

  return (
    <div className="billing-dashboard dashboard-page dashboard-page--wide min-w-0 max-w-full space-y-6 overflow-x-hidden sm:space-y-8">
      <header className="billing-dashboard__header dashboard-page__header min-w-0">
        <p className="dashboard-page__eyebrow">
          Billing
          {isRestaurantScope && snapshot.restaurantName
            ? ` · ${snapshot.restaurantName}`
            : null}
        </p>
        <h1 className="dashboard-page__title">
          {isRestaurantScope ? "Plan & location usage" : "Plan & usage"}
        </h1>
        <p className="dashboard-page__lead">
          {isRestaurantScope ? (
            <>
              Organization plan for {snapshot.organizationName}. Usage below is
              for this location only — {formatDate(snapshot.periodStart)} through{" "}
              {formatDate(snapshot.periodEnd)}.
            </>
          ) : (
            <>
              {snapshot.organizationName} — {formatDate(snapshot.periodStart)}{" "}
              through {formatDate(snapshot.periodEnd)}.
            </>
          )}
        </p>
        {isRestaurantScope ? (
          <p className="mt-2 text-sm text-muted">
            Subscription and invoices are managed at the organization level.{" "}
            <Link
              href={organizationBillingHref}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              View organization billing
            </Link>
          </p>
        ) : null}
      </header>

      {snapshot.providerMode === "dev" ? (
        <div
          className="billing-dashboard__notice billing-dashboard__notice--pilot dashboard-panel border-dashed border-accent/40 bg-accent/5 text-sm text-muted"
          role="status"
        >
          <p className="font-medium text-ink">Pilot billing mode</p>
          <p className="mt-1 text-pretty">
            {BILLING_LAUNCH_POSTURE.devMode} Public pricing is{" "}
            {BILLING_LAUNCH_POSTURE.pilotRate} ({BILLING_LAUNCH_POSTURE.model}).
            {BILLING_LAUNCH_POSTURE.selfServeCheckout}{" "}
            {BILLING_LAUNCH_POSTURE.pilotBilling}
          </p>
          <p className="billing-dashboard__notice-links mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-3">
            <Link
              href={BILLING_LAUNCH_POSTURE.publicPricingPath}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Public pricing
            </Link>
            <Link
              href={BILLING_LAUNCH_POSTURE.contactPath}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Contact for pilot terms
            </Link>
          </p>
        </div>
      ) : !snapshot.checkoutEnabled ? (
        <div
          className="billing-dashboard__notice billing-dashboard__notice--stripe dashboard-panel border-dashed border-warning/35 bg-warning/5 text-sm text-muted"
          role="status"
        >
          <p className="font-medium text-ink">Stripe keys detected — checkout not live</p>
          <p className="mt-1 text-pretty">
            API keys are configured, but {BILLING_LAUNCH_POSTURE.selfServeCheckout.toLowerCase()}{" "}
            {BILLING_LAUNCH_POSTURE.pilotBilling}
          </p>
        </div>
      ) : null}

      <div className="billing-dashboard__plan-grid grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="billing-dashboard__plan dashboard-panel min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="dashboard-page__kicker">
                {isRestaurantScope ? "Organization plan" : "Current plan"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-ink">{plan.name}</h2>
              <p className="mt-2 max-w-md text-sm text-muted">{plan.description}</p>
            </div>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                statusTone(snapshot.effectiveStatus)
              )}
            >
              {statusLabel(snapshot.effectiveStatus)}
            </span>
          </div>

          <p className="mt-4 text-sm text-muted">
            {snapshot.providerMode === "dev" ? (
              <>
                <span className="text-2xl font-semibold text-ink">
                  {BILLING_LAUNCH_POSTURE.pilotRate}
                </span>
                <span className="mt-1 block text-xs text-subtle">
                  {BILLING_LAUNCH_POSTURE.pilotRateDetail} Dashboard tier limits
                  below are for future self-serve plans—not pilot invoicing.
                </span>
              </>
            ) : plan.monthlyPriceUsd != null ? (
              <>
                <span className="text-2xl font-semibold text-ink">
                  ${plan.monthlyPriceUsd}
                </span>
                <span className="ml-1">/ month</span>
              </>
            ) : (
              <span className="font-medium text-ink">Custom pricing</span>
            )}
          </p>

          {snapshot.isTrialActive ? (
            <p className="mt-3 rounded-lg bg-elev px-3 py-2 text-sm text-muted">
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
            <p className="mt-3 text-sm text-warning">
              Trial ended.{" "}
              <Link href={BILLING_LAUNCH_POSTURE.contactPath} className="underline">
                Contact sales
              </Link>{" "}
              for pilot terms—self-serve checkout is not live yet.
            </p>
          ) : null}

          {snapshot.canManageBilling ? (
            snapshot.checkoutEnabled ? (
              <BillingCheckoutButtons snapshot={snapshot} />
            ) : snapshot.providerMode === "dev" ? (
              <p className="mt-4 text-sm text-muted">
                No self-serve checkout in pilot mode. Usage meters track activity;
                billing is agreed manually via{" "}
                <Link
                  href={BILLING_LAUNCH_POSTURE.contactPath}
                  className="text-accent underline-offset-2 hover:underline"
                >
                  contact sales
                </Link>
                .
              </p>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Upgrade and payment buttons will appear when Stripe Checkout is
                enabled. Until then, contact sales for plan changes.
              </p>
            )
          ) : (
            <p className="mt-4 text-sm text-muted">
              Ask an organization admin to change plans or payment methods.
            </p>
          )}
        </section>

        <section className="billing-dashboard__subscription dashboard-panel min-w-0">
          <h2 className="dashboard-page__section-title">Subscription</h2>
          <dl className="billing-dashboard__meta mt-4 space-y-3 text-sm">
            <div className="billing-dashboard__meta-row flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-muted">Status</dt>
              <dd className="font-medium text-ink sm:text-right">
                {statusLabel(snapshot.effectiveStatus)}
              </dd>
            </div>
            <div className="billing-dashboard__meta-row flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-muted">Provider</dt>
              <dd className="font-medium text-ink sm:text-right">
                {snapshot.providerMode === "stripe"
                  ? snapshot.checkoutEnabled
                    ? "Stripe"
                    : "Stripe (keys only)"
                  : "Development"}
              </dd>
            </div>
            <div className="billing-dashboard__meta-row flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-muted">Stripe customer</dt>
              <dd className="font-mono text-xs text-muted sm:text-right [overflow-wrap:anywhere]">
                {snapshot.stripeCustomerLinked ? "Linked" : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-subtle [overflow-wrap:anywhere]">
            {snapshot.checkoutEnabled
              ? "Invoices and payment methods appear here once billing is active."
              : "Invoices and payment methods appear here after Stripe Checkout and Customer Portal are enabled."}
          </p>
        </section>
      </div>

      <section className="billing-dashboard__usage min-w-0">
        <h2 className="dashboard-page__section-title">
          {isRestaurantScope ? "This location — usage this period" : "Usage this period"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {isRestaurantScope
            ? "Metered usage events for this location. Plan limits apply to your organization."
            : "Metered from usage events. Soft warnings at 80%, hard limits at 100%."}
        </p>
        {isRestaurantScope && usageTotal === 0 ? (
          <p
            className="mt-3 rounded-lg border border-dashed border-line bg-elev px-4 py-3 text-sm text-muted"
            role="status"
          >
            No metered activity for this location in the current billing period.
          </p>
        ) : null}
        <ul className="billing-dashboard__meters mt-4 grid gap-3 sm:grid-cols-2">
          {snapshot.limitChecks.map((check) => (
            <li
              key={check.key}
              className="billing-dashboard__meter min-w-0 rounded-xl border border-line bg-elev px-4 py-3"
            >
              <div className="billing-dashboard__meter-head flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <span className="font-medium text-ink">{check.label}</span>
                <span className="text-muted sm:text-right">
                  {check.used.toLocaleString()} / {formatLimit(check.limit)}{" "}
                  {check.unitLabel}
                </span>
              </div>
              <div
                className="billing-dashboard__meter-track mt-2 h-2 overflow-hidden rounded-full bg-line"
                role="meter"
                aria-valuenow={check.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${check.label} usage`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    meterTone(check.level)
                  )}
                  style={{ width: `${Math.max(check.percent, check.used > 0 ? 4 : 0)}%` }}
                />
              </div>
              {check.level !== "ok" ? (
                <p
                  className={cn(
                    "mt-2 text-xs",
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
        {snapshot.providerMode === "dev" ? (
          <p className="mt-3 text-xs text-subtle">
            Dev mode caps: {formatLimit(effectiveLimits.max_active_locations)}{" "}
            locations; other meters are effectively unlimited.
          </p>
        ) : null}
      </section>

      <section className="billing-dashboard__features min-w-0">
        <h2 className="dashboard-page__section-title">Plan features</h2>
        <ul className="billing-dashboard__feature-list mt-3 grid gap-2 sm:grid-cols-2">
          {snapshot.features.map((feature) => (
            <li
              key={feature.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                feature.enabled
                  ? "border-line bg-card text-ink"
                  : "border-line/60 bg-surface/40 text-muted"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  feature.enabled ? "bg-accent" : "bg-line"
                )}
                aria-hidden
              />
              {feature.label}
            </li>
          ))}
        </ul>
      </section>

      {snapshot.upgradePlanIds.length > 0 ? (
        <section className="billing-dashboard__compare min-w-0">
          <h2 className="dashboard-page__section-title">
            {snapshot.providerMode === "dev" || !snapshot.checkoutEnabled
              ? "Future self-serve tiers (not active)"
              : "Compare plans"}
          </h2>
          {snapshot.providerMode === "dev" || !snapshot.checkoutEnabled ? (
            <p className="mt-1 text-sm text-muted">
              Monthly SaaS tiers below are placeholders for a future Stripe
              checkout release. Pilots use {BILLING_LAUNCH_POSTURE.pilotRate}.
            </p>
          ) : null}
          <ul className="billing-dashboard__tier-grid mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["starter", "growth", "enterprise"] as const).map((id) => {
              const p = BILLING_PLANS[id];
              const current = id === plan.id;
              return (
                <li
                  key={id}
                  className={cn(
                    "billing-dashboard__tier flex min-w-0 flex-col rounded-xl border p-4",
                    current
                      ? "border-accent bg-accent/5"
                      : "border-line bg-card"
                  )}
                >
                  <p className="dashboard-page__kicker">
                    {p.name}
                    {current ? " · Current" : null}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {p.monthlyPriceUsd != null
                      ? `$${p.monthlyPriceUsd}/mo`
                      : "Contact us"}
                  </p>
                  <p className="mt-2 flex-1 text-sm text-muted">
                    {p.description}
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    Up to {formatLimit(p.limits.max_active_locations)} locations
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="billing-dashboard__invoices dashboard-panel min-w-0 border-dashed">
        <h2 className="dashboard-page__section-title">
          {isRestaurantScope ? "Organization invoices" : "Invoices"}
        </h2>
        <p className="mt-2 text-sm text-muted [overflow-wrap:anywhere]">
          {snapshot.checkoutEnabled
            ? "Invoice history and PDF downloads will list here once billing is active."
            : snapshot.providerMode === "dev"
              ? "Pilot invoices are handled manually—no Stripe invoices in this mode."
              : "Invoice history appears here after Stripe Checkout ships. Until then, contact sales for pilot billing."}
        </p>
        <div className="billing-dashboard__invoice-table dashboard-table mt-4 min-w-0 overflow-hidden rounded-lg border border-line">
          <table className="w-full min-w-0 text-left text-sm">
            <thead className="bg-elev text-xs font-medium text-subtle">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line text-muted">
                <td className="px-4 py-3" colSpan={3}>
                  No invoices yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p className="billing-dashboard__footer text-sm text-muted [overflow-wrap:anywhere]">
        <Link href="/pricing" className="text-accent underline-offset-2 hover:underline">
          Public pricing
        </Link>{" "}
        · Questions?{" "}
        <Link href="/contact" className="text-accent underline-offset-2 hover:underline">
          Contact sales
        </Link>
      </p>
    </div>
  );
}
