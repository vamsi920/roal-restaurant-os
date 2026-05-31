import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emitCallReviewNeededNotification,
  emitCateringInquiryNotification,
  emitComplaintCallerNotification,
  emitPostCallFollowUpNotifications,
  emitReservationRequestNotification,
  emitStuckActiveCallNotification,
  emitVoicemailCallbackNotification,
} from "@/lib/notifications/call-follow-up-events";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { defaultNotificationSettings } from "@/lib/notifications/settings";
import {
  NOTIFICATION_EVENT_DESCRIPTIONS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_EVENT_TYPES,
} from "@/lib/notifications/types";
import { shouldSkipProductionOwnerNotification } from "@/lib/notifications/session-guard";
import { notifyStuckActiveCallsForOrganization } from "@/lib/notifications/stuck-active-calls";
import { activeProvidersForSettings } from "@/lib/notifications/providers";
import { emailProvider } from "@/lib/notifications/providers/email";

vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchNotification: vi.fn(),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/notifications/settings", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/notifications/settings")>();
  return {
    ...actual,
    loadNotificationSettings: vi.fn(),
  };
});

vi.mock("@/lib/notifications/operational-events", () => ({
  emitStaffHandoffRequested: vi.fn().mockResolvedValue(true),
}));

import { loadNotificationSettings } from "@/lib/notifications/settings";
import { emitStaffHandoffRequested } from "@/lib/notifications/operational-events";

const REPO = join(import.meta.dirname, "../..");
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const RESTAURANT_ID = "22222222-2222-4222-8222-222222222222";

function restaurantSupabase(name = "Test Bistro") {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: RESTAURANT_ID,
              name,
              organization_id: ORG_ID,
            },
            error: null,
          }),
        }),
      }),
    }),
  };
}

describe("phone follow-up notification types", () => {
  it("includes voicemail, reservation, catering, complaint, review, and stuck call events", () => {
    for (const eventType of [
      "voicemail_callback",
      "reservation_request",
      "catering_inquiry",
      "complaint_caller",
      "call_review_needed",
      "stuck_active_call",
      "staff_handoff_requested",
    ] as const) {
      expect(NOTIFICATION_EVENT_TYPES).toContain(eventType);
      expect(NOTIFICATION_EVENT_LABELS[eventType].length).toBeGreaterThan(3);
      expect(NOTIFICATION_EVENT_DESCRIPTIONS[eventType].length).toBeGreaterThan(10);
    }
  });

  it("defaults enable all phone follow-up events", () => {
    const defaults = defaultNotificationSettings(ORG_ID);
    for (const eventType of [
      "voicemail_callback",
      "reservation_request",
      "catering_inquiry",
      "complaint_caller",
      "call_review_needed",
      "stuck_active_call",
    ] as const) {
      expect(defaults.enabledEvents).toContain(eventType);
    }
  });

  it("migration adds enum values and backfills org settings", () => {
    const sql = readFileSync(
      join(REPO, "supabase/migrations/033_notification_phone_followup_events.sql"),
      "utf8"
    );
    for (const value of [
      "voicemail_callback",
      "reservation_request",
      "catering_inquiry",
      "complaint_caller",
      "call_review_needed",
      "stuck_active_call",
    ]) {
      expect(sql).toContain(`'${value}'`);
    }
    expect(sql).toMatch(/array_agg\(distinct e\)/);
    expect(sql).toMatch(/enabled_events set default array/);
  });
});

describe("harness session guard", () => {
  it("skips production alerts for harness sessions and metadata", () => {
    expect(shouldSkipProductionOwnerNotification("roal-harness-abc")).toBe(true);
    expect(
      shouldSkipProductionOwnerNotification("CA_live_call", {
        is_test_harness: true,
      })
    ).toBe(true);
    expect(shouldSkipProductionOwnerNotification("CA_live_call")).toBe(false);
  });
});

