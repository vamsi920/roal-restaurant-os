import { describe, expect, it } from "vitest";
import {
  menuAutoSyncFromProfile,
  resolveMenuAutoSyncDisplay,
} from "@/lib/voice-agent/menu-auto-sync-display";

const baseProfile = {
  elevenlabs_agent_id: "agent_abc",
  elevenlabs_menu_auto_sync_status: null,
  elevenlabs_menu_auto_sync_error: null,
  elevenlabs_last_sync_at: null,
} as const;

describe("menuAutoSyncFromProfile", () => {
  it("maps profile columns without inventing values", () => {
    const snap = menuAutoSyncFromProfile({
      ...baseProfile,
      elevenlabs_menu_auto_sync_status: "succeeded",
      elevenlabs_last_sync_at: "2026-05-30T12:00:00.000Z",
    });
    expect(snap).toEqual({
      agentLinked: true,
      status: "succeeded",
      error: null,
      lastSyncedAt: "2026-05-30T12:00:00.000Z",
    });
  });
});

describe("resolveMenuAutoSyncDisplay", () => {
  it("shows syncing when status is syncing", () => {
    const d = resolveMenuAutoSyncDisplay({
      agentLinked: true,
      status: "syncing",
      error: null,
      lastSyncedAt: null,
    });
    expect(d.phase).toBe("syncing");
    expect(d.badgeLabel).toBe("Syncing");
    expect(d.resyncDisabled).toBe(true);
  });

  it("shows failed with profile error", () => {
    const d = resolveMenuAutoSyncDisplay({
      agentLinked: true,
      status: "failed",
      error: "ElevenLabs timeout",
      lastSyncedAt: "2026-05-30T10:00:00.000Z",
    });
    expect(d.phase).toBe("failed");
    expect(d.errorMessage).toBe("ElevenLabs timeout");
  });
});
