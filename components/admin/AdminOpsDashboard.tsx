import Link from "next/link";
import type { AdminOpsSnapshot, OpsErrorRow } from "@/lib/admin/types";
import { formatMembershipRole } from "@/lib/auth/roles";
import type { MembershipRole } from "@/lib/types";
import type { HealthCheckResult } from "@/lib/observability/health";
import { cn } from "@/lib/cn";

type Props = {
  snapshot: AdminOpsSnapshot;
};

export function AdminOpsDashboard({ snapshot }: Props) {
  return (
    <div className="admin-ops-dashboard min-w-0 max-w-full space-y-8 overflow-x-hidden sm:space-y-10">
      <header className="admin-ops-dashboard__header min-w-0">
        <p className="type-eyebrow text-accent">
          Platform support
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Tenant health
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm text-muted">
          Internal ROAL view of customer orgs, integrations, and recent failures.
          No API keys or secrets are shown here.
        </p>
        <p className="mt-1 text-xs text-subtle">
          Snapshot {formatWhen(snapshot.generatedAt)} ·{" "}
          <Link href="/api/health" className="text-accent hover:underline">
            /api/health
          </Link>
        </p>
      </header>

      <HealthSection health={snapshot.health} envFlags={snapshot.envFlags} />

      {snapshot.organizations.map((org) => (
        <OrganizationSection key={org.id} org={org} />
      ))}

      {snapshot.organizations.length === 0 ? (
        <p className="text-sm text-muted">No organizations in this snapshot.</p>
      ) : null}
    </div>
  );
}

function HealthSection({
  health,
  envFlags,
}: {
  health: AdminOpsSnapshot["health"];
  envFlags: AdminOpsSnapshot["envFlags"];
}) {
  return (
    <section className="admin-ops-dashboard__health min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Platform health</h2>
        <StatusPill
          label={health.status}
          tone={
            health.status === "healthy"
              ? "ok"
              : health.status === "degraded"
                ? "warn"
                : "bad"
          }
        />
      </div>
      <div className="admin-ops-dashboard__health-grid mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(health.checks).map(([key, check]) => (
          <HealthCheckCard key={key} name={key} check={check} />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted [overflow-wrap:anywhere]">
        Env flags: Supabase {flag(envFlags.supabase)} · Service role{" "}
        {flag(envFlags.serviceRole)} · Gemini {flag(envFlags.gemini)} ·
        ElevenLabs {flag(envFlags.elevenlabs)} · Agent tools{" "}
        {flag(envFlags.agentTools)} · Stripe {flag(envFlags.stripe)}
      </p>
    </section>
  );
}

