import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ScanLine,
  ShoppingBag,
  Store,
  Wrench,
  PhoneCall,
} from "lucide-react";
import {
  PageHeader,
  Panel,
  StatusChip,
  formatWhen,
  type Tone,
} from "@/components/dashboard/page-primitives";
import { EmptyState, IconTile, StatCard } from "@/components/ui";
import { ActivatePlanButton } from "@/components/admin/ActivatePlanButton";
import type { AdminOpsSnapshot, AdminTrialLead, OpsErrorRow } from "@/lib/admin/types";
import { formatMembershipRole } from "@/lib/auth/roles";
import type { MembershipRole } from "@/lib/types";
import type { HealthCheckResult } from "@/lib/observability/health";

type Props = {
  snapshot: AdminOpsSnapshot;
};

export function AdminOpsDashboard({ snapshot }: Props) {
  return (
    <div className="admin-ops-dashboard org-page org-page--wide min-w-0 space-y-8 overflow-x-hidden">
      <PageHeader
        className="admin-ops-dashboard__header"
        eyebrow="Platform support"
        title="Tenant health"
        lead={
          <>
            Internal ROAL view of customer orgs, integrations, and recent failures.{" "}
            No API keys or secrets are shown here. Snapshot {formatWhen(snapshot.generatedAt)} ·{" "}
            <Link href="/api/health" className="org-link font-mono text-ink underline underline-offset-2">
              /api/health
            </Link>
          </>
        }
      />

      <HealthSection health={snapshot.health} envFlags={snapshot.envFlags} />

      <LeadsSection leads={snapshot.leads ?? []} />

      {snapshot.organizations.map((org) => (
        <OrganizationSection key={org.id} org={org} />
      ))}

      {snapshot.organizations.length === 0 ? (
        <div className="panel">
          <EmptyState icon={Building2} title="No organizations in this snapshot." />
        </div>
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
    ["Firebase (client)", envFlags.firebase],
    ["Firebase Admin", envFlags.firebaseAdmin],
    ["OpenAI", envFlags.openai],
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
      <div className="admin-ops-dashboard__health-grid grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={Building2} color="ink" />
        <div className="min-w-0">
          <h2 id={`admin-org-${org.id}`} className="truncate text-[15px] font-semibold tracking-tight text-ink">
            {org.name}
          </h2>
          <p className="text-[12px] text-muted">
            {formatMembershipRole(org.role as MembershipRole)}
            {org.billingPlan ? ` · Plan ${org.billingPlan}` : ""}
            {org.subscriptionStatus ? ` · ${org.subscriptionStatus}` : ""}
          </p>
        </div>
        </div>
        <span className="flex items-start gap-2">
          <Link href="/dashboard/billing" className="btn-ghost btn-sm">
            Billing
          </Link>
          <ActivatePlanButton organizationId={org.id} active={org.subscriptionStatus === "active"} />
        </span>
      </div>

      <div className="admin-ops-dashboard__stats grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        <StatCard label="Locations" value={org.restaurants.length} icon={Store} color="ink" />
        <StatCard
          label="Voice orders (30d)"
          value={usageMap.get("voice_order") ?? 0}
          icon={PhoneCall}
          color="orange"
        />
        <StatCard
          label="Completed (30d)"
          value={usageMap.get("order_completed") ?? 0}
          icon={ShoppingBag}
          color="green"
        />
        <StatCard
          label="Menu scans (30d)"
          value={usageMap.get("menu_scan") ?? 0}
          icon={ScanLine}
          color="blue"
        />
        <StatCard
          label="Tool calls (30d)"
          value={usageMap.get("tool_call") ?? 0}
          icon={Wrench}
          color="amber"
        />
      </div>

      <div className="admin-ops-dashboard__panels grid min-w-0 gap-3 lg:grid-cols-2">
        <Panel className="admin-ops-dashboard__restaurants" flush title="Restaurants & sync">
          {org.restaurants.length === 0 ? (
            <EmptyState icon={Store} title="No restaurants." />
          ) : (
            <div className="admin-ops-dashboard__restaurant-table org-table min-w-0">
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
                          className="org-link font-medium text-ink hover:underline"
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
                        <div className="min-w-0">
                          {r.sync.lastSyncAt ? formatWhen(r.sync.lastSyncAt) : "—"}
                          {r.sync.lastSyncError ? (
                            <p className="mt-0.5 text-danger [overflow-wrap:anywhere]">
                              {r.sync.lastSyncError}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="admin-ops-dashboard__errors" title="Recent errors (14d)" flush>
          {org.recentErrors.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No recent failures logged." />
          ) : (
            <ul className="admin-ops-dashboard__error-list max-h-80 overflow-y-auto overscroll-y-contain">
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

const CALL_STATUS_LABEL: Record<string, string> = {
  placed: "Called",
  unavailable: "Call them",
  busy: "Call them",
  failed: "Call failed",
  not_requested: "New",
};

/** People who finished the /try funnel and left a number. */
function LeadsSection({ leads }: { leads: AdminTrialLead[] }) {
  return (
    <Panel title={`New leads from /try (${leads.length})`} flush>
      {leads.length === 0 ? (
        <EmptyState icon={PhoneCall} title="No leads yet." />
      ) : (
        <ul className="max-h-96 overflow-y-auto overscroll-y-contain">
          {leads.map((lead) => (
            <li key={lead.trialId} className="min-w-0 border-b border-line/70 px-[1.125rem] py-3 text-[13px] last:border-b-0">
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="font-medium text-ink [overflow-wrap:anywhere]">
                  {lead.name} · {lead.restaurantName ?? lead.sourceInput ?? "Unknown restaurant"}
                </span>
                <StatusChip tone={lead.callStatus === "placed" ? "ok" : "warn"}>
                  {CALL_STATUS_LABEL[lead.callStatus] ?? lead.callStatus}
                </StatusChip>
              </div>
              <p className="mt-0.5 text-[12px] text-muted [overflow-wrap:anywhere]">
                <a href={`tel:${lead.phone}`} className="underline underline-offset-2">{lead.phone}</a> ·{" "}
                <a href={`mailto:${lead.email}`} className="underline underline-offset-2">{lead.email}</a>
              </p>
              <p className="mt-0.5 text-[11px] text-subtle">{formatWhen(lead.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ErrorRowItem({ row }: { row: OpsErrorRow }) {
  return (
    <li className="admin-ops-dashboard__error-row min-w-0 border-b border-line/70 px-[1.125rem] py-3 text-[13px] last:border-b-0">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-medium text-ink [overflow-wrap:anywhere]">{row.title}</span>
        <StatusChip>{row.source.replace("_", " ")}</StatusChip>
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
    <div className="admin-ops-dashboard__health-check min-w-0 rounded-[12px] border border-line bg-elev px-3.5 py-3">
      <p className="org-kicker">{name.replace(/_/g, " ")}</p>
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
