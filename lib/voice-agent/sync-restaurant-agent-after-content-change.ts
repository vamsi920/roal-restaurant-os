import type { SupabaseClient } from "@supabase/supabase-js";
import { EnvValidationError } from "@/lib/env.shared";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ElevenLabsMenuAutoSyncStatus } from "@/lib/types";
import {
  runRestaurantVoiceAgentSync,
  type RunRestaurantVoiceAgentSyncResult,
} from "@/lib/voice-agent/run-restaurant-voice-agent-sync";
import { emitMenuAutoSyncFailureIfTransition } from "@/lib/notifications/operational-events";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import type { VoiceAgentSyncSummary } from "@/lib/voice-agent/voice-agent-sync-summary";

export const VOICE_AGENT_CONTENT_SYNC_TRIGGERS = {
  menu: "menu",
  hours: "hours",
  profile: "profile",
  scanner_commit: "scanner_commit",
  manual_resync: "manual_resync",
} as const;

export type VoiceAgentContentSyncTrigger =
  (typeof VOICE_AGENT_CONTENT_SYNC_TRIGGERS)[keyof typeof VOICE_AGENT_CONTENT_SYNC_TRIGGERS];

export type SyncRestaurantAgentAfterContentChangeInput = {
  restaurantId: string;
  /** Stored in `elevenlabs_last_sync_summary` for debugging. */
  trigger: VoiceAgentContentSyncTrigger | string;
  restaurantName?: string;
  userId?: string | null;
};

export type SyncRestaurantAgentAfterContentChangeResult = {
  ok: boolean;
  skipped: boolean;
  skipReason: string | null;
  agentId: string | null;
  error: string | null;
  trigger: string;
  summary: VoiceAgentSyncSummary | null;
};

export type SyncRestaurantAgentAfterContentChangeDeps = {
  getSupabase: () => Promise<SupabaseClient>;
  runSync: typeof runRestaurantVoiceAgentSync;
};

export const defaultSyncRestaurantAgentAfterContentChangeDeps =
  (): SyncRestaurantAgentAfterContentChangeDeps => ({
    getSupabase: createServerSupabase,
    runSync: runRestaurantVoiceAgentSync,
  });

function safeSyncError(error: unknown): string {
  if (error instanceof EnvValidationError) {
    const first = error.issues[0];
    return (
      sanitizeVoiceAgentDisplayError(first?.message ?? error.message) ??
      "Voice agent sync is not configured"
    );
  }
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string" && error.trim()
        ? error.trim()
        : "Voice agent sync failed";
  return sanitizeVoiceAgentDisplayError(raw) ?? "Voice agent sync failed";
}

async function loadMenuAutoSyncStatus(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<ElevenLabsMenuAutoSyncStatus | null> {
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select("elevenlabs_menu_auto_sync_status")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.elevenlabs_menu_auto_sync_status as ElevenLabsMenuAutoSyncStatus | null) ?? null;
}

async function patchMenuAutoSyncStatus(
  supabase: SupabaseClient,
  restaurantId: string,
  patch: {
    status: ElevenLabsMenuAutoSyncStatus | null;
    error: string | null;
    lastSync?: {
      at: string;
      summary: VoiceAgentSyncSummary;
    } | null;
    trigger: string;
    restaurantName?: string;
    userId?: string | null;
  }
): Promise<void> {
  const previousStatus =
    patch.status === "failed"
      ? await loadMenuAutoSyncStatus(supabase, restaurantId)
      : null;

  const body: Record<string, unknown> = {
    elevenlabs_menu_auto_sync_status: patch.status,
    elevenlabs_menu_auto_sync_error: patch.error,
    updated_at: new Date().toISOString(),
  };

  if (patch.lastSync) {
    body.elevenlabs_last_sync_at = patch.lastSync.at;
    body.elevenlabs_last_sync_error = null;
    body.elevenlabs_last_sync_summary = {
      ...patch.lastSync.summary,
      content_change_trigger: patch.trigger,
    };
  }

  const { error } = await supabase
    .from("restaurant_profiles")
    .update(body)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(error.message);

  if (patch.status === "failed" && patch.error) {
    void emitMenuAutoSyncFailureIfTransition(supabase, {
      restaurantId,
      restaurantName: patch.restaurantName,
      userId: patch.userId,
      previousMenuAutoSyncStatus: previousStatus,
      message: patch.error,
      trigger: patch.trigger,
    });
  }
}

