import type { CartValidationResult } from "@/lib/voice-agent/validate-cart-items";

export type HarnessToolName =
  | "get_menu_items"
  | "sync_draft_order"
  | "finalize_order";

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
};

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
