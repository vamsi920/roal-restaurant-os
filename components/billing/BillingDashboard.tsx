import Link from "next/link";
import { cn } from "@/lib/cn";
import { BILLING_PLANS, statusLabel } from "@/lib/billing";
import { BILLING_LAUNCH_POSTURE } from "@/lib/billing/launch-posture";
import type { BillingSnapshot } from "@/lib/billing/types";
import { BillingCheckoutButtons } from "@/components/billing/BillingCheckoutButtons";

type Props = {
  snapshot: BillingSnapshot;
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
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "trialing":
      return "bg-accent/10 text-accent";
    case "past_due":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "canceled":
    case "paused":
      return "bg-muted/20 text-muted";
    default:
      return "bg-elev text-muted";
  }
}

function meterTone(level: "ok" | "warning" | "exceeded"): string {
  if (level === "exceeded") return "bg-red-500";
  if (level === "warning") return "bg-amber-500";
  return "bg-accent";
}

export function BillingDashboard({ snapshot }: Props) {
  const { plan, effectiveLimits } = snapshot;

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          Billing
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Plan & usage
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm text-muted sm:text-base">
          {snapshot.organizationName} — current period{" "}
          {formatDate(snapshot.periodStart)} through{" "}
          {formatDate(snapshot.periodEnd)}.
        </p>
      </header>

      {snapshot.providerMode === "dev" ? (
        <div
          className="rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3 text-sm text-muted"
          role="status"
        >
          <p className="font-medium text-ink">Pilot billing mode</p>
          <p className="mt-1 text-pretty">
            {BILLING_LAUNCH_POSTURE.devMode} Public pricing is{" "}
            {BILLING_LAUNCH_POSTURE.pilotRate} ({BILLING_LAUNCH_POSTURE.model}).
            {BILLING_LAUNCH_POSTURE.selfServeCheckout}{" "}
            {BILLING_LAUNCH_POSTURE.pilotBilling}
          </p>
          <p className="mt-2">
            <Link
              href={BILLING_LAUNCH_POSTURE.publicPricingPath}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Public pricing
            </Link>
            {" · "}
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
          className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-muted"
          role="status"
        >
          <p className="font-medium text-ink">Stripe keys detected — checkout not live</p>
          <p className="mt-1 text-pretty">
            API keys are configured, but {BILLING_LAUNCH_POSTURE.selfServeCheckout.toLowerCase()}{" "}
            {BILLING_LAUNCH_POSTURE.pilotBilling}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
                Current plan
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
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
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

        <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Subscription</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Status</dt>
              <dd className="font-medium text-ink">
                {statusLabel(snapshot.effectiveStatus)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Provider</dt>
              <dd className="font-medium text-ink">
                {snapshot.providerMode === "stripe"
                  ? snapshot.checkoutEnabled
                    ? "Stripe"
                    : "Stripe (keys only)"
                  : "Development"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Stripe customer</dt>
              <dd className="truncate font-mono text-xs text-muted">
                {snapshot.stripeCustomerLinked ? "Linked" : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-subtle">
            {snapshot.checkoutEnabled
              ? "Invoices and payment methods appear here once billing is active."
              : "Invoices and payment methods appear here after Stripe Checkout and Customer Portal are enabled."}
          </p>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-ink">Usage this period</h2>
        <p className="mt-1 text-sm text-muted">
          Metered from usage events. Soft warnings at 80%, hard limits at 100%.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {snapshot.limitChecks.map((check) => (
            <li
              key={check.key}
              className="rounded-xl border border-line bg-elev px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-ink">{check.label}</span>
                <span className="text-muted">
                  {check.used.toLocaleString()} / {formatLimit(check.limit)}{" "}
                  {check.unitLabel}
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                aria-hidden
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
                    check.level === "exceeded"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-700 dark:text-amber-300"
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

      <section>
        <h2 className="text-sm font-semibold text-ink">Plan features</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
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
        <section>
          <h2 className="text-sm font-semibold text-ink">
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
          <ul className="mt-4 grid gap-4 lg:grid-cols-3">
            {(["starter", "growth", "enterprise"] as const).map((id) => {
              const p = BILLING_PLANS[id];
              const current = id === plan.id;
              return (
                <li
                  key={id}
                  className={cn(
                    "flex flex-col rounded-xl border p-4",
                    current
                      ? "border-accent bg-accent/5"
                      : "border-line bg-card"
                  )}
                >
                  <p className="text-xs uppercase tracking-wider text-subtle">
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

      <section className="rounded-xl border border-dashed border-line bg-surface/30 p-5">
        <h2 className="text-sm font-semibold text-ink">Invoices</h2>
        <p className="mt-2 text-sm text-muted">
          {snapshot.checkoutEnabled
            ? "Invoice history and PDF downloads will list here once billing is active."
            : snapshot.providerMode === "dev"
              ? "Pilot invoices are handled manually—no Stripe invoices in this mode."
              : "Invoice history appears here after Stripe Checkout ships. Until then, contact sales for pilot billing."}
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-elev text-xs uppercase tracking-wider text-subtle">
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

      <p className="text-sm text-muted">
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
