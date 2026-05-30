import Link from "next/link";
import type { ReactNode } from "react";
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
import { cn } from "@/lib/cn";

type Props = {
  snapshot: OrgOverviewPageSnapshot;
};

export function OrgOverviewDashboard({ snapshot }: Props) {
  return (
    <div className="org-overview min-w-0 max-w-full space-y-8 overflow-x-hidden sm:space-y-10">
      <header className="min-w-0">
        <p className="type-eyebrow text-accent">Organization</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Operations overview
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm text-muted">
          All locations in one place — voice agent status, menu sync, live orders,
          and what to fix before launch.
        </p>
        <p className="mt-1 text-xs text-subtle">
          Updated {formatWhen(snapshot.generatedAt)}
        </p>
      </header>

      {snapshot.organizations.map((org) => (
        <OrganizationOverviewSection key={org.organizationId} org={org} />
      ))}
    </div>
  );
}

function OrganizationOverviewSection({
  org,
}: {
  org: OrganizationOverviewSnapshot;
}) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{org.organizationName}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {formatMembershipRole(org.role as MembershipRole)} view
          </p>
        </div>
        <Link
          href="/dashboard/restaurants"
          className="text-xs font-medium text-accent hover:underline"
        >
          All locations
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Locations" value={String(org.totals.locationCount)} />
        <MiniStat label="Active orders" value={String(org.totals.activeOrders)} />
        <MiniStat
          label="Stuck orders"
          value={String(org.totals.stuckOrders)}
          tone={org.totals.stuckOrders > 0 ? "warn" : "neutral"}
        />
        <MiniStat
          label="Needs attention"
          value={String(org.totals.needsAttentionCount)}
          tone={org.totals.needsAttentionCount > 0 ? "bad" : "ok"}
        />
      </div>

      {org.restaurants.length === 0 ? (
        <p className="rounded-xl border border-line bg-card p-4 text-sm text-muted">
          No locations yet.{" "}
          <Link href="/dashboard/restaurants" className="text-accent hover:underline">
            Add a location
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-xl border border-line bg-card shadow-sm">
          <div className="org-overview__table dashboard-table min-w-0 overflow-x-auto">
            <table className="w-full min-w-0 text-left text-sm xl:min-w-[880px]">
              <thead className="text-xs uppercase tracking-wider text-subtle">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Voice agent</th>
                  <th className="px-4 py-3 font-medium">Menu sync</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Launch blockers</th>
                  <th className="px-4 py-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {org.restaurants.map((row) => (
                  <RestaurantOverviewRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function RestaurantOverviewRow({ row }: { row: OrgRestaurantOverviewRow }) {
  const stuckMsg = stuckOrdersBlockerMessage(row.stuckOrderCount);
  const voiceLabel =
    voiceProvisionBadgeLabel(row.voiceProvisionState) ??
    (row.agentConfigured ? "Agent linked" : "Not connected");

  return (
    <tr className="border-b border-line/60 align-top">
      <td data-label="Location" className="px-4 py-3">
        <Link
          href={row.links.liveOrders}
          className="font-medium text-ink hover:text-accent"
        >
          {row.name}
        </Link>
        {row.agentIdSuffix ? (
          <p className="mt-0.5 text-micro text-subtle">Agent {row.agentIdSuffix}</p>
        ) : null}
      </td>
      <td data-label="Voice agent" className="px-4 py-3">
        <StatusPill
          label={voiceLabel}
          tone={voiceTone(row.voiceProvisionState)}
        />
        {row.lastVoiceSyncError ? (
          <p className="mt-1 text-xs text-danger [overflow-wrap:anywhere]">
            {row.lastVoiceSyncError}
          </p>
        ) : null}
      </td>
      <td data-label="Menu sync" className="px-4 py-3">
        <StatusPill label={row.menuSyncLabel} tone={menuSyncTone(row.menuSyncPhase)} />
        <p className="mt-1 text-xs text-muted">
          {row.lastMenuSyncAt ? formatWhen(row.lastMenuSyncAt) : "Never synced"}
        </p>
      </td>
      <td data-label="Orders" className="px-4 py-3 text-muted">
        <p>
          <span className="font-medium text-ink">{row.activeOrderCount}</span> active
        </p>
        {row.stuckOrderCount > 0 ? (
          <p className="mt-0.5 text-warning">
            <span className="font-medium">{row.stuckOrderCount}</span> stuck
          </p>
        ) : (
          <p className="mt-0.5 text-subtle">None stuck</p>
        )}
      </td>
      <td data-label="Launch blockers" className="px-4 py-3">
        {row.launchBlockers.length === 0 && !stuckMsg ? (
          <span className="text-xs text-muted">Ready</span>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {row.launchBlockers.map((b) => (
              <li key={b.code}>
                <Link
                  href={b.href}
                  className="text-amber-950 hover:text-accent [overflow-wrap:anywhere]"
                >
                  {b.message}
                </Link>
              </li>
            ))}
            {stuckMsg ? (
              <li>
                <Link
                  href={stuckOrdersHref(row.id)}
                  className="text-warning hover:text-accent"
                >
                  {stuckMsg}
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </td>
      <td data-label="Open" className="px-4 py-3">
        <div className="flex min-w-[7rem] flex-col gap-1 text-xs font-medium">
          <QuickLink href={row.links.liveOrders}>Live orders</QuickLink>
          <QuickLink href={row.links.menuSetup}>Menu &amp; agent</QuickLink>
          <QuickLink href={row.links.voiceAgent}>Live Agent</QuickLink>
        </div>
      </td>
    </tr>
  );
}

function QuickLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-accent hover:underline">
      {children}
    </Link>
  );
}

function voiceTone(state: VoiceProvisionUiState): "ok" | "warn" | "bad" | "neutral" {
  if (state === "ready") return "ok";
  if (state === "in_progress") return "warn";
  if (state === "needs_attention") return "bad";
  return "neutral";
}

function menuSyncTone(
  phase: OrgRestaurantOverviewRow["menuSyncPhase"]
): "ok" | "warn" | "bad" | "neutral" {
  if (phase === "succeeded") return "ok";
  if (phase === "syncing") return "warn";
  if (phase === "failed") return "bad";
  return "neutral";
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
        tone === "warn" && "bg-warning/15 text-amber-950",
        tone === "bad" && "bg-danger/10 text-danger",
        tone === "neutral" && "bg-elev text-muted"
      )}
    >
      {label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-card px-3 py-2 shadow-sm">
      <p className="text-micro uppercase tracking-wider text-subtle">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold",
          tone === "ok" && "text-success",
          tone === "warn" && "text-amber-950",
          tone === "bad" && "text-danger",
          tone === "neutral" && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
