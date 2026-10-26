import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("content auto-sync contract (pass 05)", () => {
  it("menu editor and API routes schedule afterMenuContentMutation", () => {
    const menuActions = read("app/dashboard/restaurants/[id]/menu/menu-actions.ts");
    const menuApi = read("app/api/restaurants/[id]/menu/route.ts");

    expect(menuActions).toContain("afterMenuContentMutation");
    expect(menuApi).toContain("afterMenuContentMutation");
    expect(menuActions).not.toContain("void syncRestaurantAgentAfterContentChange");
  });

  it("scanner commit schedules menu sync with scanner_commit trigger", () => {
    const commit = read("app/api/scanner/commit/route.ts");
    expect(commit).toContain("afterMenuContentMutation");
    expect(commit).toContain("VOICE_AGENT_CONTENT_SYNC_TRIGGERS.scanner_commit");
  });

  it("profile settings route sync hooks by mutation type", () => {
    const profile = read("app/dashboard/restaurants/[id]/profile-actions.ts");
    expect(profile).toContain("afterProfileSettingsMutation");
    expect(profile).toContain("afterRestaurantKnowledgeMutation");
    expect(profile).toContain("afterRestaurantUpsellMutation");
    expect(profile).not.toContain("void syncRestaurantAgentAfterContentChange");
  });

  it("hours save schedules afterHoursSettingsMutation", () => {
    const hours = read("app/dashboard/restaurants/[id]/hours-actions.ts");
    expect(hours).toContain("afterHoursSettingsMutation");
    expect(hours).not.toContain("void syncRestaurantAgentAfterContentChange");
  });

  it("mutation helpers call syncRestaurantAgentAfterContentChange and revalidate", () => {
    const menuHook = read("lib/voice-agent/after-menu-content-mutation.ts");
    const settingsHook = read("lib/voice-agent/after-restaurant-settings-mutation.ts");

    expect(menuHook).toContain("syncRestaurantAgentAfterContentChange");
    expect(menuHook).toContain("revalidateMenuContentSurfaces");
    expect(settingsHook).toContain("syncRestaurantAgentAfterContentChange");
    expect(settingsHook).toContain("revalidateRestaurantSettingsSurfaces");
  });

  it("sync helper persists menu auto-sync status columns", () => {
    const sync = read("lib/voice-agent/sync-restaurant-agent-after-content-change.ts");
    expect(sync).toContain("elevenlabs_menu_auto_sync_status");
    expect(sync).toContain("elevenlabs_menu_auto_sync_error");
    expect(sync).toContain("elevenlabs_last_sync_at");
    expect(sync).toContain("elevenlabs_last_sync_summary");
  });
});
