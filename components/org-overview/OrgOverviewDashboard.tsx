import Link from "next/link";
import {
  EmptyState,
  Panel,
  StatTile,
  StatusChip,
  formatWhen,
  type Tone,
} from "@/components/dashboard/page-primitives";
import type {
  OrgOverviewPageSnapshot,
  OrgRestaurantOverviewRow,
  OrganizationOverviewSnapshot,
} from "@/lib/org-overview/types";
import {
  stuckOrdersBlockerMessage,
  stuckOrdersHref,
} from "@/lib/org-overview/launch-blockers";
import { formatMembershipRole } from "@/lib/auth/roles";
import type { MembershipRole } from "@/lib/types";
import {
  voiceProvisionBadgeLabel,
  type VoiceProvisionUiState,
} from "@/lib/voice-agent/provision-display";

type Props = {
  snapshot: OrgOverviewPageSnapshot;
};

export function OrgOverviewDashboard({ snapshot }: Props) {
  const multiOrg = snapshot.organizations.length > 1;

  return (
    <div className="org-overview dashboard-page dashboard-page--wide min-w-0 space-y-6 overflow-x-hidden">
      {snapshot.organizations.map((org) => (
        <OrganizationOverviewSection key={org.organizationId} org={org} showName={multiOrg} />
      ))}
      <p className="text-[12px] text-subtle">Updated {formatWhen(snapshot.generatedAt)}</p>
    </div>
  );
}

function OrganizationOverviewSection({
  org,
  showName,
}: {
  org: OrganizationOverviewSnapshot;
  showName: boolean;
}) {
  const attention = org.restaurants.filter(
    (r) => r.launchBlockers.length > 0 || r.stuckOrderCount > 0
  );

  return (
    <section className="min-w-0 space-y-4" aria-labelledby={`org-${org.organizationId}`}>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id={`org-${org.organizationId}`} className="dashboard-page__title">
            {showName ? org.organizationName : "Overview"}
          </h2>
          <p className="dashboard-page__lead">
            {formatMembershipRole(org.role as MembershipRole)} ·{" "}
            {org.totals.locationCount === 1
              ? "1 location"
              : `${org.totals.locationCount} locations`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Locations" value={org.totals.locationCount} />
        <StatTile label="Active orders" value={org.totals.activeOrders} />
        <StatTile
          label="Stuck orders"
          value={org.totals.stuckOrders}
          tone={org.totals.stuckOrders > 0 ? "warn" : "neutral"}
        />
        <StatTile
          label="Needs attention"
          value={org.totals.needsAttentionCount}
          tone={org.totals.needsAttentionCount > 0 ? "bad" : "ok"}
        />
      </div>

      {org.restaurants.length === 0 ? (
        <EmptyState
          title="No locations yet"
          action={
            <Link href="/dashboard/onboarding" className="btn-primary">
              Set up your first location
            </Link>
          }
        >
          Paste a menu link and ROAL builds the phone host for you.
        </EmptyState>
      ) : (
        <>
          {attention.length > 0 ? (
            <Panel
              title="Fix before going live"
              hint="One click opens the right screen."
            >
              <ul className="mt-3 divide-y divide-line/70">
                {attention.map((row) => (
                  <AttentionRow key={row.id} row={row} />
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel
            title="Locations"
            flush
            aside={
              <Link href="/dashboard/restaurants" className="btn-ghost btn-sm">
                Open list
              </Link>
            }
          >
            <div className="org-overview__table dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Phone host</th>
                    <th>Menu sync</th>
                    <th className="is-num">Orders</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {org.restaurants.map((row) => (
                    <RestaurantOverviewRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </section>
  );
}

function AttentionRow({ row }: { row: OrgRestaurantOverviewRow }) {
  const stuckMsg = stuckOrdersBlockerMessage(row.stuckOrderCount);
  const first = row.launchBlockers[0];
  const label = first?.message ?? stuckMsg ?? "Needs a look";
  const href = first?.href ?? stuckOrdersHref(row.id);
  const extra = row.launchBlockers.length - 1 + (stuckMsg && first ? 1 : 0);

  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{row.name}</span>
        <span className="block text-[12px] text-muted [overflow-wrap:anywhere]">
          {label}
          {extra > 0 ? <span className="text-subtle"> · +{extra} more</span> : null}
        </span>
      </span>
      <Link href={href} className="btn-ghost btn-sm shrink-0">
        Fix
      </Link>
    </li>
  );
}

function RestaurantOverviewRow({ row }: { row: OrgRestaurantOverviewRow }) {
  const stuckMsg = stuckOrdersBlockerMessage(row.stuckOrderCount);
  const voiceLabel =
    voiceProvisionBadgeLabel(row.voiceProvisionState) ??
    (row.agentConfigured ? "Linked" : "Not set up");
  const ready = row.launchBlockers.length === 0 && !stuckMsg;

  return (
    <tr>
      <td data-label="Location">
        <Link href={row.links.liveOrders} className="font-medium text-ink hover:underline">
          {row.name}
        </Link>
        {row.agentIdSuffix ? (
          <p className="mt-0.5 font-mono text-[11px] text-subtle">agent …{row.agentIdSuffix}</p>
        ) : null}
      </td>
      <td data-label="Phone host">
        <StatusChip tone={voiceTone(row.voiceProvisionState)}>{voiceLabel}</StatusChip>
        {row.lastVoiceSyncError ? (
          <p className="mt-1 text-[12px] text-danger [overflow-wrap:anywhere]">
            {row.lastVoiceSyncError}
          </p>
        ) : null}
      </td>
      <td data-label="Menu sync">
        <StatusChip tone={menuSyncTone(row.menuSyncPhase)}>{row.menuSyncLabel}</StatusChip>
        <p className="mt-1 text-[12px] text-subtle">
          {row.lastMenuSyncAt ? formatWhen(row.lastMenuSyncAt) : "Never synced"}
        </p>
      </td>
      <td data-label="Orders" className="is-num">
        <span className="font-medium text-ink">{row.activeOrderCount}</span>
        <span className="text-subtle"> active</span>
        {row.stuckOrderCount > 0 ? (
          <p className="mt-0.5 text-[12px] text-warning">{row.stuckOrderCount} stuck</p>
        ) : null}
      </td>
      <td data-label="Status">
        {ready ? (
          <StatusChip tone="ok">Ready</StatusChip>
        ) : (
          <ul className="space-y-1 text-[12px]">
            {row.launchBlockers.map((b) => (
              <li key={b.code}>
                <Link href={b.href} className="text-warning hover:underline [overflow-wrap:anywhere]">
                  {b.message}
                </Link>
              </li>
            ))}
            {stuckMsg ? (
              <li>
                <Link href={stuckOrdersHref(row.id)} className="text-warning hover:underline">
                  {stuckMsg}
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </td>
    </tr>
  );
}

function voiceTone(state: VoiceProvisionUiState): Tone {
  if (state === "ready") return "ok";
  if (state === "in_progress") return "warn";
  if (state === "needs_attention") return "bad";
  return "neutral";
}

function menuSyncTone(phase: OrgRestaurantOverviewRow["menuSyncPhase"]): Tone {
  if (phase === "succeeded") return "ok";
  if (phase === "syncing") return "warn";
  if (phase === "failed") return "bad";
  return "neutral";
}