async function loadVoiceAgentSyncContext(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantNameHint?: string
): Promise<{ restaurantName: string; agentId: string | null }> {
  const nameFromHint = restaurantNameHint?.trim();
  let restaurantName = nameFromHint || "";

  if (!restaurantName) {
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurantId)
      .maybeSingle();
    if (restErr) throw new Error(restErr.message);
    restaurantName = restaurant?.name?.trim() ?? "";
  }

  const { data: profile, error: profileErr } = await supabase
    .from("restaurant_profiles")
    .select("elevenlabs_agent_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);

  const agentId =
    profile?.elevenlabs_agent_id != null &&
    String(profile.elevenlabs_agent_id).trim()
      ? String(profile.elevenlabs_agent_id).trim()
      : null;

  return {
    restaurantName: restaurantName || "Restaurant",
    agentId,
  };
}

/**
 * Re-sync tools, prompt, and webhook on the restaurant's dedicated ElevenLabs agent
 * after menu, hours, or profile content changes. Never throws; updates menu auto-sync
 * status columns on `restaurant_profiles`.
 */
export async function syncRestaurantAgentAfterContentChange(
  input: SyncRestaurantAgentAfterContentChangeInput,
  deps: SyncRestaurantAgentAfterContentChangeDeps = defaultSyncRestaurantAgentAfterContentChangeDeps()
): Promise<SyncRestaurantAgentAfterContentChangeResult> {
  const restaurantId = input.restaurantId.trim();
  const trigger = input.trigger.trim() || "content_change";

  const baseFailure = (
    partial: Partial<SyncRestaurantAgentAfterContentChangeResult>
  ): SyncRestaurantAgentAfterContentChangeResult => ({
    ok: false,
    skipped: false,
    skipReason: null,
    agentId: null,
    error: "Voice agent sync failed",
    trigger,
    summary: null,
    ...partial,
  });

  if (!restaurantId) {
    return baseFailure({
      skipped: true,
      skipReason: "missing_restaurant_id",
      error: null,
    });
  }

  try {
    const supabase = await deps.getSupabase();
    const { restaurantName, agentId } = await loadVoiceAgentSyncContext(
      supabase,
      restaurantId,
      input.restaurantName
    );

    if (!agentId) {
      return {
        ok: true,
        skipped: true,
        skipReason: "no_linked_agent",
        agentId: null,
        error: null,
        trigger,
        summary: null,
      };
    }

    await patchMenuAutoSyncStatus(supabase, restaurantId, {
      status: "syncing",
      error: null,
      trigger,
      restaurantName,
      userId: input.userId,
    });

    let syncResult: RunRestaurantVoiceAgentSyncResult;
    try {
      syncResult = await deps.runSync({
        agentId,
        restaurantId,
        restaurantName,
      });
    } catch (syncErr) {
      const message = safeSyncError(syncErr);
      await patchMenuAutoSyncStatus(supabase, restaurantId, {
        status: "failed",
        error: message.slice(0, 2000),
        trigger,
        restaurantName,
        userId: input.userId,
      });
      return {
        ok: false,
        skipped: false,
        skipReason: null,
        agentId,
        error: message,
        trigger,
        summary: null,
      };
    }

    const now = new Date().toISOString();
    await patchMenuAutoSyncStatus(supabase, restaurantId, {
      status: "succeeded",
      error: null,
      trigger,
      restaurantName,
      userId: input.userId,
      lastSync: { at: now, summary: syncResult.summary },
    });

    return {
      ok: true,
      skipped: false,
      skipReason: null,
      agentId,
      error: null,
      trigger,
      summary: syncResult.summary,
    };
  } catch (e) {
    const message = safeSyncError(e);
    try {
      const supabase = await deps.getSupabase();
      await patchMenuAutoSyncStatus(supabase, restaurantId, {
        status: "failed",
        error: message.slice(0, 2000),
        trigger,
        restaurantName: input.restaurantName,
        userId: input.userId,
      });
    } catch {
      // Profile patch is best-effort when load failed early.
    }

    return baseFailure({
      agentId: null,
      error: message,
    });
  }
}
