import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  ShoppingBag,
  Store,
} from "lucide-react";
import {
  Panel,
  StatusChip,
  formatWhen,
  type Tone,
} from "@/components/dashboard/page-primitives";
import {
  Badge,
  EmptyState,
  IconTile,
  PageHeader,
  StatCard,
} from "@/components/ui";
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
    <div className="org-overview org-page org-page--wide min-w-0 space-y-8 overflow-x-hidden">
      <PageHeader
        className="!mb-0"
        eyebrow="Organization"
        title="Organization overview"
        subtitle={`Every location at a glance. Updated ${formatWhen(snapshot.generatedAt)}.`}
        actions={
          <>
            <Link href="/dashboard/restaurants" className="btn-ghost">
              All locations
            </Link>
            <Link href="/dashboard/onboarding?new=1" className="btn-primary">
              Add location
            </Link>
          </>
        }
      />
      {snapshot.organizations.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Building2}
            title="No organization yet"
            body="Once you create a location, its organization shows up here."
            action={
              <Link href="/dashboard/onboarding" className="btn-primary">
                Set up your first location
              </Link>
            }
          />
        </div>
      ) : null}
      {snapshot.organizations.map((org) => (
        <OrganizationOverviewSection key={org.organizationId} org={org} showName={multiOrg} />
      ))}
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
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <IconTile icon={Building2} color="ink" />
        <div className="min-w-0">
          <h2
            id={`org-${org.organizationId}`}
            className={showName ? "text-[15px] font-semibold tracking-tight text-ink" : "sr-only"}
          >
            {showName ? org.organizationName : "Overview"}
          </h2>
          <p className="text-[13px] text-subtle">
            {showName ? null : <span className="font-medium text-ink">{org.organizationName} · </span>}
            {formatMembershipRole(org.role as MembershipRole)} ·{" "}
            {org.totals.locationCount === 1
              ? "1 location"
              : `${org.totals.locationCount} locations`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Locations" value={org.totals.locationCount} icon={Store} color="ink" />
        <StatCard
          label="Active orders"
          value={org.totals.activeOrders}
          icon={ShoppingBag}
          color="orange"
        />
        <StatCard
          label="Stuck orders"
          value={org.totals.stuckOrders}
          hint={org.totals.stuckOrders > 0 ? "Idle in the kitchen queue" : "Kitchen is moving"}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Needs attention"
          value={org.totals.needsAttentionCount}
          hint={org.totals.needsAttentionCount > 0 ? "Fix list below" : "All clear"}
          icon={AlertTriangle}
          color={org.totals.needsAttentionCount > 0 ? "rose" : "green"}
        />
      </div>

      {org.restaurants.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Store}
            title="No locations yet"
            body="Paste a menu link and ROAL builds the phone host for you."
            action={
              <Link href="/dashboard/onboarding" className="btn-primary">
                Set up your first location
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {attention.length > 0 ? (
            <Panel
              title="Fix before going live"
              hint="One click opens the right screen."
              flush
              aside={<Badge tone="warn">{attention.length} to fix</Badge>}
            >
              <ul>
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
            <div className="org-overview__table org-table">
              <table>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Phone host</th>
                    <th>Host menu</th>
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
    <li className="list-row flex-wrap">
      <IconTile icon={AlertTriangle} color="amber" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{row.name}</span>
        <span className="block text-[12px] text-muted [overflow-wrap:anywhere]">
          {label}
          {extra > 0 ? <span className="text-subtle"> · +{extra} more</span> : null}
        </span>
      </span>
      <Link href={href} className="btn-ghost btn-sm shrink-0">
        Fix
        <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
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
        <div className="min-w-0">
          <Link
            href={`/dashboard/restaurants/${row.id}/overview`}
            className="org-link font-medium text-ink hover:underline"
          >
            {row.name}
          </Link>
          {row.agentIdSuffix ? (
            <p className="mt-0.5 font-mono text-[11px] text-subtle">agent …{row.agentIdSuffix}</p>
          ) : null}
        </div>
      </td>
      <td data-label="Phone host">
        <div className="min-w-0">
          <StatusChip tone={voiceTone(row.voiceProvisionState)}>{voiceLabel}</StatusChip>
          {row.lastVoiceSyncError ? (
            <p className="mt-1 text-[12px] text-danger [overflow-wrap:anywhere]">
              {row.lastVoiceSyncError}
            </p>
          ) : null}
        </div>
      </td>
      <td data-label="Host menu">
        <div className="min-w-0">
          <StatusChip tone={menuSyncTone(row.menuSyncPhase)}>{row.menuSyncLabel}</StatusChip>
          <p className="mt-1 text-[12px] text-subtle">
            {row.lastMenuSyncAt ? formatWhen(row.lastMenuSyncAt) : "Not sent yet"}
          </p>
        </div>
      </td>
      <td data-label="Orders" className="is-num">
        <div className="min-w-0">
          <span className="font-medium text-ink">{row.activeOrderCount}</span>
          <span className="text-subtle"> active</span>
          {row.stuckOrderCount > 0 ? (
            <p className="mt-0.5 text-[12px] text-warning">{row.stuckOrderCount} stuck</p>
          ) : null}
        </div>
      </td>
      <td data-label="Status">
        {ready ? (
          <StatusChip tone="ok">Ready</StatusChip>
        ) : (
          <ul className="space-y-1 text-[12.5px]">
            {row.launchBlockers.map((b) => (
              <li key={b.code}>
                <Link href={b.href} className="org-link text-warning hover:underline [overflow-wrap:anywhere]">
                  {b.message}
                </Link>
              </li>
            ))}
            {stuckMsg ? (
              <li>
                <Link href={stuckOrdersHref(row.id)} className="org-link text-warning hover:underline">
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
