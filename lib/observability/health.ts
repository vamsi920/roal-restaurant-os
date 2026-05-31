import { getEnvStatus, getServerEnv } from "@/lib/env.server";
import { getPublicEnv } from "@/lib/env.public";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

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
    supabase_db: HealthCheckResult;
    gemini: HealthCheckResult;
    elevenlabs: HealthCheckResult;
    edge_get_menu: HealthCheckResult;
    edge_sync_draft_order: HealthCheckResult;
    edge_finalize_order: HealthCheckResult;
    edge_get_order_status: HealthCheckResult;
    edge_get_caller_history: HealthCheckResult;
    edge_submit_reservation_request: HealthCheckResult;
    edge_get_restaurant_info: HealthCheckResult;
  };
};

async function probeEdgeFunction(
  url: string
): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(6_000),
    });
    const latency_ms = Date.now() - start;
    const ok = res.ok || res.status === 204 || res.status === 405;
    return {
      ok,
      status: ok ? "pass" : "warn",
      latency_ms,
      message: ok ? "Reachable" : `Unexpected status ${res.status}`,
      details: { reachable: ok },
    };
  } catch (e) {
    return {
      ok: false,
      status: "fail",
      latency_ms: Date.now() - start,
      message: e instanceof Error ? e.message : "Unreachable",
    };
  }
}

export async function runHealthChecks(): Promise<HealthReport> {
  const timestamp = new Date().toISOString();
  const checks: HealthReport["checks"] = {
    env_public: { ok: false, status: "fail" },
    env_server: { ok: false, status: "fail" },
    supabase_db: { ok: false, status: "fail" },
    gemini: { ok: false, status: "fail" },
    elevenlabs: { ok: false, status: "fail" },
    edge_get_menu: { ok: false, status: "fail" },
    edge_sync_draft_order: { ok: false, status: "fail" },
    edge_finalize_order: { ok: false, status: "fail" },
    edge_get_order_status: { ok: false, status: "fail" },
    edge_get_caller_history: { ok: false, status: "fail" },
    edge_submit_reservation_request: { ok: false, status: "fail" },
    edge_get_restaurant_info: { ok: false, status: "fail" },
  };

  try {
    const pub = getPublicEnv();
    checks.env_public = {
      ok: true,
      status: "pass",
      details: {
        supabase_url_configured: Boolean(pub.NEXT_PUBLIC_SUPABASE_URL),
        anon_key_configured: Boolean(pub.NEXT_PUBLIC_SUPABASE_ANON_KEY),
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
    if (!flags.gemini) missingOptional.push("GEMINI_API_KEY");
    if (!flags.elevenlabs) missingOptional.push("ELEVENLABS_API_KEY");
    if (!flags.agentTools) {
      missingOptional.push("AGENT_TOOL_SIGNING_SECRET");
    }
    if (!flags.serviceRole) missingOptional.push("SUPABASE_SERVICE_ROLE_KEY");

    checks.env_server = {
      ok: flags.supabase,
      status: flags.supabase ? (missingOptional.length ? "warn" : "pass") : "fail",
      message: flags.supabase
        ? missingOptional.length
          ? `Optional: ${missingOptional.join(", ")}`
          : "Core server env present"
        : "Missing required server configuration",
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

    const edgeBase = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
    const [
      getMenu,
      syncDraft,
      finalize,
      getOrderStatus,
      getCallerHistory,
      submitReservationRequest,
      getRestaurantInfo,
    ] = await Promise.all([
      probeEdgeFunction(`${edgeBase}/functions/v1/get-menu`),
      probeEdgeFunction(`${edgeBase}/functions/v1/sync-draft-order`),
      probeEdgeFunction(`${edgeBase}/functions/v1/finalize-order`),
      probeEdgeFunction(`${edgeBase}/functions/v1/get-order-status`),
      probeEdgeFunction(`${edgeBase}/functions/v1/get-caller-history`),
      probeEdgeFunction(`${edgeBase}/functions/v1/submit-reservation-request`),
      probeEdgeFunction(`${edgeBase}/functions/v1/get-restaurant-info`),
    ]);
    checks.edge_get_menu = getMenu;
    checks.edge_sync_draft_order = syncDraft;
    checks.edge_finalize_order = finalize;
    checks.edge_get_order_status = getOrderStatus;
    checks.edge_get_caller_history = getCallerHistory;
    checks.edge_submit_reservation_request = submitReservationRequest;
    checks.edge_get_restaurant_info = getRestaurantInfo;
  } catch (e) {
    checks.env_server = {
      ok: false,
      status: "fail",
      message: e instanceof Error ? e.message : "Server env error",
    };
    checks.gemini = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.elevenlabs = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.edge_get_menu = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.edge_sync_draft_order = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.edge_finalize_order = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.edge_get_order_status = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.edge_get_caller_history = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.edge_submit_reservation_request = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
    checks.edge_get_restaurant_info = {
      ok: false,
      status: "warn",
      message: "Skipped (env error)",
    };
  }

  const supabase = getServiceRoleSupabase();
  if (!supabase) {
    checks.supabase_db = {
      ok: false,
      status: "warn",
      message: "SUPABASE_SERVICE_ROLE_KEY not set; DB ping skipped",
    };
  } else {
    const start = Date.now();
    const { error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);
    const latency_ms = Date.now() - start;
    checks.supabase_db = {
      ok: !error,
      status: error ? "fail" : "pass",
      latency_ms,
      message: error ? error.message : "Connected",
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
  /(^|_)(secret|token|password|api_key|authorization|bearer|service_role)($|_)/i;

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
    if (key === "supabase_url") continue;
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
