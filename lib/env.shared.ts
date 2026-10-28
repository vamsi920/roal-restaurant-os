import { z } from "zod";

export type EnvIssue = {
  path: string;
  message: string;
  hint?: string;
};

export class EnvValidationError extends Error {
  readonly issues: EnvIssue[];

  constructor(issues: EnvIssue[]) {
    super(formatEnvValidationMessage(issues));
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

export function formatEnvValidationMessage(issues: EnvIssue[]): string {
  const lines = [
    "Environment configuration is invalid or incomplete.",
    "",
    ...issues.flatMap((i) => {
      const block = [`• ${i.path}: ${i.message}`];
      if (i.hint) block.push(`  → ${i.hint}`);
      return block;
    }),
    "",
    "Copy .env.example to .env in the project root and fill in the values.",
    "If you use .env.local, it overrides .env — remove duplicate keys or align both files.",
  ];
  return lines.join("\n");
}

/** Treat blank strings as unset (common in .env files). */
export function emptyToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

export const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional()
);

export function zodToEnvIssues(
  error: z.ZodError,
  hints: Record<string, string> = {}
): EnvIssue[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".") || "env";
    return {
      path,
      message: issue.message,
      hint: hints[path],
    };
  });
}

export function parseEnv<T>(
  schema: z.ZodType<T>,
  source: NodeJS.ProcessEnv | Record<string, string | undefined>,
  hints: Record<string, string> = {}
): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(zodToEnvIssues(result.error, hints));
  }
  return result.data;
}

export const ENV_HINTS: Record<string, string> = {
  NEXT_PUBLIC_FIREBASE_API_KEY:
    "Firebase console → Project settings → Your apps → Web app → apiKey (optional; missing = demo mode)",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    "Firebase web app config → authDomain, e.g. <project-id>.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "Firebase web app config → projectId",
  NEXT_PUBLIC_FIREBASE_APP_ID: "Firebase web app config → appId",
  FIREBASE_SERVICE_ACCOUNT:
    "Firebase console → Project settings → Service accounts → Generate new private key; paste the JSON on ONE line (server only)",
  ROAL_DEMO_MODE:
    "Set to 1 to force demo mode (local demo owner + in-memory data) even in production builds",
  ROAL_DEMO_DB_FILE:
    "Demo-mode persistence file (default .data/demo-db.json); set to off to keep demo data in memory only",
  ROAL_AGENT_TOOLS_BASE_URL:
    "Public https origin ElevenLabs calls for /api/agent-tools/* (local dev: a tunnel URL); defaults to NEXT_PUBLIC_APP_URL",
  OPENAI_API_KEY: "OpenAI platform → API keys (https://platform.openai.com/api-keys); server only",
  OPENAI_MODEL: "Optional override, default gpt-5.4-mini",
  ELEVENLABS_API_KEY:
    "ElevenLabs → Profile → API Keys (server only; never NEXT_PUBLIC_)",
  ELEVENLABS_AGENT_ID:
    "ElevenLabs → Conversational AI → your agent → Agent ID",
  AGENT_TOOL_SECRET:
    "Legacy global bearer for agent tools (/api/agent-tools/*)",
  AGENT_TOOL_SIGNING_SECRET:
    "Preferred HMAC secret for per-restaurant roal1.* tokens (falls back to AGENT_TOOL_SECRET)",
  ELEVENLABS_CONVERSATION_INIT_SECRET:
    "Optional shared secret for GET/POST /api/integrations/elevenlabs/conversation-init (Twilio personalization webhook)",
  ELEVENLABS_WEBHOOK_SECRET:
    "Shared HMAC secret from ElevenLabs post-call webhook settings",
  ELEVENLABS_SYNC_TOKEN:
    "Optional: require Authorization Bearer on POST /api/integrations/elevenlabs/sync-roal-tools",
  RESTAURANT_AGENT_TIMEZONE:
    "IANA timezone for the voice agent, e.g. America/Chicago",
  GOOGLE_PLACES_API_KEY:
    "Google Cloud → Places API (New) key for restaurant lookup (server only)",
  TWILIO_ACCOUNT_SID: "Twilio console → Account Info → Account SID (buys a phone line per restaurant)",
  TWILIO_AUTH_TOKEN: "Twilio console → Account Info → Auth Token (server only)",
  ELEVENLABS_AGENT_PHONE_NUMBER_ID:
    "Optional ElevenLabs phone number id for outbound owner test calls",
  NEXT_PUBLIC_APP_URL:
    "Public site origin without trailing slash, e.g. https://tryroal.com (local: http://localhost:3000)",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    "Stripe Dashboard → Developers → API keys (planned billing)",
  STRIPE_SECRET_KEY:
    "Stripe secret key (planned billing; server only)",
  STRIPE_WEBHOOK_SECRET:
    "Stripe webhook signing secret (planned billing)",
};
