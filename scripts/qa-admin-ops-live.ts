/**
 * Prompt 24 — admin ops live pass (access, health, sanitization, no leaks).
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-admin-ops-live.ts
 */
import { sanitizeOpsErrorDetail } from "../lib/admin/sanitize-ops-detail";
import { loadAdminOpsSnapshot } from "../lib/admin/load-ops-snapshot";
import { hasOrgAdminAccess } from "../lib/auth/context-server";
import { isOrgAdmin } from "../lib/auth/roles";
import { getEnvStatus } from "../lib/env.server";
import { sanitizeHealthReportForPublic, runHealthChecks } from "../lib/observability/health";
import type { AuthContext } from "../lib/auth/types";
import { getServiceRoleSupabase } from "../lib/supabase/server";

const LEGACY_ORG =
  process.env.QA_ADMIN_ORG_ID?.trim() ||
  "00000000-0000-4000-8000-000000000001";
const BASE_URL =
  process.env.QA_BASE_URL?.trim() ||
  process.env.E2E_BASE_URL?.trim() ||
  "http://localhost:3020";

const LEAK_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "stripe sk-", re: /\bsk-[a-zA-Z0-9]{8,}\b/ },
  { name: "jwt eyJ", re: /\beyJ[a-zA-Z0-9._-]{20,}/ },
  { name: "roal1 token", re: /\broal1\.[a-zA-Z0-9._-]{8,}/i },
  { name: "raw https URL", re: /https:\/\/(?!example\.invalid)[^\s"'\]]+/i },
  { name: "service role key name=value", re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/i },
];

type Check = { name: string; ok: boolean; detail?: string };

function summarize(checks: Check[]) {
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

function scanLeaks(label: string, text: string): Check[] {
  return LEAK_PATTERNS.map((p) => ({
    name: `${label}: no ${p.name}`,
    ok: !p.re.test(text),
  }));
}

function mockContext(role: "owner" | "admin" | "member"): AuthContext {
  return {
    user: { id: `u-${role}`, email: `${role}@example.invalid` },
    memberships: [
      {
        id: "m1",
        organization_id: LEGACY_ORG,
        user_id: `u-${role}`,
        role,
        created_at: new Date().toISOString(),
        organization: {
          id: LEGACY_ORG,
          name: "Legacy POC",
          slug: "legacy",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ],
    primaryMembership: null,
  } as AuthContext;
}

void (async () => {
  const checks: Check[] = [];

  checks.push({
    name: "owner isOrgAdmin",
    ok: isOrgAdmin("owner"),
  });
  checks.push({
    name: "admin isOrgAdmin",
    ok: isOrgAdmin("admin"),
  });
  checks.push({
    name: "member isOrgAdmin false",
    ok: !isOrgAdmin("member"),
  });
  checks.push({
    name: "hasOrgAdminAccess owner",
    ok: hasOrgAdminAccess(mockContext("owner")),
  });
  checks.push({
    name: "hasOrgAdminAccess admin",
    ok: hasOrgAdminAccess(mockContext("admin")),
  });
  checks.push({
    name: "hasOrgAdminAccess member false",
    ok: !hasOrgAdminAccess(mockContext("member")),
  });

  try {
    const adminRes = await fetch(`${BASE_URL}/dashboard/admin`, {
      redirect: "manual",
    });
    checks.push({
      name: "GET /dashboard/admin guest → login",
      ok: adminRes.status === 307 || adminRes.status === 302,
      detail: `HTTP ${adminRes.status}`,
    });
    const loc = adminRes.headers.get("location") ?? "";
    checks.push({
      name: "admin guest redirect preserves next=",
      ok: loc.includes("next=") && loc.includes("admin"),
      detail: loc ? "ok" : "missing location",
    });
  } catch (e) {
    checks.push({
      name: "GET /dashboard/admin guest → login",
      ok: false,
      detail: e instanceof Error ? e.message : "fetch failed",
    });
  }

  let healthBody = "";
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    healthBody = await healthRes.text();
    checks.push({
      name: "GET /api/health HTTP 200 or 503",
      ok: healthRes.status === 200 || healthRes.status === 503,
      detail: `HTTP ${healthRes.status}`,
    });
    const parsed = JSON.parse(healthBody) as {
      status?: string;
      checks?: Record<string, { details?: Record<string, unknown> }>;
    };
    checks.push({
      name: "health JSON has status + checks",
      ok: Boolean(parsed.status && parsed.checks),
      detail: parsed.status,
    });
    const details = parsed.checks?.env_public?.details ?? {};
    checks.push({
      name: "health env_public drops supabase_url",
      ok: !("supabase_url" in details),
    });
  } catch (e) {
    checks.push({
      name: "GET /api/health",
      ok: false,
      detail: e instanceof Error ? e.message : "fetch failed",
    });
  }

  checks.push(...scanLeaks("live /api/health", healthBody));

  const rawHealth = await runHealthChecks();
  const safeHealth = sanitizeHealthReportForPublic(rawHealth);
  checks.push({
    name: "sanitizeHealthReportForPublic runs",
    ok: safeHealth.status === rawHealth.status,
    detail: safeHealth.status,
  });
  checks.push(...scanLeaks("sanitized health report", JSON.stringify(safeHealth)));

  const envFlags = getEnvStatus();
  checks.push({
    name: "getEnvStatus values are boolean",
    ok: Object.values(envFlags).every((v) => typeof v === "boolean"),
  });

  const sanitizedErr = sanitizeOpsErrorDetail(
    "Failed https://hooks.example.com/x Bearer eyJhbGciOiJIUzI1NiJ9.x.y sk-abcdefghijklmnopqrstuvwxyz"
  );
  checks.push({
    name: "sanitizeOpsErrorDetail redacts secrets",
    ok:
      !sanitizedErr.includes("hooks.example.com") &&
      !sanitizedErr.includes("sk-abcdef") &&
      !sanitizedErr.includes("eyJhbGci"),
  });

  const sb = getServiceRoleSupabase();
  if (!sb) {
    checks.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      ok: false,
      detail: "missing",
    });
    summarize(checks);
    return;
  }

  const snapshot = await loadAdminOpsSnapshot(sb, [
    {
      organizationId: LEGACY_ORG,
      organizationName: "Legacy POC",
      role: "owner",
    },
  ]);
  checks.push({
    name: "admin snapshot loads org + health",
    ok:
      snapshot.organizations.length === 1 &&
      snapshot.health.status.length > 0 &&
      snapshot.envFlags.supabase === true,
    detail: `${snapshot.organizations[0]?.restaurants.length} restaurants`,
  });

  const agentSuffix = snapshot.organizations[0]?.restaurants[0]?.sync.agentIdSuffix;
  if (agentSuffix) {
    checks.push({
      name: "agent id shown as suffix only",
      ok: agentSuffix.startsWith("···") && agentSuffix.length <= 12,
      detail: agentSuffix,
    });
  }

  checks.push(...scanLeaks("admin ops snapshot", JSON.stringify(snapshot)));

  summarize(checks);
})();
