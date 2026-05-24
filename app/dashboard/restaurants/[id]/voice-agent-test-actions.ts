"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { runHarnessScenario } from "@/lib/voice-agent/test-harness/run-scenario";
import {
  clearHarnessDryRunDraft,
  isHarnessSessionId,
  newHarnessSessionId,
  simulateHarnessTool,
} from "@/lib/voice-agent/test-harness/simulate-tool";
import type {
  HarnessRunResult,
  HarnessToolName,
} from "@/lib/voice-agent/test-harness/types";
import {
  createServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

async function harnessSupabase() {
  return getServiceRoleSupabase() ?? (await createServerSupabase());
}

export async function runVoiceAgentHarnessScenarioAction(
  restaurantId: string,
  scenarioId: string,
  options?: { sessionId?: string; dryRun?: boolean }
): Promise<HarnessRunResult> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const supabase = await harnessSupabase();
  const result = await runHarnessScenario({
    supabase,
    restaurantId,
    restaurantName: access.access.restaurant.name,
    scenarioId,
    sessionId: options?.sessionId,
    dryRun: options?.dryRun,
  });

  if (!result.dryRun && result.passed) {
    revalidatePath(`/dashboard/restaurants/${restaurantId}`);
  }

  return result;
}

export type HarnessStepActionResult = {
  httpStatus: number;
  ok: boolean;
  response: unknown;
  cartValidation?: HarnessRunResult["steps"][0]["cartValidation"];
  wroteDatabase: boolean;
  sessionId: string;
};

export async function runVoiceAgentHarnessStepAction(
  restaurantId: string,
  tool: HarnessToolName,
  body: Record<string, unknown>,
  options?: { sessionId?: string; dryRun?: boolean }
): Promise<HarnessStepActionResult> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }

  const sessionId =
    typeof options?.sessionId === "string" && options.sessionId.trim()
      ? options.sessionId.trim()
      : newHarnessSessionId();
  const dryRun = options?.dryRun !== false;

  const request = {
    restaurant_id: restaurantId,
    session_id: sessionId,
    ...body,
  };

  const supabase = await harnessSupabase();
  const result = await simulateHarnessTool({
    supabase,
    restaurantId,
    restaurantName: access.access.restaurant.name,
    tool,
    body: request,
    dryRun,
  });

  if (!dryRun && result.wroteDatabase) {
    revalidatePath(`/dashboard/restaurants/${restaurantId}`);
  }

  return {
    httpStatus: result.httpStatus,
    ok: result.ok,
    response: result.response,
    cartValidation: result.cartValidation,
    wroteDatabase: result.wroteDatabase,
    sessionId,
  };
}

export async function clearHarnessDraftSessionAction(
  restaurantId: string,
  sessionId: string
): Promise<{ ok: boolean }> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    throw new Error("You do not have access to this restaurant.");
  }
  if (!isHarnessSessionId(sessionId)) {
    throw new Error("Only roal-harness-* sessions can be cleared from the test UI.");
  }

  const supabase = await harnessSupabase();
  await supabase
    .from("draft_orders")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("session_id", sessionId);
  await supabase
    .from("phone_order_receipts")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("session_id", sessionId);

  clearHarnessDryRunDraft(restaurantId, sessionId);

  revalidatePath(`/dashboard/restaurants/${restaurantId}`);
  return { ok: true };
}
