import type { SupabaseClient } from "@supabase/supabase-js";
import {
  provisionRestaurantConvaiAgent,
  type ConvaiAgentProvisionMethod,
  type ProvisionRestaurantConvaiAgentResult,
} from "@/lib/elevenlabs/agent-provision";
import { getElevenLabsAgentId } from "@/lib/env.server";
import { writeAuditLog } from "@/lib/observability/audit";
import {
  emitMenuAutoSyncFailureIfTransition,
  emitProvisionFailureIfTransition,
} from "@/lib/notifications/operational-events";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ElevenLabsMenuAutoSyncStatus, ElevenLabsProvisionStatus } from "@/lib/types";
import {
  runRestaurantVoiceAgentSync,
  type RunRestaurantVoiceAgentSyncResult,
} from "@/lib/voice-agent/run-restaurant-voice-agent-sync";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import type { VoiceAgentSyncSummary } from "@/lib/voice-agent/voice-agent-sync-summary";

export type VoiceAgentProvisionSummary = VoiceAgentSyncSummary & {
  provision: {
    method: ConvaiAgentProvisionMethod;
    template_agent_id: string;
    agent_name: string;
  };
};

export type ProvisionRestaurantVoiceAgentSuccess = {
  ok: true;
  agentId: string;
  provisionMethod: ConvaiAgentProvisionMethod;
  summary: VoiceAgentProvisionSummary;
  sync: RunRestaurantVoiceAgentSyncResult["sync"];
  profile: RunRestaurantVoiceAgentSyncResult["profile"];
};

export type ProvisionRestaurantVoiceAgentFailure = {
  ok: false;
  error: string;
  phase: "provision" | "sync";
  agentId: string | null;
};

export type ProvisionRestaurantVoiceAgentResult =
  | ProvisionRestaurantVoiceAgentSuccess
  | ProvisionRestaurantVoiceAgentFailure;

/** Non-blocking POST /api/restaurants voice-agent payload. */
export type VoiceAgentProvisionApiResult =
  | {
      ok: true;
      agent_id: string;
      method: ConvaiAgentProvisionMethod;
    }
  | {
      ok: false;
      warning: string;
      phase: "provision" | "sync";
      agent_id: string | null;
    }
  | {
      ok: false;
      warning: string;
      skipped: true;
    };

export type ProvisionRestaurantVoiceAgentDeps = {
  getSupabase: () => Promise<SupabaseClient>;
  provisionConvaiAgent: typeof provisionRestaurantConvaiAgent;
  runSync: typeof runRestaurantVoiceAgentSync;
};

export const defaultProvisionRestaurantVoiceAgentDeps =
  (): ProvisionRestaurantVoiceAgentDeps => ({
    getSupabase: createServerSupabase,
    provisionConvaiAgent: provisionRestaurantConvaiAgent,
    runSync: runRestaurantVoiceAgentSync,
  });

function safeErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string" && error.trim()
        ? error.trim()
        : "Provision failed";
  return sanitizeVoiceAgentDisplayError(raw) ?? "Provision failed";
}

async function patchProfileLifecycle(
  supabase: SupabaseClient,
  restaurantId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("restaurant_profiles")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(error.message);
}

async function markProvisionPhase(
  supabase: SupabaseClient,
  restaurantId: string,
  status: ElevenLabsProvisionStatus
): Promise<void> {
  await patchProfileLifecycle(supabase, restaurantId, {
    elevenlabs_provision_status: status,
    ...(status === "pending" || status === "provisioning"
      ? { elevenlabs_provision_error: null }
      : {}),
  });
}

async function loadProfileOperationalSnapshot(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<{
  provisionStatus: ElevenLabsProvisionStatus | null;
  menuAutoSyncStatus: ElevenLabsMenuAutoSyncStatus | null;
}> {
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select("elevenlabs_provision_status, elevenlabs_menu_auto_sync_status")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    provisionStatus:
      (data?.elevenlabs_provision_status as ElevenLabsProvisionStatus | null) ??
      null,
    menuAutoSyncStatus:
      (data?.elevenlabs_menu_auto_sync_status as ElevenLabsMenuAutoSyncStatus | null) ??
      null,
  };
}

