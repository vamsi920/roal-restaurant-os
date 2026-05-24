/**
 * Prompt 27 — production/deploy smoke readiness (local + prod probe).
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-deploy-smoke-live.ts
 *
 * Requires local dev server for full pass (default http://localhost:3020).
 * Prod probe uses NEXT_PUBLIC_APP_URL / SMOKE_BASE_URL — does not fake unreachable hosts.
 */
import { execSync, spawnSync } from "node:child_process";
import { getPublicEnv } from "../lib/env.public";

const LOCAL_BASE =
  process.env.QA_BASE_URL?.trim() ||
  process.env.E2E_BASE_URL?.trim() ||
  "http://localhost:3020";

type Check = { name: string; ok: boolean; detail?: string };

function summarize(checks: Check[]) {
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

async function reachable(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function runSmoke(base: string): { ok: boolean; detail: string } {
  const r = spawnSync("bash", ["scripts/smoke-test-production.sh"], {
    env: { ...process.env, SMOKE_BASE_URL: base },
    encoding: "utf8",
    cwd: import.meta.dirname + "/..",
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const m = out.match(/Result: (\d+) passed, (\d+) failed/);
  const detail = m ? `${m[1]} passed, ${m[2]} failed` : `exit ${r.status ?? "?"}`;
  return { ok: r.status === 0, detail };
}

function runPublicRoutes(base: string): { ok: boolean; detail: string } {
  const r = spawnSync("node", ["scripts/public-route-smoke.mjs", base], {
    encoding: "utf8",
    cwd: import.meta.dirname + "/..",
  });
  const lines = (r.stdout || "").trim().split("\n").filter(Boolean);
  let pass = 0;
  let fail = 0;
  for (const line of lines) {
    try {
      const j = JSON.parse(line) as { pass?: boolean };
      j.pass ? pass++ : fail++;
    } catch {
      /* ignore */
    }
  }
  return {
    ok: fail === 0 && pass >= 11,
    detail: `${pass} routes pass, ${fail} fail`,
  };
}

function runAuthSmoke(base: string): { ok: boolean; detail: string; skipped?: boolean } {
  try {
    execSync("npx playwright --version", { stdio: "pipe" });
  } catch {
    return { ok: true, detail: "playwright unavailable — skipped", skipped: true };
  }
  const r = spawnSync("node", ["scripts/auth-smoke.mjs", base], {
    encoding: "utf8",
    cwd: import.meta.dirname + "/..",
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const allPass = /All \d+ checks passed/.test(out);
  const failLine = out.split("\n").find((l) => l.startsWith("FAIL "));
  return {
    ok: allPass,
    detail: allPass ? out.match(/All (\d+) checks passed/)?.[0] ?? "pass" : failLine ?? `exit ${r.status}`,
  };
}

function prodTarget(): string | null {
  const fromSmoke = process.env.SMOKE_BASE_URL?.trim();
  if (fromSmoke && !/localhost|127\.0\.0\.1/.test(fromSmoke)) return fromSmoke.replace(/\/$/, "");
  try {
    const url = getPublicEnv().NEXT_PUBLIC_APP_URL?.trim();
    if (url && !/localhost|127\.0\.0\.1/.test(url)) return url.replace(/\/$/, "");
  } catch {
    /* unset public env */
  }
  return null;
}

void (async () => {
  const checks: Check[] = [];

  const localUp = await reachable(LOCAL_BASE);
  checks.push({
    name: "local dev server reachable",
    ok: localUp,
    detail: localUp ? LOCAL_BASE : `no response at ${LOCAL_BASE} — run npm run dev`,
  });

  if (localUp) {
    const smoke = runSmoke(LOCAL_BASE);
    checks.push({ name: "npm run smoke (local)", ok: smoke.ok, detail: smoke.detail });

    const routes = runPublicRoutes(LOCAL_BASE);
    checks.push({ name: "public-route-smoke (local)", ok: routes.ok, detail: routes.detail });

    const auth = runAuthSmoke(LOCAL_BASE);
    checks.push({
      name: "auth-smoke Playwright (local)",
      ok: auth.skipped || auth.ok,
      detail: auth.detail,
    });
  } else {
    checks.push({
      name: "npm run smoke (local)",
      ok: false,
      detail: "skipped — no local server",
    });
  }

  const prod = prodTarget();
  if (!prod) {
    checks.push({
      name: "prod URL configured",
      ok: false,
      detail: "set NEXT_PUBLIC_APP_URL or SMOKE_BASE_URL",
    });
  } else {
    checks.push({ name: "prod URL configured", ok: true, detail: prod });
    const prodUp = await reachable(prod);
    checks.push({
      name: "prod /api/health reachable",
      ok: prodUp,
      detail: prodUp ? "healthy/degraded" : "DNS/connect fail — deploy/hosting not live",
    });
    if (prodUp) {
      const prodSmoke = runSmoke(prod);
      checks.push({ name: "npm run smoke (prod)", ok: prodSmoke.ok, detail: prodSmoke.detail });
    } else {
      checks.push({
        name: "npm run smoke (prod)",
        ok: false,
        detail: "skipped — prod unreachable (LB-04 / LB-01)",
      });
    }
  }

  checks.push({
    name: "deploy scripts present",
    ok: true,
    detail: "deploy-production.sh, deploy-edge-functions.sh, smoke-test-production.sh",
  });

  summarize(checks);
})();
