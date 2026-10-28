import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  CreditCard,
  Headphones,
  LifeBuoy,
  Plus,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Panel, StatusChip } from "@/components/dashboard/page-primitives";
import { EmptyState, IconTile, PageHeader, type TileColor } from "@/components/ui";
import { getAuthContext } from "@/lib/auth/context-server";
import { formatMembershipRole, isOrgAdmin } from "@/lib/auth/roles";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Settings — ROAL" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/settings");

  const membership = context.primaryMembership;
  const orgId = membership?.organization_id;
  let locations: { id: string; name: string }[] = [];

  if (orgId) {
    const supabase = getDb();
    const { data } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(12);
    locations = (data ?? []) as { id: string; name: string }[];
  }

  const admin = Boolean(membership && isOrgAdmin(membership.role));

  return (
    <div className="settings-page org-page org-page--medium min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        className="!mb-0"
        title="Settings"
        subtitle="Organization-wide preferences. Store hours, taxes and ordering options live inside each location."
      />

      <Panel title="Organization">
        <dl className="org-kv">
          <div>
            <dt>Name</dt>
            <dd>{membership?.organization.name ?? "No organization"}</dd>
          </div>
          <div>
            <dt>Your role</dt>
            <dd>
              {membership ? (
                <StatusChip tone={admin ? "accent" : "neutral"}>
                  {formatMembershipRole(membership.role)}
                </StatusChip>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>Signed in as</dt>
            <dd className="font-normal text-muted">{context.user.email ?? context.user.id}</dd>
          </div>
        </dl>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <SettingsLink
          href="/dashboard/settings/notifications"
          title="Notifications"
          detail="Completed orders, setup problems, stuck tickets."
          icon={Bell}
          color="amber"
        />
        <SettingsLink
          href="/dashboard/billing"
          title="Billing"
          detail="$0.90 per completed order. Usage and invoices."
          icon={CreditCard}
          color="orange"
        />
        <SettingsLink
          href="/dashboard/analytics"
          title="Analytics"
          detail="Calls, orders and conversion across locations."
          icon={BarChart3}
          color="blue"
        />
        <SettingsLink
          href="/dashboard/support"
          title="Support"
          detail="Runbooks and how to reach us."
          icon={LifeBuoy}
          color="green"
        />
      </div>

      <Panel
        title="Locations"
        hint="Per-location settings open inside the workspace."
        flush
        aside={
          <Link href="/dashboard/onboarding?new=1" className="btn-ghost btn-sm">
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add location
          </Link>
        }
      >
        {locations.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No locations yet"
            body="Set up your first location to manage its menu, hours and phone host."
            action={
              <Link href="/dashboard/onboarding" className="btn-primary">
                Set up your first location
              </Link>
            }
          />
        ) : (
          <ul>
            {locations.map((location) => (
              <li key={location.id} className="list-row flex-wrap">
                <IconTile icon={Store} color="orange" />
                <Link
                  href={`/dashboard/restaurants/${location.id}/overview`}
                  className="org-link min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink hover:underline"
                >
                  {location.name}
                </Link>
                <span className="flex shrink-0 gap-1">
                  <Link
                    href={`/dashboard/restaurants/${location.id}/menu`}
                    className="btn-ghost btn-sm"
                  >
                    <BookOpen size={13} strokeWidth={2} aria-hidden />
                    Menu
                  </Link>
                  <Link
                    href={`/dashboard/restaurants/${location.id}/agent`}
                    className="btn-ghost btn-sm"
                  >
                    <Headphones size={13} strokeWidth={2} aria-hidden />
                    Host
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function SettingsLink({
  href,
  title,
  detail,
  icon,
  color,
}: {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  color: TileColor;
}) {
  return (
    <Link
      href={href}
      className="org-link-card panel flex min-h-11 items-center gap-3 px-4 py-3.5"
    >
      <IconTile icon={icon} color={color} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="block text-[12.5px] text-subtle">{detail}</span>
      </span>
      <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-subtle" aria-hidden />
    </Link>
  );
}