async function persistProvisionFailure(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    restaurantName: string;
    organizationId: string;
    userId: string;
    message: string;
    agentId: string | null;
    phase: "provision" | "sync";
    menuAutoSyncStatus?: ElevenLabsMenuAutoSyncStatus;
  }
): Promise<ProvisionRestaurantVoiceAgentFailure> {
  const safeMessage = safeErrorMessage(input.message);
  const before = await loadProfileOperationalSnapshot(supabase, input.restaurantId);

  await patchProfileLifecycle(supabase, input.restaurantId, {
    elevenlabs_provision_status: "failed",
    elevenlabs_provision_error: safeMessage.slice(0, 2000),
    ...(input.agentId ? { elevenlabs_agent_id: input.agentId } : {}),
    ...(input.phase === "sync"
      ? {
          elevenlabs_last_sync_error: safeMessage.slice(0, 2000),
          elevenlabs_menu_auto_sync_status:
            input.menuAutoSyncStatus ?? "failed",
          elevenlabs_menu_auto_sync_error: safeMessage.slice(0, 2000),
        }
      : {}),
  });

  void emitProvisionFailureIfTransition(supabase, {
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    organizationId: input.organizationId,
    userId: input.userId,
    previousProvisionStatus: before.provisionStatus,
    phase: input.phase,
    message: safeMessage,
    agentId: input.agentId,
  });

  if (input.phase === "sync" || input.menuAutoSyncStatus === "failed") {
    void emitMenuAutoSyncFailureIfTransition(supabase, {
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      organizationId: input.organizationId,
      userId: input.userId,
      previousMenuAutoSyncStatus: before.menuAutoSyncStatus,
      message: safeMessage,
      trigger: "voice_agent_provision",
    });
  }

  return {
    ok: false,
    error: safeMessage,
    phase: input.phase,
    agentId: input.agentId,
  };
}

async function persistProvisionSuccess(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    organizationId: string;
    userId: string;
    agentId: string;
    provision: ProvisionRestaurantConvaiAgentResult;
    summary: VoiceAgentProvisionSummary;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await patchProfileLifecycle(supabase, input.restaurantId, {
    elevenlabs_agent_id: input.agentId,
    elevenlabs_provision_status: "ready",
    elevenlabs_provision_error: null,
    elevenlabs_provisioned_at: now,
    elevenlabs_menu_auto_sync_status: "succeeded",
    elevenlabs_menu_auto_sync_error: null,
    elevenlabs_last_sync_at: now,
    elevenlabs_last_sync_error: null,
    elevenlabs_last_sync_summary: input.summary,
  });

  void writeAuditLog(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    userId: input.userId,
    action: "voice_agent.provision_success",
    resourceType: "restaurant_profile",
    resourceId: input.restaurantId,
    outcome: "success",
    metadata: {
      agent_id: input.agentId,
      provision_method: input.provision.method,
      template_agent_id: input.provision.template_agent_id,
    },
  });
}

/**
 * Clone a dedicated ConvAI agent from `ELEVENLABS_AGENT_ID`, sync ROAL tools/profile/webhook,
 * and persist lifecycle + summary on `restaurant_profiles`.
 */
