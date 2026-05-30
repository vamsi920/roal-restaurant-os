import type { SupabaseClient } from "@supabase/supabase-js";
import { menuContextFromGetMenuResponse } from "@/lib/voice-agent/test-harness/menu-context";
import { getHarnessScenario } from "@/lib/voice-agent/test-harness/scenarios";
import {
  newHarnessSessionId,
  simulateHarnessTool,
} from "@/lib/voice-agent/test-harness/simulate-tool";
import type {
  HarnessMenuContext,
  HarnessRunResult,
  HarnessStepResult,
} from "@/lib/voice-agent/test-harness/types";

const SCENARIOS_NEEDING_AVAILABLE_ITEM = new Set([
  "pickup_order",
  "finalize_missing_guest",
  "finalize_missing_phone",
  "finalize_missing_name",
  "invalid_modifier_sync",
  "closed_restaurant_sync",
]);

const INFORMATIONAL_ONLY_SCENARIOS = new Set([
  "menu_question",
  "closed_hours_call",
  "catering_handoff",
  "complaint_handoff",
]);

function menuPrereqMessage(
  scenarioId: string,
  menuCtx: HarnessMenuContext | null
): string | null {
  if (!menuCtx) return null;
  if (
    SCENARIOS_NEEDING_AVAILABLE_ITEM.has(scenarioId) &&
    !menuCtx.firstAvailableItemName
  ) {
    return "No available menu items on this restaurant. Add at least one available item, then re-run.";
  }
  if (scenarioId === "unavailable_item" && !menuCtx.firstUnavailableItemName) {
    return "No sold-out items on this menu. Mark an item unavailable in the menu editor, then re-run.";
  }
  if (
    (scenarioId === "required_modifier_missing" ||
      scenarioId === "valid_modifier_sync" ||
      scenarioId === "invalid_modifier_sync") &&
    !menuCtx.requiredModifier
  ) {
    return "No required modifier groups on this menu. Add a modifier group with min selection ≥ 1, then re-run.";
  }
  return null;
}

function menuContextGateMessage(
  scenario: { requireOrderingClosed?: boolean; requireOrderingOpen?: boolean },
  menuCtx: HarnessMenuContext
): string | null {
  if (scenario.requireOrderingClosed && menuCtx.orderingAllowed) {
    return "Restaurant is open (ordering_allowed true). Close hours or use a closed-hours test window, then re-run.";
  }
  if (scenario.requireOrderingOpen && !menuCtx.orderingAllowed) {
    return "Restaurant is closed (ordering_allowed false). Open hours or disable closed test, then re-run.";
  }
  return null;
}

function stepExpectsFailure(
  scenarioId: string,
  templateExpectFailure: boolean | undefined,
  menuCtx: HarnessMenuContext | null,
  tool: string
): boolean {
  if (templateExpectFailure) return true;
  if (
    scenarioId === "closed_restaurant_sync" &&
    menuCtx &&
    !menuCtx.orderingAllowed &&
    (tool === "sync_draft_order" || tool === "finalize_order")
  ) {
    return true;
  }
  return false;
}

export async function runHarnessScenario(input: {
  supabase: SupabaseClient;
  restaurantId: string;
  restaurantName: string;
  scenarioId: string;
  sessionId?: string;
  dryRun?: boolean;
}): Promise<HarnessRunResult> {
  const scenario = getHarnessScenario(input.scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${input.scenarioId}`);
  }

  const sessionId = input.sessionId?.trim() || newHarnessSessionId();
  const dryRun = input.dryRun !== false;
  const steps: HarnessStepResult[] = [];
  let menuCtx: HarnessMenuContext | null = null;

  for (let i = 0; i < scenario.templates.length; i++) {
    const template = scenario.templates[i];
    const request = {
      restaurant_id: input.restaurantId,
      ...template.buildInput(menuCtx, sessionId),
    };
    const started = Date.now();
    const result = await simulateHarnessTool({
      supabase: input.supabase,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      tool: template.tool,
      body: request,
      dryRun,
    });
    const durationMs = Date.now() - started;

    if (template.tool === "get_menu_items" && result.ok) {
      menuCtx = menuContextFromGetMenuResponse(result.response);

      if (menuCtx) {
        const gateMessage = menuContextGateMessage(scenario, menuCtx);
        if (gateMessage) {
          return {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            sessionId,
            dryRun,
            steps,
            passed: false,
            summary: gateMessage,
          };
        }
      }
    }

    const prereqMessage = menuPrereqMessage(scenario.id, menuCtx);
    if (prereqMessage && i > 0) {
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        sessionId,
        dryRun,
        steps,
        passed: false,
        summary: prereqMessage,
      };
    }

    const expectedFailure = stepExpectsFailure(
      scenario.id,
      template.expectFailure,
      menuCtx,
      template.tool
    );

    steps.push({
      stepIndex: i,
      guestLine: template.guestLine,
      tool: template.tool,
      request,
      httpStatus: result.httpStatus,
      ok: result.ok,
      response: result.response,
      cartValidation: result.cartValidation,
      expectedFailure,
      durationMs,
    });

    const stepPassed = expectedFailure ? !result.ok : result.ok;
    if (!stepPassed) {
      const summary = expectedFailure
        ? `Step ${i + 1} should have failed but succeeded.`
        : `Step ${i + 1} failed (${template.tool}, HTTP ${result.httpStatus}).`;
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        sessionId,
        dryRun,
        steps,
        passed: false,
        summary,
      };
    }
  }

  if (INFORMATIONAL_ONLY_SCENARIOS.has(scenario.id)) {
    const onlyGetMenu = steps.every((s) => s.tool === "get_menu_items");
    if (!onlyGetMenu) {
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        sessionId,
        dryRun,
        steps,
        passed: false,
        summary: "Informational scenario must only call get_menu_items.",
      };
    }
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    sessionId,
    dryRun,
    steps,
    passed: true,
    summary: `All ${steps.length} step(s) passed${dryRun ? " (dry run)" : ""}.`,
  };
}
