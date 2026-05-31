import { describe, expect, it } from "vitest";
import {
  buildRestaurantCardStats,
  lastOrderAtByRestaurant,
  maxIsoTimestamp,
  resolveRestaurantSyncError,
} from "@/lib/restaurant-list/card-stats";
import {
  countActiveCallsByRestaurant,
  countOpenFollowUpsByRestaurant,
  lastSuccessfulOrderAtByRestaurant,
  successfulOrdersInPeriodByRestaurant,
} from "@/lib/restaurant-list/operational-metrics";
import { resolveLocationNextBestAction } from "@/lib/restaurant-list/next-best-action";
import { buildPortfolioSummary } from "@/lib/restaurant-list/portfolio-summary";
import {
  buildRestaurantLaunchGate,
  isRestaurantProfileLaunchComplete,
} from "@/lib/restaurant-launch/evaluate-checklist";
import type { RestaurantCardStats, RestaurantListProfile } from "@/lib/restaurant-list/types";
import type { RestaurantProfile } from "@/lib/types";

const readySummary = {
  tools: [
    { name: "get_menu_items", id: "t1", op: "updated" as const },
    { name: "get_restaurant_info", id: "t2", op: "updated" as const },
    { name: "get_caller_history", id: "t3", op: "updated" as const },
    { name: "submit_reservation_request", id: "t4", op: "updated" as const },
    { name: "sync_draft_order", id: "t5", op: "updated" as const },
    { name: "finalize_order", id: "t6", op: "updated" as const },
    { name: "get_order_status", id: "t7", op: "updated" as const },
  ],
  tool_ids_on_agent: ["t1", "t2", "t3", "t4", "t5", "t6", "t7"],
  restaurant_placeholders_updated: true,
  first_message_updated: true,
  restaurant_tools_baked: true,
  knowledge_base_doc_attached: true,
  phone_personalization_webhook: "https://app.test/api/integrations/elevenlabs/conversation-init",
};

function readyLaunchGate(restaurantId: string) {
  const profile = {
    restaurant_id: restaurantId,
    phone: "+15551234567",
    timezone: "America/New_York",
    address_line1: "1 Main St",
    address_line2: null,
    city: "NYC",
    state: "NY",
    postal_code: "10001",
    country: "US",
    allows_pickup: true,
    allows_delivery: false,
    elevenlabs_agent_id: "agent-1",
    elevenlabs_provision_status: "ready",
    elevenlabs_provision_error: null,
    elevenlabs_last_sync_error: null,
    elevenlabs_last_sync_summary: readySummary,
  } as RestaurantProfile;

  return buildRestaurantLaunchGate({
    restaurantId,
    restaurantName: "Taco House",
    profile,
    menuItemCount: 14,
    hoursConfigured: true,
    testCallPassed: true,
    testCallDetail: "Test call step marked complete.",
    syncSummary: readySummary,
    lastSyncError: null,
    phoneWebhookFromAgent: null,
    serverEnvReady: true,
    serverEnvDetail: null,
    templateAgentId: "template-shared",
  });
}

const readyProfile: RestaurantListProfile = {
  restaurant_id: "r1",
  phone: "+15551234567",
  timezone: "America/New_York",
  address_line1: "1 Main St",
  allows_pickup: true,
  allows_delivery: false,
  elevenlabs_agent_id: "agent-1",
  elevenlabs_provision_status: "ready",
  elevenlabs_provision_error: null,
  elevenlabs_last_sync_error: null,
  elevenlabs_last_sync_summary: readySummary,
  elevenlabs_menu_auto_sync_status: "succeeded",
  elevenlabs_menu_auto_sync_error: null,
};

const elevenlabsOnlyProfile: RestaurantListProfile = {
  restaurant_id: "r1",
  phone: null,
  timezone: null,
  address_line1: null,
  allows_pickup: false,
  allows_delivery: false,
  elevenlabs_agent_id: "agent-1",
  elevenlabs_provision_status: "ready",
  elevenlabs_provision_error: null,
  elevenlabs_last_sync_error: null,
  elevenlabs_last_sync_summary: readySummary,
};