function OrganizationSection({
  org,
}: {
  org: AdminOpsSnapshot["organizations"][number];
}) {
  const usageMap = new Map(
    org.usage.byType.map((r) => [r.event_type, r.count])
  );

  return (
    <section className="admin-ops-dashboard__org min-w-0 space-y-4">
      <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{org.name}</h2>
          <p className="mt-0.5 text-xs text-muted">
            Membership: {formatMembershipRole(org.role as MembershipRole)}
            {org.billingPlan ? ` · Plan ${org.billingPlan}` : ""}
            {org.subscriptionStatus
              ? ` · ${org.subscriptionStatus}`
              : ""}
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="text-xs font-medium text-accent hover:underline"
        >
          Billing
        </Link>
      </div>

      <div className="admin-ops-dashboard__stats grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Locations" value={String(org.restaurants.length)} />
        <MiniStat
          label="Voice orders (30d)"
          value={String(usageMap.get("voice_order") ?? 0)}
        />
        <MiniStat
          label="Completed (30d)"
          value={String(usageMap.get("order_completed") ?? 0)}
        />
        <MiniStat
          label="Menu scans (30d)"
          value={String(usageMap.get("menu_scan") ?? 0)}
        />
        <MiniStat
          label="Tool calls (30d)"
          value={String(usageMap.get("tool_call") ?? 0)}
        />
      </div>

      <div className="admin-ops-dashboard__panels grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="admin-ops-dashboard__restaurants min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Restaurants & sync</h3>
          {org.restaurants.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No restaurants.</p>
          ) : (
            <div className="admin-ops-dashboard__restaurant-table dashboard-table mt-3 min-w-0">
              <table className="w-full min-w-0 text-left text-sm xl:min-w-[520px]">
                <thead className="text-xs uppercase tracking-wider text-subtle">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-2 font-medium">Location</th>
                    <th className="py-2 pr-2 font-medium">Agent</th>
                    <th className="py-2 pr-2 font-medium">Sync</th>
                    <th className="py-2 font-medium">Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  {org.restaurants.map((r) => (
                    <tr key={r.id} className="border-b border-line/60">
                      <td data-label="Location" className="py-2 pr-2">
                        <Link
                          href={`/dashboard/restaurants/${r.id}`}
                          className="font-medium text-ink hover:text-accent"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td data-label="Agent" className="py-2 pr-2 text-muted">
                        {r.sync.agentConfigured
                          ? r.sync.agentIdSuffix ?? "Set"
                          : "—"}
                      </td>
                      <td data-label="Sync" className="py-2 pr-2">
                        <SyncPill status={r.sync.status} />
                      </td>
                      <td data-label="Last sync" className="py-2 text-xs text-muted">
                        {r.sync.lastSyncAt
                          ? formatWhen(r.sync.lastSyncAt)
                          : "—"}
                        {r.sync.lastSyncError ? (
                          <p className="mt-0.5 text-danger [overflow-wrap:anywhere]">
                            {r.sync.lastSyncError}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-ops-dashboard__errors min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Recent errors (14d)</h3>
          {org.recentErrors.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No recent failures logged.</p>
          ) : (
            <ul className="admin-ops-dashboard__error-list mt-3 max-h-80 space-y-2 overflow-y-auto overscroll-y-contain">
              {org.recentErrors.map((row) => (
                <ErrorRowItem key={row.id} row={row} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ErrorRowItem({ row }: { row: OpsErrorRow }) {
  return (
    <li className="admin-ops-dashboard__error-row min-w-0 rounded-lg border border-line bg-elev px-3 py-2 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <span className="font-medium text-ink [overflow-wrap:anywhere]">{row.title}</span>
        <span className="text-micro uppercase tracking-wider text-subtle">
          {row.source.replace("_", " ")}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">{row.detail}</p>
      <p className="mt-1 text-micro text-subtle">
        {formatWhen(row.occurredAt)}
        {row.restaurantName ? ` · ${row.restaurantName}` : ""}
      </p>
    </li>
  );
}

function HealthCheckCard({
  name,
  check,
}: {
  name: string;
  check: HealthCheckResult;
}) {
  return (
    <div className="admin-ops-dashboard__health-check min-w-0 rounded-lg border border-line bg-elev px-3 py-2">
      <p className="text-micro uppercase tracking-wider text-subtle">
        {name.replace(/_/g, " ")}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <StatusPill
          label={check.status}
          tone={
            check.status === "pass"
              ? "ok"
              : check.status === "warn"
                ? "warn"
                : "bad"
          }
        />
        {check.latency_ms != null ? (
          <span className="text-xs text-muted">{check.latency_ms}ms</span>
        ) : null}
      </div>
      {check.message ? (
        <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">{check.message}</p>
      ) : null}
    </div>
  );
}

function SyncPill({ status }: { status: "ok" | "error" | "never" }) {
  const label =
    status === "ok" ? "OK" : status === "error" ? "Error" : "Not connected";
  return (
    <StatusPill
      label={label}
      tone={status === "ok" ? "ok" : status === "error" ? "bad" : "neutral"}
    />
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "bad" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
        tone === "ok" && "bg-success/15 text-success",
        tone === "warn" && "bg-warning/15 text-amber-900",
        tone === "bad" && "bg-danger/10 text-danger",
        tone === "neutral" && "bg-elev text-muted"
      )}
    >
      {label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-ops-dashboard__mini-stat min-w-0 rounded-xl border border-line bg-card px-3 py-2 shadow-sm">
      <p className="text-micro uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function flag(on: boolean): string {
  return on ? "✓" : "—";
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