export async function provisionRestaurantVoiceAgent(
  restaurantId: string,
  name: string,
  organizationId: string,
  userId: string,
  deps: ProvisionRestaurantVoiceAgentDeps = defaultProvisionRestaurantVoiceAgentDeps()
): Promise<ProvisionRestaurantVoiceAgentResult> {
  const rid = restaurantId.trim();
  const restaurantName = name.trim();
  const orgId = organizationId.trim();
  const uid = userId.trim();

  if (!rid) throw new Error("restaurantId is required");
  if (!orgId) throw new Error("organizationId is required");
  if (!uid) throw new Error("userId is required");

  const supabase = await deps.getSupabase();
  await ensureRestaurantProfile(supabase, rid, orgId);

  await markProvisionPhase(supabase, rid, "pending");
  await markProvisionPhase(supabase, rid, "provisioning");

  let provision: ProvisionRestaurantConvaiAgentResult;
  try {
    provision = await deps.provisionConvaiAgent({
      restaurantId: rid,
      restaurantName,
    });
  } catch (e) {
    return persistProvisionFailure(supabase, {
      restaurantId: rid,
      restaurantName,
      organizationId: orgId,
      userId: uid,
      message: e instanceof Error ? e.message : "Agent clone failed",
      agentId: null,
      phase: "provision",
    });
  }

  const agentId = provision.agent_id;

  await patchProfileLifecycle(supabase, rid, {
    elevenlabs_agent_id: agentId,
    elevenlabs_menu_auto_sync_status: "syncing",
    elevenlabs_menu_auto_sync_error: null,
  });

  try {
    const { sync, profile, summary: syncSummary } = await deps.runSync({
      agentId,
      restaurantId: rid,
      restaurantName,
    });

    const summary: VoiceAgentProvisionSummary = {
      ...syncSummary,
      provision: {
        method: provision.method,
        template_agent_id: provision.template_agent_id,
        agent_name: provision.agent_name,
      },
    };

    await persistProvisionSuccess(supabase, {
      restaurantId: rid,
      organizationId: orgId,
      userId: uid,
      agentId,
      provision,
      summary,
    });

    return {
      ok: true,
      agentId,
      provisionMethod: provision.method,
      summary,
      sync,
      profile,
    };
  } catch (e) {
    return persistProvisionFailure(supabase, {
      restaurantId: rid,
      restaurantName,
      organizationId: orgId,
      userId: uid,
      message: e instanceof Error ? e.message : "Agent sync failed",
      agentId,
      phase: "sync",
      menuAutoSyncStatus: "failed",
    });
  }
}

const VOICE_AGENT_SKIPPED_WARNING =
  "Voice agent auto-setup skipped (ELEVENLABS_AGENT_ID not configured). Connect manually from Live Agent.";

const VOICE_AGENT_UNEXPECTED_WARNING =
  "Voice agent auto-setup hit an unexpected error. Your restaurant was created—retry from Live Agent when ElevenLabs is available.";

/**
 * Best-effort provision after restaurant insert. Never throws; failures are persisted on the profile.
 */
export async function tryProvisionVoiceAgentForNewRestaurant(
  input: {
    restaurantId: string;
    restaurantName: string;
    organizationId: string;
    userId: string;
  },
  deps: ProvisionRestaurantVoiceAgentDeps = defaultProvisionRestaurantVoiceAgentDeps()
): Promise<VoiceAgentProvisionApiResult> {
  if (!getElevenLabsAgentId()) {
    return { ok: false, warning: VOICE_AGENT_SKIPPED_WARNING, skipped: true };
  }

  try {
    const result = await provisionRestaurantVoiceAgent(
      input.restaurantId,
      input.restaurantName,
      input.organizationId,
      input.userId,
      deps
    );

    if (result.ok) {
      return {
        ok: true,
        agent_id: result.agentId,
        method: result.provisionMethod,
      };
    }

    return {
      ok: false,
      warning: result.error,
      phase: result.phase,
      agent_id: result.agentId,
    };
  } catch (e) {
    console.error(
      "[voice-agent] tryProvisionVoiceAgentForNewRestaurant",
      e instanceof Error ? e.message : e
    );
    return {
      ok: false,
      warning: safeErrorMessage(e) || VOICE_AGENT_UNEXPECTED_WARNING,
      phase: "provision",
      agent_id: null,
    };
  }
}
