/**
 * Prompt 22 — notifications live pass (settings, dispatch, log, stuck, redaction).
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-notifications-live.ts
 */
import {
  deliveryRowForClient,
  notificationSettingsForViewer,
  redactDeliveryErrorMessage,
} from "../lib/notifications/redact";
import { dispatchNotification } from "../lib/notifications/dispatch";
import { emailProvider } from "../lib/notifications/providers/email";
import { smsProvider } from "../lib/notifications/providers/sms";
import {
  channelSecretsForSave,
  defaultNotificationSettings,
  loadNotificationSettings,
  saveNotificationSettings,
} from "../lib/notifications/settings";
import { notifyStuckOrdersForOrganization } from "../lib/notifications/stuck-orders";
import { getServiceRoleSupabase } from "../lib/supabase/server";

const QA_ORG =
  process.env.QA_NOTIF_ORG_ID?.trim() ||
  "b1111111-1111-4111-8111-111111111111";
const QA_RESTAURANT =
  process.env.QA_NOTIF_RESTAURANT_ID?.trim() ||
  "b2222222-2222-4222-8222-222222222222";

const BASE_URL =
  process.env.QA_BASE_URL?.trim() ||
  process.env.E2E_BASE_URL?.trim() ||
  "http://localhost:3020";

type Check = { name: string; ok: boolean; detail?: string };

function summarize(checks: Check[]) {
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    console.log(`${mark} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

async function probeEventsApi401(): Promise<Check> {
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "sync_failure",
        title: "probe",
        body: "probe",
      }),
    });
    return {
      name: "POST /api/notifications/events unauthenticated → 401",
      ok: res.status === 401,
      detail: `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      name: "POST /api/notifications/events unauthenticated → 401",
      ok: false,
      detail: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

async function probeCheckStuck401(): Promise<Check> {
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/check-stuck`, {
      method: "POST",
    });
    return {
      name: "POST /api/notifications/check-stuck unauthenticated → 401",
      ok: res.status === 401,
      detail: `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      name: "POST /api/notifications/check-stuck unauthenticated → 401",
      ok: false,
      detail: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

void (async () => {
  const checks: Check[] = [];
  const sb = getServiceRoleSupabase();
  if (!sb) {
    summarize([
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        ok: false,
        detail: "missing",
      },
    ]);
    return;
  }

  checks.push(await probeEventsApi401());
  checks.push(await probeCheckStuck401());

  const probeTitle = `QA P22 ${new Date().toISOString()}`;

  const existing = await loadNotificationSettings(sb, QA_ORG);
  const secretsProbe = channelSecretsForSave(
    "dev_console",
    {
      ...existing,
      webhookUrl: "https://hooks.example.com/qa-p22-secret",
      emailRecipients: ["ops@example.invalid"],
      smsRecipients: ["+15550001111"],
    },
    { webhookUrl: null, emailRecipients: [], smsRecipients: [] }
  );
  checks.push({
    name: "dev_console save preserves channel secrets",
    ok:
      secretsProbe.webhookUrl === "https://hooks.example.com/qa-p22-secret" &&
      secretsProbe.emailRecipients.length === 1,
  });

  await saveNotificationSettings(sb, QA_ORG, {
    providerMode: "dev_console",
    enabledEvents: [...existing.enabledEvents],
    channels: existing.channels,
    emailRecipients: secretsProbe.emailRecipients,
    smsRecipients: secretsProbe.smsRecipients,
    webhookUrl: secretsProbe.webhookUrl,
    orderStuckMinutes: existing.orderStuckMinutes,
  });
  const reloaded = await loadNotificationSettings(sb, QA_ORG);
  checks.push({
    name: "admin settings save round-trip (service role)",
    ok: reloaded.webhookUrl === secretsProbe.webhookUrl,
  });

  const memberView = notificationSettingsForViewer(reloaded, false);
  checks.push({
    name: "member viewer redacts webhook + recipients",
    ok:
      memberView.webhookUrl === null &&
      memberView.emailRecipients.length === 0 &&
      memberView.smsRecipients.length === 0,
  });

  checks.push({
    name: "redactDeliveryErrorMessage strips URLs",
    ok:
      redactDeliveryErrorMessage("POST https://hooks.example.com/x failed") ===
      "POST [redacted-url] failed",
  });

  await dispatchNotification(sb, {
    organizationId: QA_ORG,
    restaurantId: QA_RESTAURANT,
    restaurantName: "QA Role Test Location",
    eventType: "sync_failure",
    title: probeTitle,
    body: "Launch 22 probe — safe to ignore.",
    idempotencyKey: `qa-p22:${Date.now()}`,
  });

  const { data: deliveries } = await sb
    .from("notification_deliveries")
    .select(
      "id, organization_id, event_type, channel, title, body, payload, status, error_message, created_at"
    )
    .eq("organization_id", QA_ORG)
    .eq("title", probeTitle)
    .limit(5);

  const row = deliveries?.[0];
  const clientRow = row
    ? deliveryRowForClient({
        id: row.id as string,
        organization_id: row.organization_id as string,
        restaurant_id: QA_RESTAURANT,
        event_type: "sync_failure",
        channel: row.channel as string,
        title: row.title as string,
        body: row.body as string,
        payload: (row.payload as Record<string, unknown>) ?? {},
        status: row.status as "sent" | "failed" | "skipped",
        error_message: (row.error_message as string | null) ?? null,
        created_at: row.created_at as string,
      })
    : null;

  checks.push({
    name: "dispatch writes dev_console delivery row",
    ok: Boolean(row && row.channel === "dev_console" && row.status === "sent"),
    detail: row ? `${row.channel}/${row.status}` : "no row",
  });
  checks.push({
    name: "deliveryRowForClient omits payload",
    ok: clientRow?.payload === null,
  });

  const prodSettings = {
    ...defaultNotificationSettings(QA_ORG),
    providerMode: "production" as const,
    channels: {
      dev_console: false,
      email: true,
      sms: true,
      webhook: false,
    },
    emailRecipients: ["ops@example.invalid"],
    smsRecipients: ["+15550001111"],
  };
  const emailResult = await emailProvider.send({
    settings: prodSettings,
    organizationId: QA_ORG,
    restaurantId: null,
    eventType: "sync_failure",
    title: "t",
    body: "b",
    payload: {},
  });
  const smsResult = await smsProvider.send({
    settings: prodSettings,
    organizationId: QA_ORG,
    restaurantId: null,
    eventType: "sync_failure",
    title: "t",
    body: "b",
    payload: {},
  });
  checks.push({
    name: "email provider human-only (skipped, not fake sent)",
    ok:
      emailResult.status === "skipped" &&
      /not wired|SendGrid|Resend/i.test(emailResult.errorMessage ?? ""),
  });
  checks.push({
    name: "SMS provider human-only (skipped, not fake sent)",
    ok:
      smsResult.status === "skipped" &&
      /not wired|Twilio/i.test(smsResult.errorMessage ?? ""),
  });

  const stuck = await notifyStuckOrdersForOrganization(sb, {
    organizationId: QA_ORG,
    restaurantNames: new Map([[QA_RESTAURANT, "QA Role Test Location"]]),
  });
  checks.push({
    name: "notifyStuckOrdersForOrganization runs",
    ok: typeof stuck === "number" && stuck >= 0,
    detail: `notified=${stuck}`,
  });

  summarize(checks);
})();
