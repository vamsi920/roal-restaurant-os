import { describe, expect, it } from "vitest";
import { buildRestaurantWorkspaceNav } from "@/lib/restaurant-workspace-nav";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_BUILDER_TITLE,
} from "@/lib/dashboard-restaurant-labels";
import {
  draftShowsOnPhoneQueue,
  filterDraftOrdersForRestaurant,
  filterReceiptsForRestaurant,
  kdsConfirmedTicketOrders,
  kdsActiveDraftOrders,
  kdsHonestEmptyOrdersCopy,
  kdsSurfaceExcludesStaffManagementCopy,
  liveCallIndicatorCounts,
  recentOutcomeShowsNoOrderCall,
  shouldShowLiveCallIndicator,
} from "@/lib/live-orders/kds-orders-surface";
import { menuSyncLabelFromSnapshot } from "@/lib/live-orders/readiness-from-profile";
import { menuAutoSyncFromProfile } from "@/lib/voice-agent/menu-auto-sync-display";
import type { CommandCenterCallRow } from "@/lib/command-center/types";
import type { DraftOrderRow } from "@/lib/types";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";
const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function draft(
  partial: Partial<DraftOrderRow> & Pick<DraftOrderRow, "session_id" | "status">
): DraftOrderRow {
  return {
    id: partial.id ?? `draft-${partial.session_id}`,
    restaurant_id: partial.restaurant_id ?? RESTAURANT_ID,
    session_id: partial.session_id,
    status: partial.status,
    items: partial.items ?? [],
    customer_name: partial.customer_name ?? null,
    customer_phone: partial.customer_phone ?? null,
    created_at: partial.created_at ?? "2026-05-30T17:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-05-30T17:00:00.000Z",
    completed_at: partial.completed_at ?? null,
    canceled_at: partial.canceled_at ?? null,
    fulfillment_type: null,
    delivery_address: null,
    delivery_instructions: null,
    accepted_at: null,
    in_progress_at: null,
    ready_at: null,
  };
}

function callRow(
  partial: Partial<CommandCenterCallRow> & Pick<CommandCenterCallRow, "sessionId">
): CommandCenterCallRow {
  return {
    sessionId: partial.sessionId,
    conversationId: partial.sessionId,
    callerPhone: partial.callerPhone ?? "+15550001111",
    status: partial.status ?? "active",
    outcome: partial.outcome ?? "in_progress",
    startedAt: partial.startedAt ?? "2026-05-30T17:00:00.000Z",
    endedAt: partial.endedAt ?? null,
    lastActivityAt: partial.lastActivityAt ?? "2026-05-30T17:00:00.000Z",
    lineCount: 0,
    toolErrorCount: 0,
    handoffSignals: [],
  };
}

describe("KDS orders surface", () => {
  it("shows active draft orders on the phone queue", () => {
    const rows = kdsActiveDraftOrders([
      draft({ session_id: "live", status: "draft" }),
      draft({ session_id: "done", status: "completed" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(draftShowsOnPhoneQueue(rows[0]!)).toBe(true);
  });

  it("shows confirmed kitchen tickets separately from live carts", () => {
    const confirmed = kdsConfirmedTicketOrders([
      draft({ session_id: "new_ticket", status: "new" }),
      draft({ session_id: "live", status: "draft" }),
    ]);
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]?.session_id).toBe("new_ticket");
  });

  it("shows live call indicator when carts or active calls exist", () => {
    expect(
      shouldShowLiveCallIndicator({
        liveCarts: [draft({ session_id: "live", status: "draft" })],
        activeCalls: [],
      })
    ).toBe(true);
    expect(
      liveCallIndicatorCounts({
        liveCarts: [],
        activeCalls: [callRow({ sessionId: "call_only" })],
      })
    ).toMatchObject({ liveCount: 1, supplementalCalls: 1 });
  });

  it("detects recent no-order style outcomes", () => {
    expect(
      recentOutcomeShowsNoOrderCall([
        {
          kind: "unknown",
          sessionId: "s1",
          callerPhone: null,
          headline: "Unknown outcome",
          detail: null,
          occurredAt: "2026-05-30T18:00:00.000Z",
        },
      ])
    ).toBe(true);
  });

  it("excludes foreign-tenant draft and receipt rows", () => {
    expect(
      filterDraftOrdersForRestaurant(
        [
          draft({ session_id: "local", restaurant_id: RESTAURANT_ID, status: "new" }),
          draft({ session_id: "foreign", restaurant_id: REST_B, status: "new" }),
        ],
        RESTAURANT_ID
      )
    ).toHaveLength(1);
    expect(
      filterReceiptsForRestaurant(
        [
          {
            id: "r1",
            restaurant_id: REST_B,
            session_id: "foreign",
            customer_name: null,
            customer_phone: null,
            items: [],
            created_at: "2026-05-30T18:00:00.000Z",
          },
        ],
        RESTAURANT_ID
      )
    ).toHaveLength(0);
  });

  it("uses honest empty copy for the orders dashboard", () => {
    const copy = kdsHonestEmptyOrdersCopy();
    expect(copy.title).toBe("No phone orders yet");
    expect(kdsSurfaceExcludesStaffManagementCopy(copy.body)).toBe(true);
  });

  it("does not use staff-management framing on KDS copy constants", () => {
    expect(kdsSurfaceExcludesStaffManagementCopy(RESTAURANT_LIVE_ORDERS_LABEL)).toBe(
      true
    );
    expect(kdsSurfaceExcludesStaffManagementCopy(RESTAURANT_MENU_BUILDER_TITLE)).toBe(
      true
    );
  });
});

describe("menu builder separation", () => {
  it("keeps orders and menu builder on distinct workspace routes", () => {
    const nav = buildRestaurantWorkspaceNav({ restaurantId: RESTAURANT_ID });
    const orders = nav.find((item) => item.id === "orders");
    const menu = nav.find((item) => item.id === "menu");
    expect(orders?.href).toBe(`/dashboard/restaurants/${RESTAURANT_ID}`);
    expect(menu?.href).toBe(`/dashboard/restaurants/${RESTAURANT_ID}/menu`);
    expect(orders?.label).toBe(RESTAURANT_LIVE_ORDERS_LABEL);
  });

  it("shows menu sync status from profile fields", () => {
    const label = menuSyncLabelFromSnapshot(
      menuAutoSyncFromProfile({
        elevenlabs_agent_id: "agent_1",
        elevenlabs_menu_auto_sync_status: "succeeded",
        elevenlabs_menu_auto_sync_error: null,
        elevenlabs_last_sync_at: "2026-05-30T12:00:00.000Z",
        elevenlabs_last_sync_error: null,
      })
    );
    expect(label).toBe("Menu synced");
  });

  it("KDS readiness strip uses shared launch gate", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const page = readFileSync(
      join(import.meta.dirname, "../..", "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    const strip = readFileSync(
      join(import.meta.dirname, "../..", "components/live-orders/PhoneAgentReadinessStrip.tsx"),
      "utf8"
    );
    expect(page).toContain("PhoneAgentReadinessStrip");
    expect(page).toContain("launchGate={pageData.launchGate}");
    expect(strip).toContain("launchGate.phaseLabel");
    expect(strip).toContain("launchGate.topBlockerLabel");
    expect(strip).toContain("launchGate.primaryAction");
  });
});
