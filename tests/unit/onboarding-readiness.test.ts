import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateOnboardingReadiness } from "@/lib/onboarding/readiness";
import { isOnboardingStepNavDisabled } from "@/lib/onboarding/nav";
import type { RestaurantProfile } from "@/lib/types";

const REPO = join(import.meta.dirname, "../..");

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
    elevenlabs_last_sync_summary: {
      tools: [
        { name: "get_menu_items", id: "t1", op: "updated" },
        { name: "get_restaurant_info", id: "t2", op: "updated" },
        { name: "get_caller_history", id: "t3", op: "updated" },
        { name: "submit_reservation_request", id: "t4", op: "updated" },
        { name: "sync_draft_order", id: "t5", op: "updated" },
        { name: "finalize_order", id: "t6", op: "updated" },
        { name: "get_order_status", id: "t7", op: "updated" },
      ],
      tool_ids_on_agent: [],
      restaurant_placeholders_updated: true,
      first_message_updated: true,
      restaurant_tools_baked: true,
      knowledge_base_doc_attached: true,
      phone_personalization_webhook: "https://app.example/api/init",
    },
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

describe("evaluateOnboardingReadiness", () => {
  const readyInput = {
    restaurantId: "r1",
    restaurantName: "Taco House",
    profile: baseProfile(),
    menuItemCount: 12,
    hoursConfigured: true,
    testCallPassed: true,
    serverEnvReady: true,
    templateAgentId: "template-agent",
  };

  it("reports ready only when launch gate is fully satisfied", () => {
    const ready = evaluateOnboardingReadiness(readyInput);
    expect(ready.isCoreReady).toBe(true);
    expect(ready.isPhoneAgentReady).toBe(true);
    expect(ready.isLiveReady).toBe(true);
    expect(ready.primaryState).toBe("ready");
    expect(ready.blockers).toHaveLength(0);
  });

  it("blocks on missing basics", () => {
    const snap = evaluateOnboardingReadiness({
      ...readyInput,
      profile: baseProfile({ phone: null }),
    });
    expect(snap.primaryState).toBe("missing_basics");
    expect(snap.isCoreReady).toBe(false);
  });

  it("blocks on missing hours", () => {
    const snap = evaluateOnboardingReadiness({
      ...readyInput,
      hoursConfigured: false,
    });
    expect(snap.primaryState).toBe("missing_hours");
    expect(snap.blockers).toContain("missing_hours");
  });

  it("blocks on missing menu", () => {
    const snap = evaluateOnboardingReadiness({
      ...readyInput,
      menuItemCount: 0,
    });
    expect(snap.primaryState).toBe("missing_menu");
  });

  it("blocks on agent not synced", () => {
    const snap = evaluateOnboardingReadiness({
      ...readyInput,
      profile: baseProfile({
        elevenlabs_last_sync_error: "Sync failed",
        elevenlabs_last_sync_summary: null,
      }),
    });
    expect(snap.primaryState).toBe("agent_not_synced");
    expect(snap.isCoreReady).toBe(false);
  });

  it("blocks on phone forwarding when core is ready", () => {
    const snap = evaluateOnboardingReadiness({
      ...readyInput,
      profile: baseProfile({
        elevenlabs_last_sync_summary: {
          tools: [
            { name: "get_menu_items", id: "t1", op: "updated" },
            { name: "get_restaurant_info", id: "t2", op: "updated" },
            { name: "get_caller_history", id: "t3", op: "updated" },
            { name: "submit_reservation_request", id: "t4", op: "updated" },
            { name: "sync_draft_order", id: "t5", op: "updated" },
            { name: "finalize_order", id: "t6", op: "updated" },
            { name: "get_order_status", id: "t7", op: "updated" },
          ],
          tool_ids_on_agent: [],
          restaurant_placeholders_updated: true,
          first_message_updated: true,
          restaurant_tools_baked: true,
          knowledge_base_doc_attached: true,
          phone_personalization_webhook: null,
        },
      }),
    });
    expect(snap.isCoreReady).toBe(true);
    expect(snap.isPhoneAgentReady).toBe(false);
    expect(snap.primaryState).toBe("phone_not_connected");
  });

  it("blocks on server config incomplete", () => {
    const snap = evaluateOnboardingReadiness({
      ...readyInput,
      serverEnvReady: false,
      serverEnvDetail: "Server config incomplete",
    });
    expect(snap.primaryState).toBe("server_config_incomplete");
    expect(snap.isLiveReady).toBe(false);
  });

  it("blocks on missing test call proof", () => {
    const snap = evaluateOnboardingReadiness({
      ...readyInput,
      testCallPassed: false,
    });
    expect(snap.primaryState).toBe("test_call_needed");
    expect(snap.isLiveReady).toBe(false);
  });

  it("does not use fake demo data labels", () => {
    const snap = evaluateOnboardingReadiness({
      restaurantId: "r1",
      restaurantName: "Taco House",
      profile: null,
      menuItemCount: 0,
      hoursConfigured: false,
      serverEnvReady: false,
      testCallPassed: false,
    });
    expect(JSON.stringify(snap)).not.toMatch(/demo|lorem|fake data|fabricat|MOCK_/i);
  });
});

