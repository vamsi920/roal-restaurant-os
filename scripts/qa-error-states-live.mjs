/**
 * Prompt 30 — error/empty-state sweep (static wiring + Vitest).
 * Usage: node scripts/qa-error-states-live.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..");

const CHECKS = [
  {
    name: "auth form formatAuthError",
    file: "components/auth/auth-form.tsx",
    includes: ["formatAuthError", 'role="alert"'],
    excludes: [],
  },
  {
    name: "KDS sync error formatter",
    file: "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx",
    includes: ["formatSupabaseClientError", "kds-empty-state"],
    excludes: [],
  },
  {
    name: "menu import history",
    file: "components/menu-import/MenuImportHistory.tsx",
    includes: ["formatApiRouteError", 'role="alert"'],
    excludes: ['"Unknown error"'],
  },
  {
    name: "restaurants API",
    file: "app/api/restaurants/route.ts",
    includes: ["Could not create restaurant"],
    excludes: ["error: error.message"],
  },
  {
    name: "scanner user messages",
    file: "lib/scanner/scanner-user-messages.ts",
    includes: ["formatScannerApiError"],
    excludes: ["configure Gemini"],
  },
  {
    name: "analytics empty",
    file: "components/analytics/AnalyticsDashboard.tsx",
    includes: ["No activity in this range", "Open restaurants"],
    excludes: [],
  },
  {
    name: "billing pilot banner",
    file: "components/billing/BillingDashboard.tsx",
    includes: ["Pilot billing mode"],
    excludes: [],
  },
  {
    name: "create restaurant button",
    file: "app/dashboard/restaurants/CreateRestaurantButton.tsx",
    includes: ["formatApiRouteError", 'role="alert"'],
    excludes: [],
  },
  {
    name: "contact form alerts",
    file: "components/landing/contact/contact-pilot-form.tsx",
    includes: ['role="alert"'],
    excludes: [],
  },
];

function run() {
  const results = [];
  for (const c of CHECKS) {
    const src = readFileSync(join(REPO, c.file), "utf8");
    const missing = c.includes.filter((s) => !src.includes(s));
    const banned = (c.excludes ?? []).filter((s) => src.includes(s));
    const ok = missing.length === 0 && banned.length === 0;
    results.push({
      ok,
      name: c.name,
      detail:
        missing.length > 0
          ? `missing: ${missing.join(", ")}`
          : banned.length > 0
            ? `banned present: ${banned.join(", ")}`
            : "ok",
    });
  }

  let vitestOk = true;
  try {
    execSync("npm test -- tests/unit/error-states-qa.test.ts tests/unit/scanner-user-messages.test.ts tests/unit/public-accessibility-qa.test.ts", {
      cwd: REPO,
      stdio: "pipe",
    });
  } catch {
    vitestOk = false;
  }
  results.push({
    ok: vitestOk,
    name: "vitest error-state suites",
    detail: vitestOk ? "pass" : "fail",
  });

  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name} — ${r.detail}`);
    if (!r.ok) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
