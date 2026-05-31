import { describe, expect, it, vi } from "vitest";
import { loadLiveOrdersPageData } from "@/lib/live-orders/load-live-orders-page";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";
const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const commandCenterSnapshot = {
  rangeSince: "2026-05-30T00:00:00.000Z",
  rangeUntil: "2026-05-30T23:59:59.000Z",
  activeCalls: [],
  failedCalls: [],
  handoffCalls: [],
  unknownCalls: [],
};

const { mockLoadCommandCenter } = vi.hoisted(() => ({
  mockLoadCommandCenter: vi.fn(async () => commandCenterSnapshot),
}));

vi.mock("@/lib/command-center/load-command-center", () => ({
  loadRestaurantCommandCenter: mockLoadCommandCenter,
}));

vi.mock("@/lib/live-orders/call-evidence", () => ({
  loadOrderCallEvidenceBySession: vi.fn(async () => ({})),
}));

vi.mock("@/lib/restaurant-launch/load-checklist", () => ({
  loadRestaurantLaunchGate: vi.fn(async (_supabase, input) => ({
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    phase: "blocked" as const,
    phaseLabel: "Blocked",
    isLiveReady: false,
    topBlockerLabel: null,
    topBlockerDetail: null,
    primaryAction: { label: "Setup", href: "#" },
    checklist: {
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      items: [],
      completedCount: 0,
      totalCount: 8,
      isLaunchReady: false,
    },
  })),
}));

vi.mock("@/lib/live-orders/readiness-from-profile", () => ({
  phoneAgentReadinessFromProfile: vi.fn(() => ({
    agentLinked: false,
    connectionStatus: "disconnected",
    connectionLabel: "Not connected",
    menuAutoSync: {
      agentLinked: false,
      status: null,
      error: null,
      lastSyncedAt: null,
    },
    menuSyncLabel: "Link agent first",
    envReady: true,
  })),
}));

function mockOrdersDb(input: {
  drafts: Record<string, unknown>[];
  receipts: Record<string, unknown>[];
}) {
  return {
    from(table: string) {
      if (table === "draft_orders") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: input.drafts, error: null }),
            }),
          }),
        };
      }
      if (table === "phone_order_receipts") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: input.receipts, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as never;
}

describe("loadLiveOrdersPageData", () => {
  it("scopes draft and receipt bootstrap data to the restaurant", async () => {
    const data = await loadLiveOrdersPageData(
      mockOrdersDb({
        drafts: [
          {
            id: "d1",
            restaurant_id: RESTAURANT_ID,
            session_id: "local",
            status: "new",
            items: [],
          },
          {
            id: "d2",
            restaurant_id: REST_B,
            session_id: "foreign",
            status: "new",
            items: [],
          },
        ],
        receipts: [
          {
            id: "r1",
            restaurant_id: REST_B,
            session_id: "foreign",
            items: [],
            created_at: "2026-05-30T18:00:00.000Z",
          },
        ],
      }),
      {
        restaurantId: RESTAURANT_ID,
        restaurantName: "Test",
        profile: {
          elevenlabs_agent_id: null,
          elevenlabs_last_sync_at: null,
          elevenlabs_last_sync_error: null,
          elevenlabs_menu_auto_sync_status: null,
          elevenlabs_menu_auto_sync_error: null,
        },
      }
    );

    expect(data.initialDraftOrders).toHaveLength(1);
    expect(data.initialDraftOrders[0]?.session_id).toBe("local");
    expect(data.initialReceipts).toHaveLength(0);
    expect(data.outcomesEmpty).toBe(true);
  });
});