describe("onboarding wizard wiring (pass 67)", () => {
  it("blocks voice agent nav until menu and hours exist", () => {
    const readiness = evaluateOnboardingReadiness({
      restaurantId: "r1",
      restaurantName: "Taco House",
      profile: baseProfile(),
      menuItemCount: 0,
      hoursConfigured: false,
      serverEnvReady: true,
      testCallPassed: false,
      templateAgentId: "template-agent",
    });
    expect(
      isOnboardingStepNavDisabled("voice_agent", {
        orgId: "o1",
        restaurantId: "r1",
        resumeStep: "menu_import",
        stepStatus: () => "pending",
        readiness,
        menuItemCount: 0,
      })
    ).toBe(true);
  });

  it("new users get restaurant create/list paths", () => {
    const wizard = readFileSync(
      join(REPO, "components/onboarding/onboarding-wizard.tsx"),
      "utf8"
    );
    expect(wizard).toContain("/dashboard/restaurants");
    expect(wizard).toContain("Create a location");
    expect(wizard).toContain("createRestaurantWizardAction");
  });

  it("profile step covers basics, hours link, and phone forwarding copy", () => {
    const wizard = readFileSync(
      join(REPO, "components/onboarding/onboarding-wizard.tsx"),
      "utf8"
    );
    expect(wizard).toContain("hoursConfigured");
    expect(wizard).toContain("Forward your");
    expect(wizard).toContain("saveRestaurantProfileAction");
  });

  it("menu step leads to review before agent sync", () => {
    const wizard = readFileSync(
      join(REPO, "components/onboarding/onboarding-wizard.tsx"),
      "utf8"
    );
    expect(wizard).toContain("Review and edit menu");
    expect(wizard).toContain("demo menu is loaded");
    expect(wizard).toContain("completeMenuImportStepAction");
  });

  it("voice agent step uses real sync path and shows sync status", () => {
    const voice = readFileSync(
      join(REPO, "components/onboarding/onboarding-voice-agent-step.tsx"),
      "utf8"
    );
    expect(voice).toContain("syncRestaurantVoiceAgentOnboardingAction");
    expect(voice).toContain("Last synced");
    expect(voice).toContain("Sync error");

    const actions = readFileSync(
      join(REPO, "app/dashboard/onboarding/actions.ts"),
      "utf8"
    );
    expect(actions).toContain("runRestaurantVoiceAgentSync");
    expect(actions).toContain("Restaurant does not belong to this organization");
  });

  it("wizard loads tenant-scoped readiness without demo data", () => {
    const load = readFileSync(
      join(REPO, "lib/onboarding/wizard-state.server.ts"),
      "utf8"
    );
    expect(load).toContain("evaluateOnboardingReadiness");
    expect(load).toContain("loadRestaurantLaunchChecklist");
    expect(load).toContain("restaurant_weekly_hours");
    expect(load).not.toMatch(/demo|seed|fabricat/i);

    const panel = readFileSync(
      join(REPO, "components/onboarding/OnboardingReadinessPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("no demo data");
  });

  it("wizard shows readiness panel and honest empty states", () => {
    const wizard = readFileSync(
      join(REPO, "components/onboarding/onboarding-wizard.tsx"),
      "utf8"
    );
    expect(wizard).toContain("OnboardingReadinessPanel");
    expect(wizard).toContain("No locations yet");
    expect(wizard).not.toMatch(/sample restaurant|fabricated/i);
  });
});
