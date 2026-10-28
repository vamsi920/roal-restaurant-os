import { buildEnvSecretRows } from "@/lib/voice-agent/control-center";
import type { LaunchChecklistItemId } from "@/lib/restaurant-launch/types";

export function isSharedTemplateAgentLinked(
  agentId: string | null | undefined,
  templateAgentId: string | null | undefined
): boolean {
  const linked = agentId?.trim();
  const template = templateAgentId?.trim();
  if (!linked || !template) return false;
  return linked === template;
}

export function evaluateServerLaunchEnvReady(): {
  ready: boolean;
  detail: string | null;
} {
  const rows = buildEnvSecretRows();
  const requiredOk = rows.filter((row) => row.required).every((row) => row.ok);
  const agentToolOk = rows
    .filter((row) => row.key.startsWith("AGENT_TOOL_"))
    .every((row) => row.ok);
  const ready = requiredOk && agentToolOk;
  return {
    ready,
    detail: ready
      ? null
      : "Server keys for the phone host are missing.",
  };
}

export function evaluateTestCallProof(input: {
  onboardingTestCallCompleted: boolean;
  billableReceiptCount: number;
}): { passed: boolean; detail: string } {
  if (input.onboardingTestCallCompleted) {
    return {
      passed: true,
      detail: "Test call step marked complete.",
    };
  }
  if (input.billableReceiptCount > 0) {
    return {
      passed: true,
      detail: "Real phone order recorded from a live call.",
    };
  }
  return {
    passed: false,
    detail:
      "Call your host from your browser and place a pretend order.",
  };
}

/** Owner-actionable steps first; the automatic host step, then the test call that needs it. */
const BLOCKER_PRIORITY: LaunchChecklistItemId[] = [
  "profile_complete",
  "menu_has_items",
  "hours_set",
  "agent_provisioned",
  "test_call_passed",
  "server_env_ready",
  "tools_synced",
  "conversation_init_webhook",
];

export function topLaunchBlocker<
  T extends { id: LaunchChecklistItemId; status: string; label: string; detail?: string; href: string },
>(items: T[]): T | null {
  const open = items.filter((item) => item.status !== "ok");
  if (open.length === 0) return null;
  return (
    [...open].sort(
      (a, b) =>
        BLOCKER_PRIORITY.indexOf(a.id) - BLOCKER_PRIORITY.indexOf(b.id)
    )[0] ?? null
  );
}
