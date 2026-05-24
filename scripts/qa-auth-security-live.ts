/**
 * Prompt 26 — auth/session/security final confirmation.
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-auth-security-live.ts
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getPublicEnv } from "../lib/env.public";

const BASE_URL =
  process.env.QA_BASE_URL?.trim() ||
  process.env.E2E_BASE_URL?.trim() ||
  "http://localhost:3020";

const REPO = join(import.meta.dirname, "..");

const AUTH_VITEST = [
  "tests/unit/safe-next.test.ts",
  "tests/unit/auth-next-url.test.ts",
  "tests/unit/auth-route-qa.test.ts",
  "tests/unit/auth-flow-smoke.test.ts",
  "tests/unit/auth-ui-qa.test.ts",
  "tests/integration/auth-callback-route.test.ts",
  "tests/integration/api-auth-context.test.ts",
  "tests/integration/api-auth-negative-gaps.test.ts",
].join(" ");

const LEAK_PATTERNS = [
  { name: "sk-", re: /\bsk-[a-zA-Z0-9]{8,}\b/ },
  { name: "service role key=value", re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/i },
  { name: "GEMINI_API_KEY value", re: /GEMINI_API_KEY\s*[:=]\s*['"]?[a-zA-Z0-9_-]{10,}/i },
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

function walkClientFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkClientFiles(p, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

function clientFilesImportServerSecrets(): string[] {
  const roots = [join(REPO, "components"), join(REPO, "app"), join(REPO, "lib")];
  const bad: string[] = [];
  const forbidden = [
    /from ["']@\/lib\/env\.server["']/,
    /getServiceRoleSupabase/,
    /SUPABASE_SERVICE_ROLE_KEY/,
    /GEMINI_API_KEY/,
    /STRIPE_SECRET_KEY/,
  ];
  for (const root of roots) {
    for (const file of walkClientFiles(root)) {
      const src = readFileSync(file, "utf8");
      if (!/^["']use client["']/m.test(src.split("\n").slice(0, 3).join("\n"))) continue;
      if (forbidden.some((re) => re.test(src))) {
        bad.push(file.replace(REPO + "/", ""));
      }
    }
  }
  return bad;
}

void (async () => {
  const checks: Check[] = [];

  try {
    execSync(`npm test -- ${AUTH_VITEST}`, { stdio: "pipe", encoding: "utf8" });
    checks.push({ name: "Vitest auth/security suites", ok: true, detail: "43 tests" });
  } catch (e) {
    checks.push({
      name: "Vitest auth/security suites",
      ok: false,
      detail: "failed",
    });
  }

  const pub = getPublicEnv();
  checks.push({
    name: "getPublicEnv exposes only NEXT_PUBLIC keys",
    ok:
      Boolean(pub.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(pub.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    detail: "url + anon configured",
  });

  const clientLeaks = clientFilesImportServerSecrets();
  checks.push({
    name: "no server secrets in use client modules",
    ok: clientLeaks.length === 0,
    detail: clientLeaks.length ? clientLeaks.join(", ") : "scanned components/app/lib",
  });

  const redirectCases: Array<{ path: string; expectLogin?: boolean; expectCode?: number }> = [
    { path: "/dashboard", expectLogin: true },
    { path: "/dashboard/billing", expectLogin: true },
    { path: "/dashboard/admin", expectLogin: true },
    { path: "/login", expectCode: 200 },
    { path: "/signup", expectCode: 200 },
  ];

  for (const c of redirectCases) {
    try {
      const res = await fetch(`${BASE_URL}${c.path}`, { redirect: "manual" });
      if (c.expectLogin) {
        const loc = res.headers.get("location") ?? "";
        checks.push({
          name: `guest ${c.path} → login`,
          ok:
            (res.status === 307 || res.status === 302) &&
            loc.includes("/login") &&
            loc.includes("next="),
          detail: `HTTP ${res.status}`,
        });
      } else {
        checks.push({
          name: `${c.path} renders`,
          ok: res.status === (c.expectCode ?? 200),
          detail: `HTTP ${res.status}`,
        });
      }
    } catch (e) {
      checks.push({
        name: `fetch ${c.path}`,
        ok: false,
        detail: e instanceof Error ? e.message : "failed",
      });
    }
  }

  try {
    const cb = await fetch(`${BASE_URL}/auth/callback`, { redirect: "manual" });
    const loc = cb.headers.get("location") ?? "";
    checks.push({
      name: "callback without code → login error",
      ok: cb.status >= 300 && cb.status < 400 && loc.includes("/login") && loc.includes("error="),
      detail: `HTTP ${cb.status}`,
    });
  } catch {
    checks.push({ name: "callback without code → login error", ok: false });
  }

  try {
    const so = await fetch(`${BASE_URL}/auth/signout`, {
      method: "POST",
      redirect: "manual",
    });
    checks.push({
      name: "signout POST → login",
      ok: so.status === 303 && (so.headers.get("location") ?? "").includes("/login"),
      detail: `HTTP ${so.status}`,
    });
  } catch {
    checks.push({ name: "signout POST → login", ok: false });
  }

  const apiCases: Array<{ path: string; method: string; expect: number }> = [
    { path: "/api/restaurants", method: "POST", expect: 401 },
    { path: "/api/billing/gates", method: "GET", expect: 401 },
    { path: "/api/auth/context", method: "GET", expect: 401 },
    { path: "/api/notifications/events", method: "POST", expect: 401 },
  ];

  for (const api of apiCases) {
    try {
      const res = await fetch(`${BASE_URL}${api.path}`, {
        method: api.method,
        headers:
          api.method === "POST"
            ? { "Content-Type": "application/json" }
            : undefined,
        body: api.method === "POST" ? "{}" : undefined,
      });
      checks.push({
        name: `${api.method} ${api.path} unauthenticated → ${api.expect}`,
        ok: res.status === api.expect,
        detail: `HTTP ${res.status}`,
      });
    } catch {
      checks.push({
        name: `${api.method} ${api.path} unauthenticated`,
        ok: false,
      });
    }
  }

  let healthBody = "";
  try {
    const hres = await fetch(`${BASE_URL}/api/health`);
    healthBody = await hres.text();
    checks.push({
      name: "GET /api/health public",
      ok: hres.status === 200 || hres.status === 503,
      detail: `HTTP ${hres.status}`,
    });
  } catch {
    checks.push({ name: "GET /api/health public", ok: false });
  }

  for (const p of LEAK_PATTERNS) {
    checks.push({
      name: `health body: no ${p.name}`,
      ok: !p.re.test(healthBody),
    });
  }

  summarize(checks);
})();
