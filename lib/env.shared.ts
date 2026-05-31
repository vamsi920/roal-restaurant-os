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
  NEXT_PUBLIC_SUPABASE_URL:
    "Supabase Dashboard → Project Settings → API → Project URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    "Supabase Dashboard → Project Settings → API → anon / publishable key",
  SUPABASE_SERVICE_ROLE_KEY:
    "Supabase Dashboard → Project Settings → API → service_role (server only; never expose to the browser)",
  GEMINI_API_KEY: "Google AI Studio → API keys (https://aistudio.google.com/apikey)",
  GEMINI_MODEL: "Optional override, e.g. gemini-2.5-flash",
  ELEVENLABS_API_KEY:
    "ElevenLabs → Profile → API Keys (server only; never NEXT_PUBLIC_)",
  ELEVENLABS_AGENT_ID:
    "ElevenLabs → Conversational AI → your agent → Agent ID",
  AGENT_TOOL_SECRET:
    "Legacy global bearer for agent tools; set the same value in Supabase Edge secrets",
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
  NEXT_PUBLIC_APP_URL:
    "Public site origin without trailing slash, e.g. https://getroal.com (local: http://localhost:3000)",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    "Stripe Dashboard → Developers → API keys (planned billing)",
  STRIPE_SECRET_KEY:
    "Stripe secret key (planned billing; server only)",
  STRIPE_WEBHOOK_SECRET:
    "Stripe webhook signing secret (planned billing)",
};
