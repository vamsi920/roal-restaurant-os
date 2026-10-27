import { isPubliclyReachableToolBase, tryAgentToolsBaseUrl } from "@/lib/agent-tools/base-url";
import { getEnvStatus, getServerEnv } from "@/lib/env.server";
import { getPublicEnv, isFirebaseClientConfigured } from "@/lib/env.public";
import { getDb } from "@/lib/db";

export type HealthCheckResult = {
  ok: boolean;
  status: "pass" | "warn" | "fail";
  message?: string;
  latency_ms?: number;
  details?: Record<string, unknown>;
};

export type HealthReport = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    env_public: HealthCheckResult;
    env_server: HealthCheckResult;
    database: HealthCheckResult;
    gemini: HealthCheckResult;
    elevenlabs: HealthCheckResult;
    agent_tools: HealthCheckResult;
  };
};

export async function runHealthChecks(): Promise<HealthReport> {
  const timestamp = new Date().toISOString();
  const checks: HealthReport["checks"] = {
    env_public: { ok: false, status: "fail" },
    env_server: { ok: false, status: "fail" },
    database: { ok: false, status: "fail" },
    gemini: { ok: false, status: "fail" },
    elevenlabs: { ok: false, status: "fail" },
    agent_tools: { ok: false, status: "fail" },
  };

  try {
    const pub = getPublicEnv();
    const firebase = isFirebaseClientConfigured(pub);
    checks.env_public = {
      ok: true,
      status: firebase ? "pass" : "warn",
      message: firebase ? "Firebase web config present" : "Firebase not configured; demo mode",
      details: {
        firebase_configured: firebase,
        app_url_configured: Boolean(pub.NEXT_PUBLIC_APP_URL),
      },
    };
  } catch (e) {
    checks.env_public = {
      ok: false,
      status: "fail",
      message: e instanceof Error ? e.message : "Invalid public env",
    };
  }

  try {
    const env = getServerEnv();
    const flags = getEnvStatus();
    const missingOptional: string[] = [];
    if (!flags.firebaseAdmin) missingOptional.push("FIREBASE_SERVICE_ACCOUNT");
    if (!flags.gemini) missingOptional.push("GEMINI_API_KEY");
    if (!flags.elevenlabs) missingOptional.push("ELEVENLABS_API_KEY");
    if (!flags.agentTools) missingOptional.push("AGENT_TOOL_SIGNING_SECRET");
    if (!flags.places) missingOptional.push("GOOGLE_PLACES_API_KEY");

    checks.env_server = {
      ok: true,
      status: missingOptional.length ? "warn" : "pass",
      message: flags.demoMode
        ? "Demo mode (no Firebase credentials)"
        : missingOptional.length
          ? `Optional: ${missingOptional.join(", ")}`
          : "Core server env present",
      details: flags,
    };

    checks.gemini = {
      ok: flags.gemini,
      status: flags.gemini ? "pass" : "warn",
      message: flags.gemini ? "API key configured" : "GEMINI_API_KEY not set",
    };

    checks.elevenlabs = {
      ok: flags.elevenlabs,
      status: flags.elevenlabs ? "pass" : "warn",
      message: flags.elevenlabs
        ? "API key configured"
        : "ELEVENLABS_API_KEY not set",
      details: {
        agent_id_configured: Boolean(env.ELEVENLABS_AGENT_ID),
      },
    };

    const https = isPubliclyReachableToolBase(tryAgentToolsBaseUrl());
    const toolsOk = flags.agentTools && https;
    checks.agent_tools = {
      ok: toolsOk,
      status: toolsOk ? "pass" : "warn",
      message: !flags.agentTools
        ? "AGENT_TOOL_SIGNING_SECRET not set"
        : https
          ? "Agent tools reachable at a public https origin"
          : "Set ROAL_AGENT_TOOLS_BASE_URL or NEXT_PUBLIC_APP_URL to a public https origin",
      details: {
        signing_secret_configured: flags.agentToolSigning,
        public_https_origin: https,
      },
    };
  } catch (e) {
    checks.env_server = {
      ok: false,
      status: "fail",
      message: e instanceof Error ? e.message : "Server env error",
    };
    for (const key of ["gemini", "elevenlabs", "agent_tools"] as const) {
      checks[key] = { ok: false, status: "warn", message: "Skipped (env error)" };
    }
  }

  const start = Date.now();
  try {
    const db = getDb();
    const { error } = await db.from("organizations").select("id").limit(1);
    const latency_ms = Date.now() - start;
    checks.database = {
      ok: !error,
      status: error ? "fail" : db.backend === "memory" ? "warn" : "pass",
      latency_ms,
      message: error
        ? error.message
        : db.backend === "memory"
          ? "In-memory demo store (data is not durable)"
          : "Firestore connected",
      details: { firestore: db.backend === "firestore" },
    };
  } catch (e) {
    checks.database = {
      ok: false,
      status: "fail",
      latency_ms: Date.now() - start,
      message: e instanceof Error ? e.message : "Database unreachable",
    };
  }

  const failCount = Object.values(checks).filter((c) => c.status === "fail").length;
  const warnCount = Object.values(checks).filter((c) => c.status === "warn").length;

  let status: HealthReport["status"] = "healthy";
  if (failCount > 0 || !checks.env_public.ok) {
    status = "unhealthy";
  } else if (warnCount > 0) {
    status = "degraded";
  }

  return { status, timestamp, checks };
}

const URL_IN_TEXT = /https?:\/\/[^\s]+/gi;
const SENSITIVE_DETAIL_KEY =
  /(^|_)(secret|token|password|api_key|authorization|bearer|service_account|private_key)($|_)/i;

function redactHealthMessage(message?: string): string | undefined {
  if (!message) return undefined;
  return message.replace(URL_IN_TEXT, "[redacted-url]");
}

function sanitizeCheckDetails(
  details?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_DETAIL_KEY.test(key)) continue;
    if (typeof value !== "boolean") continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Strip URLs and sensitive keys before exposing health on a public endpoint. */
export function sanitizeHealthReportForPublic(
  report: HealthReport
): HealthReport {
  const checks = {} as HealthReport["checks"];
  for (const key of Object.keys(report.checks) as (keyof HealthReport["checks"])[]) {
    const check = report.checks[key];
    checks[key] = {
      ...check,
      message: redactHealthMessage(check.message),
      details: sanitizeCheckDetails(check.details),
    };
  }
  return { ...report, checks };
}
