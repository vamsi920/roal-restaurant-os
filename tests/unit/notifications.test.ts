import { beforeEach, describe, expect, it, vi } from "vitest";
import { activeProvidersForSettings } from "@/lib/notifications/providers";
import {
  deliveryRowForClient,
  notificationSettingsForViewer,
  redactDeliveryErrorMessage,
} from "@/lib/notifications/redact";
import {
  channelSecretsForSave,
  defaultNotificationSettings,
} from "@/lib/notifications/settings";
import type { NotificationDeliveryRow } from "@/lib/notifications/types";

describe("activeProvidersForSettings", () => {
  const orgId = "11111111-1111-4111-8111-111111111111";

  it("uses only dev_console in dev_console mode", () => {
    const settings = defaultNotificationSettings(orgId);
    const channels = activeProvidersForSettings(settings).map((p) => p.channel);
    expect(channels).toEqual(["dev_console"]);
  });

  it("respects production channel toggles", () => {
    const settings = {
      ...defaultNotificationSettings(orgId),
      providerMode: "production" as const,
      channels: {
        dev_console: false,
        email: true,
        sms: false,
        webhook: true,
      },
    };
    const channels = activeProvidersForSettings(settings).map((p) => p.channel);
    expect(channels).toEqual(["email", "webhook"]);
  });
});

describe("channelSecretsForSave", () => {
  const orgId = "11111111-1111-4111-8111-111111111111";

  it("keeps existing secrets when saving dev_console mode", () => {
    const existing = {
      ...defaultNotificationSettings(orgId),
      webhookUrl: "https://hooks.example.com/secret",
      emailRecipients: ["ops@example.com"],
      smsRecipients: ["+15551234567"],
    };
    const fromForm = {
      emailRecipients: [] as string[],
      smsRecipients: [] as string[],
      webhookUrl: null as string | null,
    };
    expect(channelSecretsForSave("dev_console", existing, fromForm)).toEqual({
      emailRecipients: ["ops@example.com"],
      smsRecipients: ["+15551234567"],
      webhookUrl: "https://hooks.example.com/secret",
    });
  });

  it("uses form values in production mode", () => {
    const existing = defaultNotificationSettings(orgId);
    const fromForm = {
      emailRecipients: ["new@example.com"],
      smsRecipients: ["+19998887777"],
      webhookUrl: "https://hooks.example.com/new",
    };
    expect(channelSecretsForSave("production", existing, fromForm)).toEqual(
      fromForm
    );
  });
});

describe("notificationSettingsForViewer", () => {
  const orgId = "11111111-1111-4111-8111-111111111111";

  it("redacts secrets for non-admins", () => {
    const settings = {
      ...defaultNotificationSettings(orgId),
      webhookUrl: "https://hooks.example.com/secret",
      emailRecipients: ["ops@example.com"],
      smsRecipients: ["+15551234567"],
    };
    const view = notificationSettingsForViewer(settings, false);
    expect(view.webhookUrl).toBeNull();
    expect(view.emailRecipients).toEqual([]);
    expect(view.smsRecipients).toEqual([]);
  });
});

describe("delivery redaction", () => {
  it("strips URLs from error messages", () => {
    expect(
      redactDeliveryErrorMessage("POST https://hooks.example.com/roal failed")
    ).toBe("POST [redacted-url] failed");
  });

  it("omits payload from client rows", () => {
    const row: NotificationDeliveryRow = {
      id: "1",
      organization_id: "o",
      restaurant_id: null,
      event_type: "sync_failure",
      channel: "dev_console",
      title: "Test",
      body: "Body",
      payload: { token: "secret" },
      status: "sent",
      error_message: null,
      created_at: new Date().toISOString(),
    };
    expect(deliveryRowForClient(row).payload).toBeNull();
  });
});

vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchNotification: vi.fn(),
}));

vi.mock("@/lib/notifications/settings", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/notifications/settings")>();
  return {
    ...actual,
    loadNotificationSettings: vi.fn(),
  };
});

import { dispatchNotification } from "@/lib/notifications/dispatch";
import { notifyStuckOrdersForOrganization } from "@/lib/notifications/stuck-orders";
import {
  defaultNotificationSettings,
  loadNotificationSettings,
} from "@/lib/notifications/settings";

describe("notifyStuckOrdersForOrganization", () => {
  const orgId = "11111111-1111-4111-8111-111111111111";
  const restaurantId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadNotificationSettings).mockResolvedValue(
      defaultNotificationSettings(orgId)
    );
    vi.mocked(dispatchNotification).mockResolvedValue(undefined);
  });

  it("returns 0 when order_stuck is disabled", async () => {
    vi.mocked(loadNotificationSettings).mockResolvedValue({
      ...defaultNotificationSettings(orgId),
      enabledEvents: ["order_completed"],
    });

    const count = await notifyStuckOrdersForOrganization({} as never, {
      organizationId: orgId,
      restaurantNames: new Map([[restaurantId, "Test"]]),
    });

    expect(count).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("returns 0 when there are no restaurants", async () => {
    const count = await notifyStuckOrdersForOrganization({} as never, {
      organizationId: orgId,
      restaurantNames: new Map(),
    });

    expect(count).toBe(0);
  });

  it("dispatches for stuck draft orders", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "order-1",
                        restaurant_id: restaurantId,
                        session_id: "sess-abcdef12",
                        status: "in_progress",
                        updated_at: "2020-01-01T00:00:00.000Z",
                        customer_name: "Alex",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const count = await notifyStuckOrdersForOrganization(supabase as never, {
      organizationId: orgId,
      restaurantNames: new Map([[restaurantId, "Test"]]),
    });

    expect(count).toBe(1);
    expect(dispatchNotification).toHaveBeenCalledWith(supabase, {
      organizationId: orgId,
      restaurantId,
      restaurantName: "Test",
      eventType: "order_stuck",
      title: "Order stuck · Test",
      body: expect.stringContaining("in_progress"),
      payload: expect.objectContaining({ order_id: "order-1" }),
      idempotencyKey: "order_stuck:order-1:30",
    });
  });
});
