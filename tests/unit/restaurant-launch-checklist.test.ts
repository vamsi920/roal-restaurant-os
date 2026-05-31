import { describe, expect, it } from "vitest";
import {
  areToolsSynced,
  buildRestaurantLaunchChecklist,
  isConversationInitWebhookSet,
  isDedicatedAgentProvisioned,
  isRestaurantProfileLaunchComplete,
} from "@/lib/restaurant-launch/evaluate-checklist";
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
    expect(
      isRestaurantProfileLaunchComplete("Taco House", baseProfile({ phone: null }))
    ).toBe(false);
  });

  it("marks dedicated agent when profile agent is ready", () => {
    expect(isDedicatedAgentProvisioned(baseProfile())).toBe(true);
    expect(
      isDedicatedAgentProvisioned(
        baseProfile({ elevenlabs_provision_status: "pending" })
      )
    ).toBe(false);
  });

  it("detects synced ROAL tools and conversation-init webhook", () => {
    const summary = {
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
    expect(areToolsSynced(summary, null)).toBe(true);
    expect(
      isConversationInitWebhookSet({
        syncSummary: summary,
        phoneWebhookFromAgent: null,
      })
    ).toBe(true);
    expect(
      isConversationInitWebhookSet({
        syncSummary: null,
        phoneWebhookFromAgent: "https://app.test/webhook",
      })
    ).toBe(true);
  });

  it("builds a full ready snapshot", () => {
    const snapshot = buildRestaurantLaunchChecklist({
      restaurantId: "r1",
      restaurantName: "Taco House",
      profile: baseProfile(),
      menuItemCount: 12,
      hoursConfigured: true,
      testCallPassed: true,
      syncSummary: {
        tools: [
          { name: "get_menu_items", id: "t1", op: "updated" },
          { name: "get_restaurant_info", id: "t2", op: "updated" },
          { name: "get_caller_history", id: "t3", op: "updated" },
          { name: "submit_reservation_request", id: "t4", op: "updated" },
          { name: "sync_draft_order", id: "t5", op: "updated" },
          { name: "finalize_order", id: "t6", op: "updated" },
          { name: "get_order_status", id: "t7", op: "updated" },
        ],
        tool_ids_on_agent: ["t1", "t2", "t3", "t4", "t5", "t6", "t7"],
        restaurant_placeholders_updated: true,
        first_message_updated: true,
        restaurant_tools_baked: true,
        knowledge_base_doc_attached: true,
        phone_personalization_webhook: "https://app.test/hook",
      },
      lastSyncError: null,
      phoneWebhookFromAgent: null,
    });
    expect(snapshot.isLaunchReady).toBe(true);
    expect(snapshot.completedCount).toBe(7);
    expect(snapshot.items.every((i) => i.status === "ok")).toBe(true);
  });
});
