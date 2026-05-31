import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("profile knowledge save tenant safety", () => {
  it("scopes replaceRestaurantKnowledgeEntries to the restaurant id", () => {
    const actions = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/profile-actions.ts"),
      "utf8"
    );
    const helpers = readFileSync(
      join(REPO, "lib/restaurant-knowledge/helpers.ts"),
      "utf8"
    );
    expect(actions).toContain("requireRestaurantAccess(restaurantId)");
    expect(actions).toContain("replaceRestaurantKnowledgeEntries");
    expect(helpers).toContain('.eq("restaurant_id", restaurantId)');
  });
});

describe("menu auto-sync UI (pass 12)", () => {
  it("menu workspace exposes owner-friendly upsell editor in agent settings", () => {
    const settings = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx"),
      "utf8"
    );
    const editor = readFileSync(
      join(REPO, "components/restaurant-upsell/RestaurantUpsellEditor.tsx"),
      "utf8"
    );
    const workspace = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx"),
      "utf8"
    );
    expect(settings).toContain("RestaurantUpsellEditor");
    expect(settings).toContain("upsell_entries");
    expect(settings).toContain("Smart upsells");
    expect(editor).toContain("No upsell rules yet");
    expect(editor).toContain("auditUpsellRuleAgainstMenu");
    expect(editor).not.toMatch(/demo rule|fake upsell|placeholder row/i);
    expect(workspace).toContain("upsellRules={upsellRules}");
    expect(workspace).toContain("menu={menu}");
  });

  it("menu workspace exposes owner-friendly guest knowledge editor", () => {
    const settings = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx"),
      "utf8"
    );
    const editor = readFileSync(
      join(REPO, "components/restaurant-knowledge/RestaurantKnowledgeEditor.tsx"),
      "utf8"
    );
    expect(settings).toContain("RestaurantKnowledgeEditor");
    expect(settings).toContain("knowledge_entries");
    expect(editor).toContain("Add answers before ROAL can answer these guest questions");
    expect(editor).not.toMatch(/demo FAQ|placeholder FAQ/i);
  });

  it("menu workspace shows real publish panel and voice publish action", () => {
    const workspace = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx"),
      "utf8"
    );
    expect(workspace).toContain("MenuAutoSyncStatusPanel");
    expect(workspace).toContain("voiceAgentCenter.menuAutoSync");
    const panel = readFileSync(
      join(REPO, "components/voice-agent/MenuAutoSyncStatusPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("Publish to voice");
    expect(panel).toContain("publishRestaurantVoiceContentAction");
  });

  it("publish action uses content-change sync and profile fields", () => {
    const actions = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/voice-agent-actions.ts"),
      "utf8"
    );
    expect(actions).toContain("publishRestaurantVoiceContentAction");
    expect(actions).toContain("VOICE_AGENT_CONTENT_SYNC_TRIGGERS.publish_to_voice");
    expect(actions).toContain("resyncRestaurantAgentMenuAction");
    expect(actions).toContain("syncRestaurantAgentAfterContentChange");
    expect(actions).toContain("menuAutoSyncFromProfile");
  });
});
