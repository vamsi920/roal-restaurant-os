import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationDeliveryLog } from "@/components/notifications/NotificationDeliveryLog";
import { NotificationSettingsForm } from "@/components/notifications/NotificationSettingsForm";
import { getAuthContext } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";
import {
  deliveryRowForClient,
  notificationSettingsForViewer,
} from "@/lib/notifications/redact";
import { ensureNotificationSettings } from "@/lib/notifications/settings";
import type { NotificationDeliveryRow } from "@/lib/notifications/types";
import { NOTIFICATION_PROVIDER_POSTURE } from "@/lib/notifications/provider-posture";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/settings/notifications");

  const membership = context.primaryMembership;
  if (!membership) redirect("/dashboard/onboarding");

  const supabase = await createServerSupabase();
  const canEdit = isOrgAdmin(membership.role);

  const settings = notificationSettingsForViewer(
    await ensureNotificationSettings(supabase, membership.organization_id),
    canEdit
  );

  const { data: deliveries, error } = await supabase
    .from("notification_deliveries")
    .select(
      "id, organization_id, restaurant_id, event_type, channel, title, body, status, error_message, created_at"
    )
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw new Error(error.message);

  const rows = (deliveries ?? []).map((row) =>
    deliveryRowForClient({
      id: row.id as string,
      organization_id: row.organization_id as string,
      restaurant_id: (row.restaurant_id as string | null) ?? null,
      event_type: row.event_type as NotificationDeliveryRow["event_type"],
      channel: row.channel as string,
      title: row.title as string,
      body: row.body as string,
      payload: null,
      status: row.status as NotificationDeliveryRow["status"],
      error_message: (row.error_message as string | null) ?? null,
      created_at: row.created_at as string,
    })
  );

  return (
    <div className="notification-settings-page dashboard-page dashboard-page--medium dashboard-page__stack min-w-0 max-w-full space-y-6 overflow-x-hidden sm:space-y-8">
      <header className="dashboard-page__header min-w-0">
        <p className="dashboard-page__eyebrow">Settings</p>
        <h1 className="dashboard-page__title">Notifications</h1>
        <p className="dashboard-page__lead">
          Alerts for completed orders, sync and scan failures, stuck tickets, and
          Realtime outages. {NOTIFICATION_PROVIDER_POSTURE.devDefault}
        </p>
        <Link href="/dashboard/settings" className="dashboard-page__back">
          ← Organization
        </Link>
      </header>

      <NotificationSettingsForm settings={settings} canEdit={canEdit} />
      {!canEdit ? (
        <p className="text-sm text-muted">{NOTIFICATION_PROVIDER_POSTURE.memberReadOnly}</p>
      ) : null}
      <NotificationDeliveryLog deliveries={rows} />
    </div>
  );
}
