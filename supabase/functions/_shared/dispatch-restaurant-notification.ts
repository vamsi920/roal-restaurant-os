const TEST_HARNESS_SESSION_PREFIX = "roal-harness-";

type NotificationEventType =
  | "voicemail_callback"
  | "reservation_request"
  | "catering_inquiry"
  | "complaint_caller"
  | "call_review_needed"
  | "stuck_active_call"
  | "staff_handoff_requested";

type ChannelsConfig = {
  dev_console: boolean;
  email: boolean;
  sms: boolean;
  webhook: boolean;
};

type SettingsRow = {
  provider_mode: "dev_console" | "production";
  enabled_events: string[] | null;
  channels: ChannelsConfig | null;
  email_recipients: string[] | null;
  sms_recipients: string[] | null;
  webhook_url: string | null;
};

export type DispatchRestaurantNotificationInput = {
  organizationId: string;
  restaurantId: string;
  restaurantName?: string | null;
  eventType: NotificationEventType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
};

function shouldSkipHarness(payload?: Record<string, unknown>): boolean {
  const sessionId =
    typeof payload?.session_id === "string" ? payload.session_id.trim() : "";
  if (sessionId.startsWith(TEST_HARNESS_SESSION_PREFIX)) return true;
  return payload?.is_test_harness === true;
}

async function loadSettings(
  supabase: { from: (table: string) => unknown },
  organizationId: string
): Promise<SettingsRow | null> {
  const { data, error } = await (
    supabase.from("notification_settings") as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string
        ) => {
          maybeSingle: () => Promise<{ data: SettingsRow | null; error: { message: string } | null }>;
        };
      };
    }
  )
    .select("provider_mode, enabled_events, channels, email_recipients, sms_recipients, webhook_url")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

function activeChannels(settings: SettingsRow): string[] {
  const channels = settings.channels ?? {
    dev_console: true,
    email: false,
    sms: false,
    webhook: false,
  };

  if (settings.provider_mode === "dev_console") {
    return ["dev_console"];
  }

  const out: string[] = [];
  if (channels.email) out.push("email");
  if (channels.sms) out.push("sms");
  if (channels.webhook) out.push("webhook");
  if (channels.dev_console) out.push("dev_console");
  return out;
}

function channelResult(
  channel: string,
  settings: SettingsRow
): { status: "sent" | "skipped"; errorMessage: string | null } {
  if (channel === "dev_console") {
    return {
      status: "sent",
      errorMessage: null,
    };
  }

  if (settings.provider_mode === "dev_console") {
    return {
      status: "skipped",
      errorMessage: `${channel} disabled in dev console mode.`,
    };
  }

  if (channel === "email") {
    if (!settings.channels?.email) {
      return { status: "skipped", errorMessage: "Email channel off." };
    }
    if (!settings.email_recipients?.length) {
      return {
        status: "skipped",
        errorMessage: "No email recipients configured.",
      };
    }
    return {
      status: "skipped",
      errorMessage:
        "Email provider not wired yet. Configure SendGrid/Resend in a follow-up.",
    };
  }

  if (channel === "sms") {
    if (!settings.channels?.sms) {
      return { status: "skipped", errorMessage: "SMS channel off." };
    }
    if (!settings.sms_recipients?.length) {
      return {
        status: "skipped",
        errorMessage: "No SMS recipients configured.",
      };
    }
    return {
      status: "skipped",
      errorMessage:
        "SMS provider not wired yet. Configure Twilio in a follow-up.",
    };
  }

  if (channel === "webhook") {
    if (!settings.channels?.webhook) {
      return { status: "skipped", errorMessage: "Webhook channel off." };
    }
    if (!settings.webhook_url?.trim()) {
      return {
        status: "skipped",
        errorMessage: "No webhook URL configured.",
      };
    }
    return {
      status: "skipped",
      errorMessage: "Webhook delivery not wired yet.",
    };
  }

  return { status: "skipped", errorMessage: "Unknown channel." };
}

