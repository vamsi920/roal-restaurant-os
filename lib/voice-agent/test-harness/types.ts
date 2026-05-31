import type { CartValidationResult } from "@/lib/voice-agent/validate-cart-items";

export type HarnessToolName =
  | "get_menu_items"
  | "get_restaurant_info"
  | "get_caller_history"
  | "submit_reservation_request"
  | "sync_draft_order"
  | "finalize_order"
  | "get_order_status";

export type HarnessRequiredModifierHint = {
  itemName: string;
  groupName: string;
  exampleModifierName: string;
};

export type HarnessMenuContext = {
  firstAvailableItemName: string | null;
  firstAvailableItemId: string | null;
  secondAvailableItemName: string | null;
  firstUnavailableItemName: string | null;
  requiredModifier: HarnessRequiredModifierHint | null;
  orderingAllowed: boolean;
  operationsMessage: string;
  categoryCount: number;
  itemCount: number;
};

export type HarnessStepTemplate = {
  guestLine: string;
  tool: HarnessToolName;
  buildInput: (
    ctx: HarnessMenuContext | null,
    sessionId: string
  ) => Record<string, unknown>;
  /** When true, a failed step does not stop the scenario (e.g. expect closed). */
  expectFailure?: boolean;
};

export type HarnessScenario = {
  id: string;
  name: string;
  description: string;
  templates: HarnessStepTemplate[];
  /** After get_menu_items, fail if operations.ordering_allowed is true. */
  requireOrderingClosed?: boolean;
  /** After get_menu_items, fail if operations.ordering_allowed is false. */
  requireOrderingOpen?: boolean;
};

/** ROAL pass 23 — primary harness coverage ids. */
export const HARNESS_ROAL_SCENARIO_IDS = [
  "pickup_order",
  "menu_question",
  "closed_hours_call",
  "finalize_missing_guest",
  "finalize_missing_phone",
  "finalize_missing_name",
  "unavailable_item",
  "catering_handoff",
  "complaint_handoff",
] as const;

export type HarnessRoalScenarioId = (typeof HARNESS_ROAL_SCENARIO_IDS)[number];

export type HarnessStepResult = {
  stepIndex: number;
  guestLine: string;
  tool: HarnessToolName;
  request: Record<string, unknown>;
  httpStatus: number;
  ok: boolean;
  response: unknown;
  cartValidation?: CartValidationResult;
  expectedFailure?: boolean;
  durationMs: number;
};

export type HarnessRunResult = {
  scenarioId: string;
  scenarioName: string;
  sessionId: string;
  dryRun: boolean;
  steps: HarnessStepResult[];
  passed: boolean;
  summary: string;
};