describe("restaurant list card stats", () => {
  it("prefers menu sync error over voice sync error", () => {
    const err = resolveRestaurantSyncError({
      restaurant_id: "r1",
      phone: null,
      timezone: null,
      address_line1: null,
      allows_pickup: false,
      allows_delivery: false,
      elevenlabs_agent_id: "a1",
      elevenlabs_provision_status: "ready",
      elevenlabs_provision_error: null,
      elevenlabs_menu_auto_sync_status: "failed",
      elevenlabs_menu_auto_sync_error: "Menu push failed",
      elevenlabs_last_sync_error: "Voice sync failed",
    });
    expect(err).toBe("Menu push failed");
  });

  it("picks latest timestamp across drafts and receipts", () => {
    const map = lastOrderAtByRestaurant(
      [
        {
          restaurant_id: "r1",
          updated_at: "2026-05-29T10:00:00.000Z",
        },
      ],
      [
        {
          restaurant_id: "r1",
          created_at: "2026-05-30T12:00:00.000Z",
        },
      ]
    );
    expect(map.get("r1")).toBe("2026-05-30T12:00:00.000Z");
  });

  it("builds stats from real profile and operational maps", () => {
    const launchGates = new Map([["r1", readyLaunchGate("r1")]]);
    const stats = buildRestaurantCardStats({
      restaurantIds: ["r1"],
      profilesById: { r1: readyProfile },
      menuItemCounts: new Map([["r1", 14]]),
      lastOrderAt: new Map([["r1", "2026-05-30T15:00:00.000Z"]]),
      activeCallCounts: new Map([["r1", 2]]),
      openFollowUpCounts: new Map([["r1", 1]]),
      openReservationCounts: new Map([["r1", 3]]),
      successfulOrdersInPeriod: new Map([["r1", 5]]),
      hoursConfigured: new Map([["r1", true]]),
      launchGates,
    });
    expect(stats.r1).toMatchObject({
      restaurantId: "r1",
      agentLinked: true,
      voiceProvisionState: "ready",
      menuItemCount: 14,
      activeCallCount: 2,
      openFollowUpCount: 1,
      openReservationCount: 3,
      successfulOrdersInPeriod: 5,
      readyForCalls: true,
      needsSetupAttention: false,
    });
    expect(stats.r1?.nextBestAction.label).toBe("Review live calls");
  });

  it("marks location blocked when launch gate is not live-ready", () => {
    const stats = buildRestaurantCardStats({
      restaurantIds: ["r1"],
      profilesById: { r1: readyProfile },
      menuItemCounts: new Map([["r1", 14]]),
      lastOrderAt: new Map(),
      hoursConfigured: new Map([["r1", true]]),
    });
    expect(stats.r1?.readyForCalls).toBe(false);
    expect(stats.r1?.needsSetupAttention).toBe(true);
  });

  it("aligns readyForCalls with launch gate isLiveReady", () => {
    const gate = readyLaunchGate("r1");
    const stats = buildRestaurantCardStats({
      restaurantIds: ["r1"],
      profilesById: { r1: readyProfile },
      menuItemCounts: new Map([["r1", 14]]),
      lastOrderAt: new Map(),
      hoursConfigured: new Map([["r1", true]]),
      launchGates: new Map([["r1", gate]]),
    });
    expect(stats.r1?.readyForCalls).toBe(gate.isLiveReady);
    expect(stats.r1?.needsSetupAttention).toBe(!gate.isLiveReady);
  });

  it("requires list profile basics for launch profile completeness", () => {
    expect(
      isRestaurantProfileLaunchComplete(
        "Taco House",
        elevenlabsOnlyProfile as RestaurantProfile
      )
    ).toBe(false);
    expect(
      isRestaurantProfileLaunchComplete(
        "Taco House",
        readyProfile as RestaurantProfile
      )
    ).toBe(true);
  });

  it("builds live-ready gate from complete list profile shape", () => {
    const gate = buildRestaurantLaunchGate({
      restaurantId: "r1",
      restaurantName: "Taco House",
      profile: readyProfile as RestaurantProfile,
      menuItemCount: 14,
      hoursConfigured: true,
      testCallPassed: true,
      testCallDetail: "Test call step marked complete.",
      syncSummary: readySummary,
      lastSyncError: null,
      phoneWebhookFromAgent: null,
      serverEnvReady: true,
      serverEnvDetail: null,
      templateAgentId: "template-shared",
    });
    expect(gate.isLiveReady).toBe(true);
    expect(gate.phase).toBe("ready");
  });

  it("maxIsoTimestamp keeps the newer value", () => {
    expect(
      maxIsoTimestamp("2026-05-01T00:00:00.000Z", "2026-05-02T00:00:00.000Z")
    ).toBe("2026-05-02T00:00:00.000Z");
  });
});

