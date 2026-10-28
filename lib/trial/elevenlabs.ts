import {
  createConvaiAgent,
  duplicateConvaiAgent,
  elevenlabsFetch,
  getConvaiAgent,
  getConvaiSignedUrl,
  patchConvaiAgent,
} from "@/lib/elevenlabs";
import { CALL_GUARD_TURN } from "@/lib/elevenlabs/call-guards";
import { getElevenLabsAgentId } from "@/lib/env.server";
import { requireTrialDb } from "@/lib/trial/store";
import { DEFAULT_TRIAL_VOICE, findTrialVoice } from "@/lib/trial/voices";

const TRIAL_AGENT_CONFIG_KEY = "elevenlabs_trial_agent_id";
const TRIAL_AGENT_NAME = "ROAL — Try-a-call (shared, overrides only)";

/** Hard ceiling on a single demo call (spend cap). */
export const TRIAL_MAX_CALL_SECONDS = 300;

/**
 * Voice stack for the demo line. Eleven v4 Turbo is ElevenLabs' most emotive low-latency
 * model (90+ languages, keeps a voice's accent); expressive mode lets it laugh, soften and
 * react instead of reading lines. Synced onto the shared agent once per server process.
 */
export const TRIAL_TTS_MODEL = "eleven_v4_turbo";
export const TRIAL_LLM = "claude-haiku-5-5";

// v4 only reads stability and similarity. Lower stability lets delivery vary like a person's;
// high similarity pins the output to the reference recording and costs naturalness.
// Full eleven_v4 measured ~350ms slower to first audio on live calls, so the agent stays on Turbo.
const VOICE_STACK_CONFIG = {
  tts: {
    model_id: TRIAL_TTS_MODEL,
    expressive_mode: true,
    stability: 0.35,
    similarity_boost: 0.55,
    optimize_streaming_latency: 3,
  },
  agent: { prompt: { llm: TRIAL_LLM, temperature: 0.5 } },
  turn: { turn_eagerness: "normal", ...CALL_GUARD_TURN },
};

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
const readyLibraryVoices = new Set<string>();

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
          ...VOICE_STACK_CONFIG.agent.prompt,
        },
      },
      tts: { ...VOICE_STACK_CONFIG.tts, voice_id: DEFAULT_TRIAL_VOICE.id },
      turn: VOICE_STACK_CONFIG.turn,
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
          ...VOICE_STACK_CONFIG.agent.prompt,
        },
      },
      tts: { ...VOICE_STACK_CONFIG.tts, voice_id: DEFAULT_TRIAL_VOICE.id },
      turn: VOICE_STACK_CONFIG.turn,
      conversation: { max_duration_seconds: TRIAL_MAX_CALL_SECONDS },
    },
    platform_settings: OVERRIDES_PLATFORM_SETTINGS,
  });
  return readAgentId(created);
}

/** Keep a long-lived agent on the current voice stack and overrides (once per process). */
async function syncAgentSettings(agentId: string): Promise<void> {
  if (overridesEnsuredFor === agentId) return;
  try {
    await patchConvaiAgent(agentId, {
      conversation_config: {
        ...VOICE_STACK_CONFIG,
        tts: { ...VOICE_STACK_CONFIG.tts, voice_id: DEFAULT_TRIAL_VOICE.id },
      },
      platform_settings: OVERRIDES_PLATFORM_SETTINGS,
    });
  } catch (e) {
    console.error("[trial agent] sync settings", e instanceof Error ? e.message : e);
  }
  overridesEnsuredFor = agentId;
}

/**
 * Voice Library voices must be in the account before an agent can speak with them.
 * Adds the voice on first use and returns a voice id that is safe to send; falls back to
 * the default premade voice if the library voice cannot be added.
 */
export async function ensureVoiceReady(voiceId: string): Promise<string> {
  const voice = findTrialVoice(voiceId);
  if (!voice?.libraryOwnerId || readyLibraryVoices.has(voice.id)) return voiceId;
  try {
    const existing = await elevenlabsFetch(`/v1/voices/${voice.id}`, { method: "GET" });
    if (!existing.ok) {
      const added = await elevenlabsFetch(`/v1/voices/add/${voice.libraryOwnerId}/${voice.id}`, {
        method: "POST",
        body: JSON.stringify({ new_name: `ROAL · ${voice.accent} · ${voice.label}` }),
      });
      if (!added.ok) throw new Error(`add voice ${added.status}: ${(await added.text()).slice(0, 200)}`);
    }
    readyLibraryVoices.add(voice.id);
    return voiceId;
  } catch (e) {
    console.error("[trial voice]", voice.label, e instanceof Error ? e.message : e);
    return DEFAULT_TRIAL_VOICE.id;
  }
}

/**
 * Shared trial agent: created once, stored in `internal_config`, overrides enabled.
 * `ELEVENLABS_TRIAL_AGENT_ID` wins when set (overrides are still enabled once per process).
 */
export async function ensureTrialAgentId(): Promise<string> {
  const fromEnv = process.env.ELEVENLABS_TRIAL_AGENT_ID?.trim();
  if (fromEnv) {
    await syncAgentSettings(fromEnv);
    return fromEnv;
  }

  if (cachedTrialAgentId) return cachedTrialAgentId;

  const stored = await readStoredTrialAgentId();
  if (stored) {
    try {
      await getConvaiAgent(stored);
      await syncAgentSettings(stored);
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
