import Link from "next/link";
import {
  PageHeader,
  Panel,
  StatTile,
  StatusChip,
  formatWhen,
  type Tone,
} from "@/components/dashboard/page-primitives";
import type { AdminOpsSnapshot, OpsErrorRow } from "@/lib/admin/types";
import { formatMembershipRole } from "@/lib/auth/roles";
import type { MembershipRole } from "@/lib/types";
import type { HealthCheckResult } from "@/lib/observability/health";

type Props = {
  snapshot: AdminOpsSnapshot;
};

export function AdminOpsDashboard({ snapshot }: Props) {
  return (
    <div className="admin-ops-dashboard dashboard-page dashboard-page--wide min-w-0 space-y-6 overflow-x-hidden">
      <PageHeader
        className="admin-ops-dashboard__header"
        eyebrow="Platform support"
        title="Tenant health"
        lead={
          <>
            Internal ROAL view of customer orgs, integrations, and recent failures.{" "}
            No API keys or secrets are shown here. Snapshot {formatWhen(snapshot.generatedAt)} ·{" "}
            <Link href="/api/health" className="font-mono text-ink underline underline-offset-2">
              /api/health
            </Link>
          </>
        }
      />

      <HealthSection health={snapshot.health} envFlags={snapshot.envFlags} />

      {snapshot.organizations.map((org) => (
        <OrganizationSection key={org.id} org={org} />
      ))}

      {snapshot.organizations.length === 0 ? (
        <p className="text-[13px] text-muted">No organizations in this snapshot.</p>
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
  const flags: [string, boolean][] = [
    ["Supabase", envFlags.supabase],
    ["Service role", envFlags.serviceRole],
    ["Gemini", envFlags.gemini],
    ["ElevenLabs", envFlags.elevenlabs],
    ["Agent tools", envFlags.agentTools],
    ["Stripe", envFlags.stripe],
  ];

  return (
    <Panel
      className="admin-ops-dashboard__health"
      title="Platform health"
      aside={
        <StatusChip
          tone={health.status === "healthy" ? "ok" : health.status === "degraded" ? "warn" : "bad"}
        >
          {health.status}
        </StatusChip>
      }
    >
      <div className="admin-ops-dashboard__health-grid mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(health.checks).map(([key, check]) => (
          <HealthCheckCard key={key} name={key} check={check} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Environment flags">
        {flags.map(([label, on]) => (
          <li key={label}>
            <StatusChip tone={on ? "ok" : "neutral"}>
              {label} {on ? "on" : "off"}
            </StatusChip>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function OrganizationSection({ org }: { org: AdminOpsSnapshot["organizations"][number] }) {
  const usageMap = new Map(org.usage.byType.map((r) => [r.event_type, r.count]));

  return (
    <section className="admin-ops-dashboard__org min-w-0 space-y-3" aria-labelledby={`admin-org-${org.id}`}>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
        <div className="min-w-0">
          <h2 id={`admin-org-${org.id}`} className="text-[15px] font-semibold tracking-tight text-ink">
            {org.name}
          </h2>
          <p className="text-[12px] text-muted">
            {formatMembershipRole(org.role as MembershipRole)}
            {org.billingPlan ? ` · Plan ${org.billingPlan}` : ""}
            {org.subscriptionStatus ? ` · ${org.subscriptionStatus}` : ""}
          </p>
        </div>
        <Link href="/dashboard/billing" className="btn-ghost btn-sm">
          Billing
        </Link>
      </div>

      <div className="admin-ops-dashboard__stats grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Locations" value={org.restaurants.length} />
        <StatTile label="Voice orders (30d)" value={usageMap.get("voice_order") ?? 0} />
        <StatTile label="Completed (30d)" value={usageMap.get("order_completed") ?? 0} />
        <StatTile label="Menu scans (30d)" value={usageMap.get("menu_scan") ?? 0} />
        <StatTile label="Tool calls (30d)" value={usageMap.get("tool_call") ?? 0} />
      </div>

      <div className="admin-ops-dashboard__panels grid min-w-0 gap-3 lg:grid-cols-2">
        <Panel className="admin-ops-dashboard__restaurants" flush title="Restaurants & sync">
          {org.restaurants.length === 0 ? (
            <p className="p-4 text-[13px] text-muted">No restaurants.</p>
          ) : (
            <div className="admin-ops-dashboard__restaurant-table dashboard-table min-w-0">
              <table className="xl:min-w-[520px]">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Agent</th>
                    <th>Sync</th>
                    <th>Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  {org.restaurants.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Location">
                        <Link
                          href={`/dashboard/restaurants/${r.id}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td data-label="Agent" className="font-mono text-[12px]">
                        {r.sync.agentConfigured ? (r.sync.agentIdSuffix ?? "Set") : "—"}
                      </td>
                      <td data-label="Sync">
                        <SyncPill status={r.sync.status} />
                      </td>
                      <td data-label="Last sync" className="text-[12px]">
                        {r.sync.lastSyncAt ? formatWhen(r.sync.lastSyncAt) : "—"}
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
        </Panel>

        <Panel className="admin-ops-dashboard__errors" title="Recent errors (14d)">
          {org.recentErrors.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">No recent failures logged.</p>
          ) : (
            <ul className="admin-ops-dashboard__error-list mt-3 max-h-80 divide-y divide-line/70 overflow-y-auto overscroll-y-contain">
              {org.recentErrors.map((row) => (
                <ErrorRowItem key={row.id} row={row} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

function ErrorRowItem({ row }: { row: OpsErrorRow }) {
  return (
    <li className="admin-ops-dashboard__error-row min-w-0 py-2.5 text-[13px] first:pt-0">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-medium text-ink [overflow-wrap:anywhere]">{row.title}</span>
        <span className="text-[11px] uppercase tracking-wider text-subtle">
          {row.source.replace("_", " ")}
        </span>
      </div>
      <p className="mt-0.5 text-[12px] text-muted [overflow-wrap:anywhere]">{row.detail}</p>
      <p className="mt-0.5 text-[11px] text-subtle">
        {formatWhen(row.occurredAt)}
        {row.restaurantName ? ` · ${row.restaurantName}` : ""}
      </p>
    </li>
  );
}

function HealthCheckCard({ name, check }: { name: string; check: HealthCheckResult }) {
  const tone: Tone = check.status === "pass" ? "ok" : check.status === "warn" ? "warn" : "bad";
  return (
    <div className="admin-ops-dashboard__health-check min-w-0 rounded-md border border-line bg-elev px-3 py-2">
      <p className="dashboard-page__kicker">{name.replace(/_/g, " ")}</p>
      <div className="mt-1 flex items-center gap-2">
        <StatusChip tone={tone}>{check.status}</StatusChip>
        {check.latency_ms != null ? (
          <span className="text-[12px] tabular-nums text-muted">{check.latency_ms}ms</span>
        ) : null}
      </div>
      {check.message ? (
        <p className="mt-1 text-[12px] text-muted [overflow-wrap:anywhere]">{check.message}</p>
      ) : null}
    </div>
  );
}

function SyncPill({ status }: { status: "ok" | "error" | "never" }) {
  const label = status === "ok" ? "OK" : status === "error" ? "Error" : "Not connected";
  return (
    <StatusChip tone={status === "ok" ? "ok" : status === "error" ? "bad" : "neutral"}>
      {label}
    </StatusChip>
  );
}