describe("operational metrics harness exclusion", () => {
  const periodSince = "2026-05-30T00:00:00.000Z";

  it("excludes harness sessions from successful orders in period", () => {
    const counts = successfulOrdersInPeriodByRestaurant(
      [
        {
          restaurant_id: "r1",
          session_id: "conv-live",
          items: [{ name: "Burger", quantity: 1 }],
          created_at: "2026-05-30T18:00:00.000Z",
        },
        {
          restaurant_id: "r1",
          session_id: "roal-harness-test",
          items: [{ name: "Fake", quantity: 1 }],
          created_at: "2026-05-30T19:00:00.000Z",
        },
      ],
      [],
      periodSince
    );
    expect(counts.get("r1")).toBe(1);
  });

  it("excludes harness sessions from follow-up counts", () => {
    const sinceMs = new Date("2026-05-29T00:00:00.000Z").getTime();
    const counts = countOpenFollowUpsByRestaurant(
      [
        {
          restaurant_id: "r1",
          session_id: "conv_vm",
          status: "ended",
          outcome: "no_order",
          transcript_metadata: { voicemail_detected: true },
          started_at: "2026-05-30T17:00:00.000Z",
          ended_at: "2026-05-30T17:05:00.000Z",
        },
        {
          restaurant_id: "r1",
          session_id: "roal-harness-vm",
          status: "ended",
          outcome: "no_order",
          transcript_metadata: { voicemail_detected: true },
          started_at: "2026-05-30T17:10:00.000Z",
          ended_at: "2026-05-30T17:15:00.000Z",
        },
      ],
      sinceMs
    );
    expect(counts.get("r1")).toBe(1);
  });

  it("counts active calls without harness sessions", () => {
    const counts = countActiveCallsByRestaurant([
      {
        restaurant_id: "r1",
        session_id: "conv_active",
        status: "active",
        outcome: "unknown",
        transcript_metadata: {},
        started_at: "2026-05-30T17:00:00.000Z",
        ended_at: null,
      },
      {
        restaurant_id: "r1",
        session_id: "roal-harness-active",
        status: "active",
        outcome: "unknown",
        transcript_metadata: {},
        started_at: "2026-05-30T17:00:00.000Z",
        ended_at: null,
      },
    ]);
    expect(counts.get("r1")).toBe(1);
  });

  it("uses billable receipts for last successful order only", () => {
    const map = lastSuccessfulOrderAtByRestaurant(
      [
        {
          restaurant_id: "r1",
          session_id: "roal-harness-x",
          items: [{ name: "X", quantity: 1 }],
          created_at: "2026-05-31T00:00:00.000Z",
        },
        {
          restaurant_id: "r1",
          session_id: "conv_real",
          items: [{ name: "Burger", quantity: 1 }],
          created_at: "2026-05-30T12:00:00.000Z",
        },
      ],
      []
    );
    expect(map.get("r1")).toBe("2026-05-30T12:00:00.000Z");
  });
});

describe("next best action priority", () => {
  it("prioritizes voice setup before live calls", () => {
    const action = resolveLocationNextBestAction({
      restaurantId: "r1",
      voiceProvisionState: "not_started",
      menuSyncPhase: "idle",
      menuItemCount: 10,
      syncError: null,
      activeCallCount: 3,
      openFollowUpCount: 0,
      openReservationCount: 0,
      hoursConfigured: true,
    });
    expect(action.label).toBe("Finish voice agent setup");
    expect(action.href).toContain("/agent");
  });

  it("routes to follow-ups when operational work is open", () => {
    const action = resolveLocationNextBestAction({
      restaurantId: "r1",
      voiceProvisionState: "ready",
      menuSyncPhase: "succeeded",
      menuItemCount: 12,
      syncError: null,
      activeCallCount: 0,
      openFollowUpCount: 2,
      openReservationCount: 1,
      hoursConfigured: true,
    });
    expect(action.label).toMatch(/follow-ups and reservations/i);
    expect(action.href).toContain("/calls");
  });

  it("defaults to orders dashboard when ready", () => {
    const action = resolveLocationNextBestAction({
      restaurantId: "r1",
      voiceProvisionState: "ready",
      menuSyncPhase: "succeeded",
      menuItemCount: 8,
      syncError: null,
      activeCallCount: 0,
      openFollowUpCount: 0,
      openReservationCount: 0,
      hoursConfigured: true,
    });
    expect(action.label).toBe("Open orders dashboard");
  });
});

describe("portfolio summary", () => {
  it("aggregates only provided restaurant stats", () => {
    const base: RestaurantCardStats = {
      restaurantId: "r1",
      agentLinked: true,
      voiceProvisionState: "ready",
      menuSyncPhase: "succeeded",
      menuItemCount: 5,
      activeCallCount: 1,
      openFollowUpCount: 2,
      openReservationCount: 1,
      successfulOrdersInPeriod: 3,
      lastOrderAt: null,
      syncError: null,
      readyForCalls: true,
      needsSetupAttention: false,
      nextBestAction: { label: "Open orders dashboard", href: "/r1" },
    };
    const summary = buildPortfolioSummary({
      r1: base,
      r2: {
        ...base,
        restaurantId: "r2",
        readyForCalls: false,
        needsSetupAttention: true,
        activeCallCount: 0,
        openFollowUpCount: 0,
        openReservationCount: 0,
        successfulOrdersInPeriod: 0,
      },
    });
    expect(summary).toEqual({
      totalLocations: 2,
      locationsReadyForCalls: 1,
      activeCallsNow: 1,
      successfulOrdersInPeriod: 3,
      openFollowUps: 2,
      openReservationRequests: 1,
      locationsNeedingAttention: 1,
    });
  });
});
