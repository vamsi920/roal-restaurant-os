import { EnvValidationError, ENV_HINTS } from "@/lib/env.shared";
import { getElevenLabsAgentId } from "@/lib/env.server";
import {
  createConvaiAgent,
  duplicateConvaiAgent,
  getConvaiAgent,
} from "@/lib/elevenlabs";

export type ConvaiAgentProvisionMethod = "duplicate" | "create";

export type ElevenLabsAgentProvisionDeps = {
  getTemplateAgentId: () => string | null;
  getConvaiAgent: (agentId: string) => Promise<unknown>;
  duplicateConvaiAgent: (
    templateAgentId: string,
    body?: { name?: string }
  ) => Promise<unknown>;
  createConvaiAgent: (body: unknown) => Promise<unknown>;
};

export type ProvisionRestaurantConvaiAgentInput = {
  restaurantId: string;
  restaurantName: string;
  /** Defaults to `ELEVENLABS_AGENT_ID` via deps. */
  templateAgentId?: string | null;
  /** Prefer ElevenLabs duplicate API (default). */
  method?: ConvaiAgentProvisionMethod;
  /**
   * When `method` is `duplicate` and duplicate fails, retry with conservative create.
   * Ignored when `method` is `create`.
   */
  fallbackToCreateOnDuplicateError?: boolean;
};

export type ProvisionRestaurantConvaiAgentResult = {
  agent_id: string;
  agent_name: string;
  template_agent_id: string;
  method: ConvaiAgentProvisionMethod;
};

export function defaultElevenLabsAgentProvisionDeps(): ElevenLabsAgentProvisionDeps {
  return {
    getTemplateAgentId: () => getElevenLabsAgentId(),
    getConvaiAgent,
    duplicateConvaiAgent,
    createConvaiAgent,
  };
}

/** Read `agent_id` from create/duplicate/get agent responses. */
export function readConvaiAgentId(response: unknown): string {
  if (!response || typeof response !== "object") {
    throw new Error("ElevenLabs agent response missing agent_id");
  }
  const id = (response as Record<string, unknown>).agent_id;
  if (typeof id === "string" && id.trim()) return id.trim();
  throw new Error("ElevenLabs agent response missing agent_id");
}

/** Provision must yield a new agent id, never the shared template. */
export function assertProvisionedAgentDiffersFromTemplate(
  agentId: string,
  templateAgentId: string
): void {
  if (agentId.trim() === templateAgentId.trim()) {
    throw new Error(
      "ElevenLabs provision returned the shared template agent; expected a dedicated clone."
    );
  }
}

export function readConvaiAgentName(agent: unknown): string | null {
  if (!agent || typeof agent !== "object") return null;
  const name = (agent as Record<string, unknown>).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/** Display name for a per-restaurant ConvAI agent (ElevenLabs duplicate `name` field). */
export function buildRestaurantConvaiAgentName(
  restaurantName: string,
  restaurantId: string
): string {
  const label = restaurantName.trim() || "Restaurant";
  const suffix = restaurantId.trim().slice(0, 8);
  const base = suffix ? `ROAL — ${label} (${suffix})` : `ROAL — ${label}`;
  return base.length > 120 ? `${base.slice(0, 117)}…` : base;
}

/**
 * Conservative create payload: name + conversation_config cloned from template GET.
 * Omits top-level ids/metadata the create API does not need.
 */
export function buildCreateConvaiAgentBodyFromTemplate(
  templateAgent: unknown,
  name: string
): Record<string, unknown> {
  const body: Record<string, unknown> = { name: name.trim() };
  if (!templateAgent || typeof templateAgent !== "object") return body;

  const cc = (templateAgent as Record<string, unknown>).conversation_config;
  if (cc && typeof cc === "object") {
    body.conversation_config = JSON.parse(JSON.stringify(cc)) as unknown;
  }
  return body;
}

export function resolveTemplateAgentId(
  input: Pick<ProvisionRestaurantConvaiAgentInput, "templateAgentId">,
  deps: Pick<ElevenLabsAgentProvisionDeps, "getTemplateAgentId">
): string {
  const id =
    input.templateAgentId?.trim() || deps.getTemplateAgentId()?.trim() || "";
  if (id) return id;
  throw new EnvValidationError([
    {
      path: "ELEVENLABS_AGENT_ID",
      message:
        "Template agent required: set ELEVENLABS_AGENT_ID or pass templateAgentId",
      hint: ENV_HINTS.ELEVENLABS_AGENT_ID,
    },
  ]);
}

/**
 * Clone the template ConvAI agent for one restaurant (duplicate API).
 * Optional create-from-template fallback uses only name + conversation_config.
 */
export async function provisionRestaurantConvaiAgent(
  input: ProvisionRestaurantConvaiAgentInput,
  deps: ElevenLabsAgentProvisionDeps = defaultElevenLabsAgentProvisionDeps()
): Promise<ProvisionRestaurantConvaiAgentResult> {
  const templateAgentId = resolveTemplateAgentId(input, deps);
  const agentName = buildRestaurantConvaiAgentName(
    input.restaurantName,
    input.restaurantId
  );
  const method = input.method ?? "duplicate";
  const fallback = input.fallbackToCreateOnDuplicateError ?? true;

  if (method === "create") {
    const template = await deps.getConvaiAgent(templateAgentId);
    const created = await deps.createConvaiAgent(
      buildCreateConvaiAgentBodyFromTemplate(template, agentName)
    );
    const agentId = readConvaiAgentId(created);
    assertProvisionedAgentDiffersFromTemplate(agentId, templateAgentId);
    return {
      agent_id: agentId,
      agent_name: agentName,
      template_agent_id: templateAgentId,
      method: "create",
    };
  }

  try {
    const duplicated = await deps.duplicateConvaiAgent(templateAgentId, {
      name: agentName,
    });
    const agentId = readConvaiAgentId(duplicated);
    assertProvisionedAgentDiffersFromTemplate(agentId, templateAgentId);
    return {
      agent_id: agentId,
      agent_name: agentName,
      template_agent_id: templateAgentId,
      method: "duplicate",
    };
  } catch (duplicateErr) {
    if (!fallback) throw duplicateErr;
    const template = await deps.getConvaiAgent(templateAgentId);
    const created = await deps.createConvaiAgent(
      buildCreateConvaiAgentBodyFromTemplate(template, agentName)
    );
    const agentId = readConvaiAgentId(created);
    assertProvisionedAgentDiffersFromTemplate(agentId, templateAgentId);
    return {
      agent_id: agentId,
      agent_name: agentName,
      template_agent_id: templateAgentId,
      method: "create",
    };
  }
}

/** Alias for provision flow that always uses duplicate first. */
export async function cloneRestaurantConvaiAgentFromTemplate(
  input: Omit<
    ProvisionRestaurantConvaiAgentInput,
    "method" | "fallbackToCreateOnDuplicateError"
  >,
  deps?: ElevenLabsAgentProvisionDeps
): Promise<ProvisionRestaurantConvaiAgentResult> {
  return provisionRestaurantConvaiAgent(
    { ...input, method: "duplicate", fallbackToCreateOnDuplicateError: false },
    deps
  );
}