describe("dispatch provider posture", () => {
  it("logs skipped/disabled email states honestly", async () => {
    const settings = {
      ...defaultNotificationSettings(ORG_ID),
      providerMode: "production" as const,
      channels: {
        dev_console: false,
        email: true,
        sms: false,
        webhook: false,
      },
      emailRecipients: ["ops@example.com"],
    };
    const result = await emailProvider.send({
      settings,
      organizationId: ORG_ID,
      restaurantId: RESTAURANT_ID,
      eventType: "voicemail_callback",
      title: "Test",
      body: "Body",
      payload: {},
    });
    expect(result.status).toBe("skipped");
    expect(result.errorMessage).toMatch(/not wired/i);
  });

  it("keeps dev_console as the only active provider in dev mode", () => {
    const channels = activeProvidersForSettings(defaultNotificationSettings(ORG_ID)).map(
      (p) => p.channel
    );
    expect(channels).toEqual(["dev_console"]);
  });
});

describe("phone follow-up emitters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dispatchNotification).mockResolvedValue(true);
  });

  it("emits voicemail callback with phone or missing-number copy", async () => {
    const supabase = restaurantSupabase();

    await emitVoicemailCallbackNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_vm",
      variant: "voicemail",
      transcriptMetadata: {
        analysis: {
          data_collection_results: { callback_phone: "+14155550199" },
        },
      },
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "voicemail_callback",
        body: expect.stringMatching(/Voicemail left.*\+14155550199/i),
        idempotencyKey: `voicemail_callback:${RESTAURANT_ID}:conv_vm`,
      })
    );

    vi.mocked(dispatchNotification).mockClear();

    await emitVoicemailCallbackNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_vm_missing",
      variant: "callback",
      transcriptMetadata: {},
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        body: expect.stringMatching(/Callback number was not captured/i),
      })
    );
  });

  it("reservation request wording is not confirmed", async () => {
    const supabase = restaurantSupabase();

    await emitReservationRequestNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      reservationId: "res-1",
      sessionId: "conv_res",
      customerName: "Priya",
      customerPhone: "+14155550199",
      partySize: 4,
      requestedDate: "Saturday, June 7",
      requestedTime: "7:00 PM",
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "reservation_request",
        body: expect.stringMatching(/not confirmed.*request, not a booked table/is),
      })
    );
  });

  it("skips reservation alerts for harness sessions", async () => {
    const supabase = restaurantSupabase();
    const sent = await emitReservationRequestNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      reservationId: "res-h",
      sessionId: "roal-harness-res",
      customerName: "Test",
      customerPhone: "+14155550199",
      partySize: 2,
      requestedDate: "Friday",
      requestedTime: "6 PM",
    });
    expect(sent).toBe(false);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("uses stable reservation notification idempotency keys", async () => {
    const supabase = restaurantSupabase();

    await emitReservationRequestNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      reservationId: "res-stable",
      sessionId: "conv_res_stable",
      customerName: "Priya",
      customerPhone: "+14155550199",
      partySize: 4,
      requestedDate: "Saturday, June 7",
      requestedTime: "7:00 PM",
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        idempotencyKey:
          "reservation_request:22222222-2222-4222-8222-222222222222:conv_res_stable:res-stable",
      })
    );
  });

  it("routes post-call catering and complaint to dedicated events", async () => {
    const supabase = restaurantSupabase();

    await emitPostCallFollowUpNotifications(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_cat",
      outcome: "no_order",
      webhookEventType: "post_call_transcription",
      transcriptMetadata: {
        catering_requested: true,
        transcript_summary: "Party of 40 next month.",
      },
      priorHandoffReason: null,
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ eventType: "catering_inquiry" })
    );

    vi.clearAllMocks();
    vi.mocked(dispatchNotification).mockResolvedValue(true);

    await emitPostCallFollowUpNotifications(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_bad",
      outcome: "no_order",
      webhookEventType: "post_call_transcription",
      transcriptMetadata: {
        complaint_requested: true,
        transcript_summary: "Wrong order delivered cold.",
      },
      priorHandoffReason: null,
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ eventType: "complaint_caller" })
    );
  });

  it("routes generic handoff to staff_handoff_requested", async () => {
    const supabase = restaurantSupabase();

    await emitPostCallFollowUpNotifications(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_mgr",
      outcome: "no_order",
      webhookEventType: "post_call_transcription",
      transcriptMetadata: { manager_requested: true },
      priorHandoffReason: null,
    });

    expect(emitStaffHandoffRequested).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ reason: "manager_requested" })
    );
  });

  it("emits call review for abandoned calls without handoff", async () => {
    const supabase = restaurantSupabase();

    await emitPostCallFollowUpNotifications(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_abandon",
      outcome: "abandoned",
      webhookEventType: "post_call_transcription",
      transcriptMetadata: {},
      priorHandoffReason: null,
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "call_review_needed",
        idempotencyKey: `call_review_needed:${RESTAURANT_ID}:conv_abandon`,
      })
    );
  });

  it("does not emit post-call alerts for harness sessions", async () => {
    const supabase = restaurantSupabase();

    await emitPostCallFollowUpNotifications(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "roal-harness-post",
      outcome: "abandoned",
      webhookEventType: "post_call_transcription",
      transcriptMetadata: { complaint_requested: true },
      priorHandoffReason: null,
    });

    expect(dispatchNotification).not.toHaveBeenCalled();
    expect(emitStaffHandoffRequested).not.toHaveBeenCalled();
  });

  it("stuck active call uses threshold idempotency once per episode", async () => {
    const supabase = restaurantSupabase();

    await emitStuckActiveCallNotification(supabase as never, {
      organizationId: ORG_ID,
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      sessionId: "CA_stuck",
      startedAt: "2026-05-30T12:00:00.000Z",
      thresholdMinutes: 20,
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "stuck_active_call",
        idempotencyKey: `stuck_active_call:${RESTAURANT_ID}:CA_stuck:20`,
      })
    );
  });
});

describe("notifyStuckActiveCallsForOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadNotificationSettings).mockResolvedValue(
      defaultNotificationSettings(ORG_ID)
    );
    vi.mocked(dispatchNotification).mockResolvedValue(true);
  });

  it("skips harness active calls", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "1",
                        restaurant_id: RESTAURANT_ID,
                        session_id: "roal-harness-live",
                        conversation_id: "roal-harness-live",
                        caller_phone: null,
                        started_at: "2020-01-01T00:00:00.000Z",
                        transcript_metadata: { is_test_harness: true },
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

    const count = await notifyStuckActiveCallsForOrganization(supabase as never, {
      organizationId: ORG_ID,
      restaurantNames: new Map([[RESTAURANT_ID, "Test"]]),
    });

    expect(count).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });
});

describe("tenant-safe payloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dispatchNotification).mockResolvedValue(true);
  });

  it("scopes complaint notification to the loaded restaurant org", async () => {
    const supabase = restaurantSupabase("Scoped Bistro");

    await emitComplaintCallerNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_scope",
      reason: "complaint",
      summary: "Missing items.",
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        organizationId: ORG_ID,
        restaurantId: RESTAURANT_ID,
        restaurantName: "Scoped Bistro",
        payload: expect.objectContaining({ session_id: "conv_scope" }),
      })
    );
  });

  it("returns false when restaurant context cannot be loaded", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };

    const sent = await emitCallReviewNeededNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_missing_rest",
      outcome: "abandoned",
    });

    expect(sent).toBe(false);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });
});

describe("catering and complaint copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dispatchNotification).mockResolvedValue(true);
  });

  it("includes reason and next owner action", async () => {
    const supabase = restaurantSupabase();

    await emitCateringInquiryNotification(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_cater_copy",
      callerPhone: "+14155550199",
      reason: "catering",
      summary: "Office lunch for 25.",
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        body: expect.stringMatching(/Catering inquiry.*Next:/is),
      })
    );
  });
});
