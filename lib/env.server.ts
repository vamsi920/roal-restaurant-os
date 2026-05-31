import { z } from "zod";
import {
  ENV_HINTS,
  EnvValidationError,
  emptyToUndefined,
  optionalString,
  parseEnv,
  type EnvIssue,
} from "@/lib/env.shared";
import { getPublicEnv, resetPublicEnvCache, type PublicEnv } from "@/lib/env.public";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: optionalString,
  ELEVENLABS_API_KEY: optionalString,
  ELEVENLABS_AGENT_ID: optionalString,
  AGENT_TOOL_SECRET: optionalString,
  AGENT_TOOL_SIGNING_SECRET: optionalString,
  ELEVENLABS_SYNC_TOKEN: optionalString,
  ELEVENLABS_CONVERSATION_INIT_SECRET: optionalString,
  ELEVENLABS_WEBHOOK_SECRET: optionalString,
  RESTAURANT_AGENT_TIMEZONE: optionalString,
  ROAL_ORDER_KB: z.preprocess((v) => {
    const x = emptyToUndefined(v);
    if (x === undefined) return undefined;
    return String(x).trim();
  }, z.string().optional()),
  ROAL_SYNC_RESTAURANT_ID: optionalString,
  ROAL_SYNC_RESTAURANT_NAME: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
});

export type ServerSecrets = z.infer<typeof serverEnvSchema>;

export type ServerEnv = PublicEnv & ServerSecrets;

let cachedSecrets: ServerSecrets | null = null;

function getSecrets(): ServerSecrets {
  if (cachedSecrets) return cachedSecrets;
  cachedSecrets = parseEnv(serverEnvSchema, process.env, ENV_HINTS);
  return cachedSecrets;
}

/** Validated public + server-only environment (use from server code only). */
export function getServerEnv(): ServerEnv {
  return { ...getPublicEnv(), ...getSecrets() };
}

export { getPublicEnv, resetPublicEnvCache } from "@/lib/env.public";
export type { PublicEnv } from "@/lib/env.public";
export { EnvValidationError } from "@/lib/env.shared";

export function resetServerEnvCache(): void {
  cachedSecrets = null;
  resetPublicEnvCache();
}

function requireField(
  value: string | undefined,
  path: string,
  purpose: string
): string {
  if (value?.trim()) return value.trim();
  throw new EnvValidationError([
    {
      path,
      message: `Required for ${purpose}`,
      hint: ENV_HINTS[path],
    },
  ]);
}

export function requireGeminiEnv(): { apiKey: string; model?: string } {
  const env = getServerEnv();
  return {
    apiKey: requireField(env.GEMINI_API_KEY, "GEMINI_API_KEY", "menu scanning (Gemini Vision)"),
    model: env.GEMINI_MODEL,
  };
}

export function requireElevenLabsApiKey(): string {
  const env = getServerEnv();
  return requireField(
    env.ELEVENLABS_API_KEY,
    "ELEVENLABS_API_KEY",
    "ElevenLabs Conversational AI API calls"
  );
}

export function getElevenLabsAgentId(fallback?: string | null): string | null {
  const env = getServerEnv();
  return fallback?.trim() || env.ELEVENLABS_AGENT_ID || null;
}

export function requireElevenLabsAgentId(fallback?: string | null): string {
  const id = getElevenLabsAgentId(fallback);
  if (id) return id;
  throw new EnvValidationError([
    {
      path: "ELEVENLABS_AGENT_ID",
      message:
        "Required: set ELEVENLABS_AGENT_ID in .env or pass agent_id in the request",
      hint: ENV_HINTS.ELEVENLABS_AGENT_ID,
    },
  ]);
}

export function requireRoalToolSecrets(): {
  agentToolSecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  edgeBase: string;
} {
  const env = getServerEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  return {
    agentToolSecret: requireField(
      env.AGENT_TOOL_SIGNING_SECRET || env.AGENT_TOOL_SECRET,
      "AGENT_TOOL_SIGNING_SECRET",
      "ElevenLabs → Supabase Edge tool authentication (or AGENT_TOOL_SECRET)"
    ),
    supabaseUrl,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    edgeBase: supabaseUrl,
  };
}

export function getServiceRoleKey(): string | undefined {
  return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
}

export function isRoalOrderKbEnabled(): boolean {
  return getServerEnv().ROAL_ORDER_KB !== "0";
}

export function getRestaurantAgentTimezone(): string | undefined {
  return getServerEnv().RESTAURANT_AGENT_TIMEZONE;
}

export function getElevenLabsSyncToken(): string | undefined {
  return getServerEnv().ELEVENLABS_SYNC_TOKEN;
}

export function getElevenLabsConversationInitSecret(): string | undefined {
  return getServerEnv().ELEVENLABS_CONVERSATION_INIT_SECRET;
}

export function getElevenLabsWebhookSecret(): string | undefined {
  return getServerEnv().ELEVENLABS_WEBHOOK_SECRET;
}

/** Summarize config for health checks / ops (no secret values). */
export function getEnvStatus(): {
  supabase: boolean;
  serviceRole: boolean;
  gemini: boolean;
  elevenlabs: boolean;
  agentTools: boolean;
  agentToolSigning: boolean;
  appUrl: boolean;
  stripe: boolean;
} {
  const env = getServerEnv();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  return {
    supabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
    elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
    agentTools: Boolean(env.AGENT_TOOL_SIGNING_SECRET || env.AGENT_TOOL_SECRET),
    agentToolSigning: Boolean(env.AGENT_TOOL_SIGNING_SECRET),
    appUrl: Boolean(env.NEXT_PUBLIC_APP_URL || vercelUrl),
    stripe: Boolean(
      env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ),
  };
}

export function collectMissingForFeature(
  feature: "scanner" | "elevenlabs" | "voice-sync" | "kds-receipts"
): EnvIssue[] {
  const env = getServerEnv();
  const missing: EnvIssue[] = [];

  const need = (cond: boolean, path: string, message: string) => {
    if (!cond) missing.push({ path, message, hint: ENV_HINTS[path] });
  };

  switch (feature) {
    case "scanner":
      need(Boolean(env.GEMINI_API_KEY), "GEMINI_API_KEY", "Menu scanner requires Gemini");
      need(
        Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
        "NEXT_PUBLIC_SUPABASE_URL",
        "Required"
      );
      break;
    case "elevenlabs":
      need(Boolean(env.ELEVENLABS_API_KEY), "ELEVENLABS_API_KEY", "Required");
      break;
    case "voice-sync":
      need(Boolean(env.ELEVENLABS_API_KEY), "ELEVENLABS_API_KEY", "Required");
      need(
        Boolean(env.AGENT_TOOL_SIGNING_SECRET || env.AGENT_TOOL_SECRET),
        "AGENT_TOOL_SIGNING_SECRET",
        "Set AGENT_TOOL_SIGNING_SECRET or AGENT_TOOL_SECRET"
      );
      break;
    case "kds-receipts":
      need(
        Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
        "SUPABASE_SERVICE_ROLE_KEY",
        "Recommended for reliable phone-order receipt reads when RLS is open or strict"
      );
      break;
  }

  return missing;
}
