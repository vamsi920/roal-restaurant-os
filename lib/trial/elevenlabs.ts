import {
  createConvaiAgent,
  duplicateConvaiAgent,
  getConvaiAgent,
  getConvaiSignedUrl,
  patchConvaiAgent,
} from "@/lib/elevenlabs";
import { getElevenLabsAgentId } from "@/lib/env.server";
import { requireTrialDb } from "@/lib/trial/store";
import { DEFAULT_TRIAL_VOICE } from "@/lib/trial/voices";

const TRIAL_AGENT_CONFIG_KEY = "elevenlabs_trial_agent_id";
const TRIAL_AGENT_NAME = "ROAL — Try-a-call (shared, overrides only)";

/** Hard ceiling on a single demo call (spend cap). */
export const TRIAL_MAX_CALL_SECONDS = 300;

const OVERRIDES_PLATFORM_SETTINGS = {
  overrides: {
    conversation_config_override: {
      agent: {
        first_message: true,
        language: true,
        prompt: { prompt: true },
      },
      tts: { voice_id: true },
    },
  },
};

let cachedTrialAgentId: string | null = null;
let overridesEnsuredFor: string | null = null;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function readAgentId(response: unknown): string {
  const id = asRecord(response)?.agent_id;
  if (typeof id === "string" && id.trim()) return id.trim();
  throw new Error("ElevenLabs agent response missing agent_id");
}

async function readStoredTrialAgentId(): Promise<string | null> {
  const db = requireTrialDb();
  const { data, error } = await db
    .from("internal_config")
    .select("value")
    .eq("key", TRIAL_AGENT_CONFIG_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const value = (data?.value as string | undefined)?.trim();
  return value || null;
}

async function storeTrialAgentId(agentId: string): Promise<void> {
  const db = requireTrialDb();
  const { error } = await db
    .from("internal_config")
    .upsert({ key: TRIAL_AGENT_CONFIG_KEY, value: agentId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Strip restaurant tools from a duplicated template so the trial agent only uses its prompt. */
async function stripToolsAndEnableOverrides(agentId: string): Promise<void> {
  const raw = asRecord(await getConvaiAgent(agentId));
  const cc = asRecord(raw?.conversation_config);
  const agent = asRecord(cc?.agent);
  const prompt = asRecord(agent?.prompt);
  const builtIn = asRecord(prompt?.built_in_tools) ?? {};
  const keptBuiltIns: Record<string, unknown> = {};
  if (builtIn.end_call) keptBuiltIns.end_call = builtIn.end_call;

  await patchConvaiAgent(agentId, {
    name: TRIAL_AGENT_NAME,
    conversation_config: {
      agent: {
        first_message: "Hi, thanks for calling. What can I get started for you?",
        language: "en",
        prompt: {
          prompt:
            "You are a friendly restaurant phone host. The restaurant context is supplied at call start.",
          tool_ids: [],
          tools: [],
          built_in_tools: keptBuiltIns,
          knowledge_base: [],
          temperature: 0.25,
        },
      },
      tts: { voice_id: DEFAULT_TRIAL_VOICE.id },
      conversation: { max_duration_seconds: TRIAL_MAX_CALL_SECONDS },
    },
    platform_settings: OVERRIDES_PLATFORM_SETTINGS,
  });
}

async function createFreshTrialAgent(): Promise<string> {
  const template = getElevenLabsAgentId();
  if (template) {
    try {
      const dup = await duplicateConvaiAgent(template, { name: TRIAL_AGENT_NAME });
      const id = readAgentId(dup);
      await stripToolsAndEnableOverrides(id);
      return id;
    } catch (e) {
      console.error("[trial agent] duplicate failed, creating fresh", e instanceof Error ? e.message : e);
    }
  }
  const created = await createConvaiAgent({
    name: TRIAL_AGENT_NAME,
    conversation_config: {
      agent: {
        first_message: "Hi, thanks for calling. What can I get started for you?",
        language: "en",
        prompt: {
          prompt:
            "You are a friendly restaurant phone host. The restaurant context is supplied at call start.",
          temperature: 0.25,
        },
      },
      tts: { voice_id: DEFAULT_TRIAL_VOICE.id },
      conversation: { max_duration_seconds: TRIAL_MAX_CALL_SECONDS },
    },
    platform_settings: OVERRIDES_PLATFORM_SETTINGS,
  });
  return readAgentId(created);
}

/**
 * Shared trial agent: created once, stored in `internal_config`, overrides enabled.
 * `ELEVENLABS_TRIAL_AGENT_ID` wins when set (overrides are still enabled once per process).
 */
export async function ensureTrialAgentId(): Promise<string> {
  const fromEnv = process.env.ELEVENLABS_TRIAL_AGENT_ID?.trim();
  if (fromEnv) {
    if (overridesEnsuredFor !== fromEnv) {
      try {
        await patchConvaiAgent(fromEnv, { platform_settings: OVERRIDES_PLATFORM_SETTINGS });
      } catch (e) {
        console.error("[trial agent] enable overrides", e instanceof Error ? e.message : e);
      }
      overridesEnsuredFor = fromEnv;
    }
    return fromEnv;
  }

  if (cachedTrialAgentId) return cachedTrialAgentId;

  const stored = await readStoredTrialAgentId();
  if (stored) {
    try {
      await getConvaiAgent(stored);
      cachedTrialAgentId = stored;
      return stored;
    } catch {
      // Agent deleted upstream; recreate below.
    }
  }

  const id = await createFreshTrialAgent();
  await storeTrialAgentId(id);
  cachedTrialAgentId = id;
  return id;
}

export async function createTrialSignedUrl(): Promise<{ agentId: string; signedUrl: string }> {
  const agentId = await ensureTrialAgentId();
  const signedUrl = await getConvaiSignedUrl(agentId);
  return { agentId, signedUrl };
}