/** Deno-safe notification dispatch for edge tool flows. */
export async function dispatchRestaurantNotification(
  supabase: { from: (table: string) => unknown },
  input: DispatchRestaurantNotificationInput
): Promise<boolean> {
  if (shouldSkipHarness(input.payload)) {
    return false;
  }

  const settings = await loadSettings(supabase, input.organizationId);
  const enabledEvents = settings?.enabled_events?.length
    ? settings.enabled_events
    : [input.eventType];

  if (!enabledEvents.includes(input.eventType)) {
    return false;
  }

  const channels = activeChannels(
    settings ?? {
      provider_mode: "dev_console",
      enabled_events: enabledEvents,
      channels: { dev_console: true, email: false, sms: false, webhook: false },
      email_recipients: [],
      sms_recipients: [],
      webhook_url: null,
    }
  );

  const payload = {
    ...input.payload,
    restaurant_name: input.restaurantName ?? undefined,
  };

  let delivered = false;

  for (const channel of channels) {
    const result = channelResult(channel, settings ?? {
      provider_mode: "dev_console",
      enabled_events: enabledEvents,
      channels: { dev_console: true, email: false, sms: false, webhook: false },
      email_recipients: [],
      sms_recipients: [],
      webhook_url: null,
    });

    if (channel === "dev_console" && result.status === "sent") {
      console.info(`[ROAL notify:${input.eventType}]`, input.title, {
        organizationId: input.organizationId,
        restaurantId: input.restaurantId,
        body: input.body,
        payload,
      });
    }

    const { error } = await (
      supabase.from("notification_deliveries") as {
        insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>;
      }
    ).insert({
      organization_id: input.organizationId,
      restaurant_id: input.restaurantId,
      event_type: input.eventType,
      channel,
      title: input.title,
      body: input.body,
      payload,
      status: result.status,
      error_message: result.errorMessage,
      idempotency_key: `${input.idempotencyKey}:${channel}`,
    });

    if (error?.code === "23505") {
      continue;
    }
    if (error) {
      console.error(
        "[notifications] delivery log failed",
        input.eventType,
        channel,
        error.message
      );
      continue;
    }
    delivered = true;
  }

  return delivered;
}

export function reservationRequestNotificationBody(input: {
  customerName: string;
  customerPhone: string;
  partySize: number;
  requestedDate: string;
  requestedTime: string;
}): string {
  const guestLabel = input.customerName.trim() || "Guest";
  return `Reservation request (not confirmed) for ${input.partySize} guest${input.partySize === 1 ? "" : "s"} on ${input.requestedDate} at ${input.requestedTime}. Contact ${guestLabel} at ${input.customerPhone} to confirm availability — this is a request, not a booked table.`;
}

export async function emitReservationRequestNotificationEdge(
  supabase: { from: (table: string) => unknown },
  input: {
    organizationId: string;
    restaurantId: string;
    restaurantName: string;
    reservationId: string;
    sessionId?: string | null;
    conversationId?: string | null;
    customerName: string;
    customerPhone: string;
    partySize: number;
    requestedDate: string;
    requestedTime: string;
    notes?: string | null;
  }
): Promise<boolean> {
  const sessionKey = input.sessionId?.trim() || input.reservationId;
  if (sessionKey.startsWith(TEST_HARNESS_SESSION_PREFIX)) {
    return false;
  }

  return dispatchRestaurantNotification(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    eventType: "reservation_request",
    title: `Reservation request · ${input.restaurantName}`,
    body: reservationRequestNotificationBody(input),
    idempotencyKey: `reservation_request:${input.restaurantId}:${sessionKey}:${input.reservationId}`,
    payload: {
      reservation_id: input.reservationId,
      session_id: input.sessionId ?? null,
      conversation_id: input.conversationId ?? null,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      party_size: input.partySize,
      requested_date: input.requestedDate,
      requested_time: input.requestedTime,
      notes: input.notes ?? null,
      status: "requested",
    },
  });
}
