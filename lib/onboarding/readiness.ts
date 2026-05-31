import {
  buildRestaurantLaunchGate,
  parseVoiceAgentSyncSummary,
} from "@/lib/restaurant-launch/evaluate-checklist";
import {
  evaluateServerLaunchEnvReady,
  evaluateTestCallProof,
} from "@/lib/restaurant-launch/server-env";
import type { LaunchChecklistItemId } from "@/lib/restaurant-launch/types";
import { restaurantVoiceAgentHref } from "@/lib/voice-agent/provision-display";
import type { RestaurantProfile } from "@/lib/types";

export type OnboardingReadinessState =
  | "missing_basics"
  | "missing_hours"
  | "missing_menu"
  | "agent_not_synced"
  | "phone_not_connected"
  | "test_call_needed"
  | "server_config_incomplete"
  | "ready";

export type OnboardingReadinessItem = {
  state: OnboardingReadinessState;
  ok: boolean;
  label: string;
  detail: string;
  href: string | null;
};

export type OnboardingReadinessSnapshot = {
  primaryState: OnboardingReadinessState;
  items: OnboardingReadinessItem[];
  blockers: OnboardingReadinessState[];
  isCoreReady: boolean;
  isPhoneAgentReady: boolean;
  isLiveReady: boolean;
  launchPhaseLabel: string;
  topBlockerLabel: string | null;
  primaryAction: { label: string; href: string };
};

function onboardingStateFromChecklistItem(
  id: LaunchChecklistItemId
): OnboardingReadinessState {
  switch (id) {
    case "profile_complete":
      return "missing_basics";
    case "hours_set":
      return "missing_hours";
    case "menu_has_items":
      return "missing_menu";
    case "server_env_ready":
      return "server_config_incomplete";
    case "agent_provisioned":
    case "tools_synced":
      return "agent_not_synced";
    case "conversation_init_webhook":
      return "phone_not_connected";
    case "test_call_passed":
      return "test_call_needed";
    default:
      return "missing_basics";
  }
}

export function evaluateOnboardingReadiness(input: {
  restaurantId: string;
  restaurantName: string;
  profile: RestaurantProfile | null;
  menuItemCount: number;
  hoursConfigured: boolean;
  phoneWebhookFromAgent?: string | null;
  testCallPassed?: boolean;
  testCallDetail?: string;
  serverEnvReady?: boolean;
  serverEnvDetail?: string | null;
  templateAgentId?: string | null;
}): OnboardingReadinessSnapshot {
  const syncSummary = parseVoiceAgentSyncSummary(
    input.profile?.elevenlabs_last_sync_summary ?? null
  );
  const serverEnv = input.serverEnvReady != null
    ? { ready: input.serverEnvReady, detail: input.serverEnvDetail ?? null }
    : evaluateServerLaunchEnvReady();
  const testProof =
    input.testCallPassed != null
      ? {
          passed: input.testCallPassed,
          detail:
            input.testCallDetail ??
            "Test order recorded or step marked complete.",
        }
      : evaluateTestCallProof({
          onboardingTestCallCompleted: false,
          billableReceiptCount: 0,
        });

  const gate = buildRestaurantLaunchGate({
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    profile: input.profile,
    menuItemCount: input.menuItemCount,
    hoursConfigured: input.hoursConfigured,
    testCallPassed: testProof.passed,
    testCallDetail: testProof.detail,
    syncSummary,
    lastSyncError: input.profile?.elevenlabs_last_sync_error ?? null,
    phoneWebhookFromAgent: input.phoneWebhookFromAgent ?? null,
    serverEnvReady: serverEnv.ready,
    serverEnvDetail: serverEnv.detail,
    templateAgentId: input.templateAgentId ?? null,
  });

  const agentHref = restaurantVoiceAgentHref(input.restaurantId);

  const items: OnboardingReadinessItem[] = gate.checklist.items
    .filter((item) => item.id !== "server_env_ready")
    .map((item) => {
      const state = onboardingStateFromChecklistItem(item.id);
      return {
        state,
        ok: item.status === "ok",
        label: item.label,
        detail: item.detail ?? item.label,
        href: item.status === "ok" ? null : item.href,
      };
    });

  if (!serverEnv.ready) {
    items.unshift({
      state: "server_config_incomplete",
      ok: false,
      label: "Server environment ready",
      detail:
        serverEnv.detail ??
        "Server config incomplete — ElevenLabs and Supabase settings required.",
      href: agentHref,
    });
  }

  const blockers = items
    .filter((item) => !item.ok)
    .map((item) => item.state);

  const primaryState = gate.isLiveReady
    ? "ready"
    : blockers[0] ?? "missing_basics";

  const blockerSet = new Set(blockers);
  const isCoreReady =
    !blockerSet.has("missing_basics") &&
    !blockerSet.has("missing_hours") &&
    !blockerSet.has("missing_menu") &&
    !blockerSet.has("agent_not_synced") &&
    !blockerSet.has("server_config_incomplete");

  const isPhoneAgentReady =
    isCoreReady && !blockerSet.has("phone_not_connected");

  return {
    primaryState,
    items,
    blockers,
    isCoreReady,
    isPhoneAgentReady,
    isLiveReady: gate.isLiveReady,
    launchPhaseLabel: gate.phaseLabel,
    topBlockerLabel: gate.topBlockerLabel,
    primaryAction: gate.primaryAction,
  };
}

export function onboardingReadinessBlocksStep(
  step: OnboardingReadinessState,
  readiness: OnboardingReadinessSnapshot | null | undefined
): boolean {
  if (!readiness) return false;
  return readiness.blockers.includes(step);
}
