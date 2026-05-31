import { describe, expect, it, vi } from "vitest";
import {
  areToolsSynced,
  buildRestaurantLaunchChecklist,
  buildRestaurantLaunchGate,
  evaluateLaunchGate,
  isConversationInitWebhookSet,
  isDedicatedAgentProvisioned,
  isRestaurantProfileLaunchComplete,
} from "@/lib/restaurant-launch/evaluate-checklist";
import {
  evaluateServerLaunchEnvReady,
  evaluateTestCallProof,
  isSharedTemplateAgentLinked,
} from "@/lib/restaurant-launch/server-env";
import type { RestaurantProfile } from "@/lib/types";

function baseProfile(
  overrides: Partial<RestaurantProfile> = {}
): RestaurantProfile {
  return {
    restaurant_id: "r1",
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
    elevenlabs_last_sync_summary: null,
    elevenlabs_menu_auto_sync_status: null,
    elevenlabs_menu_auto_sync_error: null,
    elevenlabs_menu_auto_synced_at: null,
    manager_phone: null,
    manager_email: null,
    catering_contact_phone: null,
    catering_contact_email: null,
    complaint_contact_phone: null,
    complaint_contact_email: null,
    unavailable_item_behavior: "offer_alternative",
    closed_hours_message: null,
    ...overrides,
  } as RestaurantProfile;
}

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

function readyInput() {
  return {
    restaurantId: "r1",
    restaurantName: "Taco House",
    profile: baseProfile({
      elevenlabs_last_sync_summary: readySummary,
    }),
    menuItemCount: 12,
    hoursConfigured: true,
    testCallPassed: true,
    testCallDetail: "Test call step marked complete.",
    syncSummary: readySummary,
    lastSyncError: null,
    phoneWebhookFromAgent: null,
    serverEnvReady: true,
    serverEnvDetail: null,
    templateAgentId: "template-shared",
  };
}

describe("restaurant launch checklist", () => {
  it("requires core profile fields and a service mode", () => {
    expect(
      isRestaurantProfileLaunchComplete("Taco House", baseProfile())
    ).toBe(true);
    expect(
      isRestaurantProfileLaunchComplete(
        "Taco House",
        baseProfile({ allows_pickup: false, allows_delivery: false })
      )
    ).toBe(false);
  });

  it("blocks shared template agent as dedicated agent", () => {
    expect(
      isDedicatedAgentProvisioned(
        baseProfile({ elevenlabs_agent_id: "template-shared" }),
        "template-shared"
      )
    ).toBe(false);
    expect(isSharedTemplateAgentLinked("template-shared", "template-shared")).toBe(
      true
    );
  });

  it("detects synced ROAL tools and conversation-init webhook", () => {
    expect(areToolsSynced(readySummary, null)).toBe(true);
    expect(
      isConversationInitWebhookSet({
        syncSummary: readySummary,
        phoneWebhookFromAgent: null,
      })
    ).toBe(true);
  });

  it("marks server env missing as blocked launch gate", () => {
    const gate = buildRestaurantLaunchGate({
      ...readyInput(),
      serverEnvReady: false,
      serverEnvDetail: "Server config incomplete",
    });
    expect(gate.phase).toBe("blocked");
    expect(gate.isLiveReady).toBe(false);
    expect(gate.topBlockerLabel).toMatch(/Server environment/i);
  });

  it("does not count harness-only receipts as test call proof", () => {
    const proof = evaluateTestCallProof({
      onboardingTestCallCompleted: false,
      billableReceiptCount: 0,
    });
    expect(proof.passed).toBe(false);
  });

  it("accepts onboarding test-call step without production receipt", () => {
    const proof = evaluateTestCallProof({
      onboardingTestCallCompleted: true,
      billableReceiptCount: 0,
    });
    expect(proof.passed).toBe(true);
  });

  it("builds a full ready launch gate", () => {
    const gate = buildRestaurantLaunchGate(readyInput());
    expect(gate.isLiveReady).toBe(true);
    expect(gate.phase).toBe("ready");
    expect(gate.phaseLabel).toBe("Ready for live calls");
    expect(gate.checklist.completedCount).toBe(8);
    expect(gate.checklist.items.every((i) => i.status === "ok")).toBe(true);
  });

  it("evaluateLaunchGate surfaces almost ready when only test call missing", () => {
    const checklist = buildRestaurantLaunchChecklist({
      ...readyInput(),
      testCallPassed: false,
    });
    const gate = evaluateLaunchGate(checklist);
    expect(gate.phase).toBe("almost_ready");
    expect(gate.topBlockerLabel).toMatch(/Test call/i);
  });
});

describe("evaluateServerLaunchEnvReady", () => {
  it("reports env readiness from server secret rows", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key-long-enough");
    vi.stubEnv("ELEVENLABS_API_KEY", "el-key");
    vi.stubEnv("AGENT_TOOL_SIGNING_SECRET", "signing-secret");

    const result = evaluateServerLaunchEnvReady();
    expect(result.ready).toBe(true);

    vi.unstubAllEnvs();
  });
});
