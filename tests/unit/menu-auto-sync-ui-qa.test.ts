import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("menu auto-sync UI (pass 12)", () => {
  it("menu workspace shows real sync panel and re-sync action", () => {
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
    expect(panel).toContain("Re-sync now");
  });

  it("resync action uses content-change sync and profile fields", () => {
    const actions = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/voice-agent-actions.ts"),
      "utf8"
    );
    expect(actions).toContain("resyncRestaurantAgentMenuAction");
    expect(actions).toContain("syncRestaurantAgentAfterContentChange");
    expect(actions).toContain("menuAutoSyncFromProfile");
  });
});
