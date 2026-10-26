import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Panel, StatusChip } from "@/components/dashboard/page-primitives";
import { getAuthContext } from "@/lib/auth/context-server";
import { formatMembershipRole, isOrgAdmin } from "@/lib/auth/roles";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/settings");

  const membership = context.primaryMembership;
  const orgId = membership?.organization_id;
  let locations: { id: string; name: string }[] = [];

  if (orgId) {
    const supabase = await createServerSupabase();
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
    <div className="settings-page dashboard-page dashboard-page--medium min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        title="Settings"
        lead="Organization-wide preferences. Store hours, taxes and ordering options live inside each location."
      />

      <Panel title="Organization">
        <dl className="dashboard-kv mt-3">
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
          detail="Completed orders, sync failures, stuck tickets."
        />
        <SettingsLink
          href="/dashboard/billing"
          title="Billing"
          detail="$0.90 per completed order. Usage and invoices."
        />
        <SettingsLink
          href="/dashboard/analytics"
          title="Analytics"
          detail="Calls, orders and conversion across locations."
        />
        <SettingsLink
          href="/dashboard/support"
          title="Support"
          detail="Runbooks and how to reach us."
        />
      </div>

      <Panel
        title="Locations"
        hint="Per-location settings open inside the workspace."
        aside={
          <Link href="/dashboard/onboarding?new=1" className="btn-ghost btn-sm">
            Add location
          </Link>
        }
      >
        {locations.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">
            No locations yet.{" "}
            <Link href="/dashboard/onboarding" className="font-medium text-ink underline underline-offset-2">
              Set up your first location
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line/70">
            {locations.map((location) => (
              <li key={location.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <span className="truncate text-[13px] font-medium text-ink">{location.name}</span>
                <span className="flex shrink-0 gap-1">
                  <Link
                    href={`/dashboard/restaurants/${location.id}/menu`}
                    className="btn-ghost btn-sm"
                  >
                    Menu
                  </Link>
                  <Link
                    href={`/dashboard/restaurants/${location.id}/agent`}
                    className="btn-ghost btn-sm"
                  >
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
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="card flex min-h-11 items-center justify-between gap-3 px-4 py-3 transition-colors hover:border-line-strong"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{title}</span>
        <span className="block text-[12px] text-muted">{detail}</span>
      </span>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-subtle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
