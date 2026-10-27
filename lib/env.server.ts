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
  /** Firebase Admin service-account JSON on one line (optional — missing = demo mode / in-memory data). */
  FIREBASE_SERVICE_ACCOUNT: optionalString,
  GOOGLE_APPLICATION_CREDENTIALS: optionalString,
  ROAL_DEMO_MODE: optionalString,
  ROAL_DEMO_DB_FILE: optionalString,
  /** Public https origin ElevenLabs uses for /api/agent-tools/* (tunnel in local dev). */
  ROAL_AGENT_TOOLS_BASE_URL: optionalString,
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
  GOOGLE_PLACES_API_KEY: optionalString,
  ELEVENLABS_AGENT_PHONE_NUMBER_ID: optionalString,
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

export function requireRoalToolSecrets(): { agentToolSecret: string } {
  const env = getServerEnv();
  return {
    agentToolSecret: requireField(
      env.AGENT_TOOL_SIGNING_SECRET || env.AGENT_TOOL_SECRET,
      "AGENT_TOOL_SIGNING_SECRET",
      "ElevenLabs → /api/agent-tools authentication (or AGENT_TOOL_SECRET)"
    ),
  };
}

/** Firebase Admin credentials present (Firestore + session-cookie verification). */
export function isFirebaseAdminEnvConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.FIREBASE_SERVICE_ACCOUNT || env.GOOGLE_APPLICATION_CREDENTIALS);
}

/** Demo mode = Firebase not configured (or ROAL_DEMO_MODE=1). Mirrors lib/auth/demo-mode. */
export function isDemoModeEnv(): boolean {
  const env = getServerEnv();
  if (env.ROAL_DEMO_MODE === "1") return true;
  return !(env.NEXT_PUBLIC_FIREBASE_API_KEY && isFirebaseAdminEnvConfigured());
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

export function getGooglePlacesApiKey(): string {
  const env = getServerEnv();
  return requireField(
    env.GOOGLE_PLACES_API_KEY,
    "GOOGLE_PLACES_API_KEY",
    "restaurant name lookup (Google Places)"
  );
}

export function hasGooglePlacesApiKey(): boolean {
  return Boolean(getServerEnv().GOOGLE_PLACES_API_KEY);
}

export function getElevenLabsAgentPhoneNumberId(): string | null {
  return getServerEnv().ELEVENLABS_AGENT_PHONE_NUMBER_ID ?? null;
}

/** Summarize config for health checks / ops (no secret values). */
export function getEnvStatus(): {
  firebase: boolean;
  firebaseAdmin: boolean;
  demoMode: boolean;
  gemini: boolean;
  elevenlabs: boolean;
  agentTools: boolean;
  agentToolSigning: boolean;
  appUrl: boolean;
  stripe: boolean;
  places: boolean;
  outboundCall: boolean;
} {
  const env = getServerEnv();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  return {
    firebase: Boolean(
      env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
        env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ),
    firebaseAdmin: isFirebaseAdminEnvConfigured(),
    demoMode: isDemoModeEnv(),
    gemini: Boolean(env.GEMINI_API_KEY),
    elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
    agentTools: Boolean(env.AGENT_TOOL_SIGNING_SECRET || env.AGENT_TOOL_SECRET),
    agentToolSigning: Boolean(env.AGENT_TOOL_SIGNING_SECRET),
    appUrl: Boolean(env.NEXT_PUBLIC_APP_URL || vercelUrl),
    stripe: Boolean(
      env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ),
    places: Boolean(env.GOOGLE_PLACES_API_KEY),
    outboundCall: Boolean(env.ELEVENLABS_AGENT_PHONE_NUMBER_ID),
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
        isFirebaseAdminEnvConfigured(),
        "FIREBASE_SERVICE_ACCOUNT",
        "Required for persistent phone-order receipts (demo mode keeps them in memory)"
      );
      break;
  }

  return missing;
}
