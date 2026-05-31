import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env.public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  }),
}));
import { buildRecentPhoneOutcomes } from "@/lib/live-orders/build-recent-outcomes";
import {
  kdsHonestEmptyOrdersCopy,
  shouldShowLiveCallIndicator,
} from "@/lib/live-orders/kds-orders-surface";
import {
  deriveProfileConnectionStatus,
  menuSyncLabelFromSnapshot,
  phoneAgentReadinessFromProfile,
} from "@/lib/live-orders/readiness-from-profile";
import {
  buildRestaurantLaunchChecklist,
  evaluateLaunchGate,
} from "@/lib/restaurant-launch/evaluate-checklist";
import type { CommandCenterCallRow } from "@/lib/command-center/types";
import type { DraftOrderRow } from "@/lib/types";

function callRow(
  partial: Partial<CommandCenterCallRow> & Pick<CommandCenterCallRow, "sessionId">
): CommandCenterCallRow {
  return {
    conversationId: partial.sessionId,
    callerPhone: partial.callerPhone ?? "+15550001111",
    status: partial.status ?? "ended",
    outcome: partial.outcome ?? "unknown",
    startedAt: partial.startedAt ?? "2026-05-30T17:00:00.000Z",
    endedAt: partial.endedAt ?? "2026-05-30T17:10:00.000Z",
    lastActivityAt: partial.lastActivityAt ?? "2026-05-30T17:10:00.000Z",
    lineCount: partial.lineCount ?? 0,
    toolErrorCount: partial.toolErrorCount ?? 0,
    handoffSignals: partial.handoffSignals ?? [],
    sessionId: partial.sessionId,
  };
}

describe("phoneAgentReadinessFromProfile", () => {
  it("disconnected when no agent linked", () => {
    const r = phoneAgentReadinessFromProfile({
      elevenlabs_agent_id: null,
      elevenlabs_last_sync_at: null,
      elevenlabs_last_sync_error: null,
      elevenlabs_menu_auto_sync_status: null,
      elevenlabs_menu_auto_sync_error: null,
    });
    expect(deriveProfileConnectionStatus({
      elevenlabs_agent_id: null,
      elevenlabs_last_sync_at: null,
      elevenlabs_last_sync_error: null,
    })).toBe("disconnected");
    expect(r.connectionLabel).toBe("Not connected");
  });

  it("connected when agent synced without error", () => {
    const r = phoneAgentReadinessFromProfile({
      elevenlabs_agent_id: "agent_1",
      elevenlabs_last_sync_at: "2026-05-30T12:00:00.000Z",
      elevenlabs_last_sync_error: null,
      elevenlabs_menu_auto_sync_status: "succeeded",
      elevenlabs_menu_auto_sync_error: null,
    });
    expect(r.connectionStatus).toBe("connected");
    expect(menuSyncLabelFromSnapshot(r.menuAutoSync)).toBe("Menu synced");
  });
});

describe("live orders launch gate wiring", () => {
  it("orders page uses shared launch gate strip", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const page = readFileSync(
      join(import.meta.dirname, "../..", "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    const loader = readFileSync(
      join(import.meta.dirname, "../..", "lib/live-orders/load-live-orders-page.ts"),
      "utf8"
    );
    expect(page).toContain("PhoneAgentReadinessStrip");
    expect(page).toContain("launchGate={pageData.launchGate}");
    expect(loader).toContain("loadRestaurantLaunchGate");
  });

  it("launch gate phase matches checklist truth", () => {
    const checklist = buildRestaurantLaunchChecklist({
      restaurantId: "r1",
      restaurantName: "Taco House",
      profile: null,
      menuItemCount: 0,
      hoursConfigured: false,
      testCallPassed: false,
      syncSummary: null,
      lastSyncError: null,
      phoneWebhookFromAgent: null,
      serverEnvReady: false,
      serverEnvDetail: "Server config incomplete",
    });
    const gate = evaluateLaunchGate(checklist);
    expect(gate.phase).toBe("blocked");
    expect(gate.isLiveReady).toBe(false);
  });
});

describe("buildRecentPhoneOutcomes", () => {
  it("merges and sorts outcomes by time", () => {
    const outcomes = buildRecentPhoneOutcomes({
      failed: [
        callRow({
          sessionId: "s_fail",
          lastActivityAt: "2026-05-30T16:00:00.000Z",
          outcome: "canceled",
        }),
      ],
      handoff: [
        callRow({
          sessionId: "s_handoff",
          lastActivityAt: "2026-05-30T18:00:00.000Z",
          handoffSignals: ["handoff_requested"],
        }),
      ],
      unknown: [],
      limit: 5,
    });
    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]?.kind).toBe("handoff");
    expect(outcomes[1]?.kind).toBe("failed");
  });

  it("returns empty list when no outcome rows", () => {
    expect(
      buildRecentPhoneOutcomes({ failed: [], handoff: [], unknown: [] })
    ).toEqual([]);
  });
});

describe("KDS live orders page helpers", () => {
  it("shows live call indicator for active draft carts", () => {
    const order: DraftOrderRow = {
      id: "d1",
      restaurant_id: "11111111-1111-4111-8111-111111111111",
      session_id: "sess",
      status: "draft",
      items: [{ name: "Burger", quantity: 1, customizations: [] }],
      customer_name: null,
      customer_phone: null,
      created_at: "2026-05-30T17:00:00.000Z",
      updated_at: "2026-05-30T17:00:00.000Z",
      completed_at: null,
      canceled_at: null,
      fulfillment_type: null,
      delivery_address: null,
      delivery_instructions: null,
      accepted_at: null,
      in_progress_at: null,
      ready_at: null,
    };
    expect(
      shouldShowLiveCallIndicator({ liveCarts: [order], activeCalls: [] })
    ).toBe(true);
  });

  it("uses honest empty-state copy", () => {
    expect(kdsHonestEmptyOrdersCopy().title).toMatch(/No phone orders/i);
  });
});
