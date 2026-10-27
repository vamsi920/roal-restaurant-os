import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-primitives";
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
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/settings/notifications");

  const membership = context.primaryMembership;
  if (!membership) redirect("/dashboard/onboarding");

  const supabase = getDb();
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
    <div className="notification-settings-page org-page org-page--medium min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        backHref="/dashboard/settings"
        backLabel="Settings"
        title="Notifications"
        lead={`Alerts for completed orders, sync and scan failures, stuck tickets, and realtime outages. ${NOTIFICATION_PROVIDER_POSTURE.devDefault}`}
      />

      <NotificationSettingsForm settings={settings} canEdit={canEdit} />
      {!canEdit ? (
        <p className="text-[13px] text-subtle">{NOTIFICATION_PROVIDER_POSTURE.memberReadOnly}</p>
      ) : null}
      <NotificationDeliveryLog deliveries={rows} />
    </div>
  );
}
