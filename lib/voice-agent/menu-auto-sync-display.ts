import type {
  ElevenLabsMenuAutoSyncStatus,
  RestaurantProfile,
} from "@/lib/types";

export type MenuAutoSyncSnapshot = {
  agentLinked: boolean;
  status: ElevenLabsMenuAutoSyncStatus | null;
  error: string | null;
  lastSyncedAt: string | null;
};

export type MenuAutoSyncUiPhase =
  | "no_agent"
  | "syncing"
  | "succeeded"
  | "failed"
  | "idle";

export type MenuAutoSyncDisplay = {
  phase: MenuAutoSyncUiPhase;
  badgeLabel: string;
  summary: string;
  badgeClassName: string;
  errorMessage: string | null;
  lastSyncedAt: string | null;
  resyncDisabled: boolean;
};

export function menuAutoSyncFromProfile(
  profile: Pick<
    RestaurantProfile,
    | "elevenlabs_agent_id"
    | "elevenlabs_menu_auto_sync_status"
    | "elevenlabs_menu_auto_sync_error"
    | "elevenlabs_last_sync_at"
  >
): MenuAutoSyncSnapshot {
  const agentId = profile.elevenlabs_agent_id?.trim();
  return {
    agentLinked: Boolean(agentId),
    status: profile.elevenlabs_menu_auto_sync_status,
    error: profile.elevenlabs_menu_auto_sync_error,
    lastSyncedAt: profile.elevenlabs_last_sync_at,
  };
}

export function resolveMenuAutoSyncDisplay(
  snapshot: MenuAutoSyncSnapshot,
  options?: { pendingResync?: boolean }
): MenuAutoSyncDisplay {
  if (options?.pendingResync || snapshot.status === "syncing") {
    return {
      phase: "syncing",
      badgeLabel: "Syncing",
      summary: "Pushing menu and agent settings to ElevenLabs…",
      badgeClassName: "bg-accent/15 text-accent",
      errorMessage: null,
      lastSyncedAt: snapshot.lastSyncedAt,
      resyncDisabled: true,
    };
  }

  if (!snapshot.agentLinked) {
    return {
      phase: "no_agent",
      badgeLabel: "No agent",
      summary: "Connect an agent on Live Agent before menu can sync.",
      badgeClassName: "bg-elev text-muted",
      errorMessage: null,
      lastSyncedAt: null,
      resyncDisabled: true,
    };
  }

  if (snapshot.status === "failed") {
    const errorMessage = snapshot.error?.trim() || "Menu sync failed.";
    return {
      phase: "failed",
      badgeLabel: "Sync error",
      summary: errorMessage,
      badgeClassName: "bg-danger/10 text-danger",
      errorMessage,
      lastSyncedAt: snapshot.lastSyncedAt,
      resyncDisabled: false,
    };
  }

  if (snapshot.status === "succeeded") {
    return {
      phase: "succeeded",
      badgeLabel: "Synced",
      summary: snapshot.lastSyncedAt
        ? `Last synced ${formatMenuAutoSyncWhen(snapshot.lastSyncedAt)}`
        : "Menu and agent settings are synced.",
      badgeClassName: "bg-success/15 text-success",
      errorMessage: null,
      lastSyncedAt: snapshot.lastSyncedAt,
      resyncDisabled: false,
    };
  }

  return {
    phase: "idle",
    badgeLabel: "Not synced",
    summary: snapshot.lastSyncedAt
      ? `No recent auto-sync. Last agent update ${formatMenuAutoSyncWhen(snapshot.lastSyncedAt)}.`
      : "Save menu or settings to sync, or use Re-sync now.",
    badgeClassName: "bg-elev text-muted",
    errorMessage: null,
    lastSyncedAt: snapshot.lastSyncedAt,
    resyncDisabled: false,
  };
}

export function formatMenuAutoSyncWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
