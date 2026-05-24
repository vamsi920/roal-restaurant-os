/**
 * Prompt 35 — owner journey smoke (public + signed-in browser + API layers).
 * Usage: node --env-file=.env --env-file=.env.local scripts/qa-owner-journey-live.mjs [baseUrl]
 */
import { randomUUID } from "node:crypto";
import { execSync, spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { fillControlled } from "./playwright-smoke-lib.mjs";

const REPO = new URL("..", import.meta.url).pathname;
const base = process.argv[2] ?? process.env.E2E_BASE_URL ?? "http://localhost:3020";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const checks = [];
let restaurant = null;

function record(name, ok, detail = "ok") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
}

function finish(code = checks.some((c) => !c.ok) ? 1 : 0) {
  const passed = checks.filter((c) => c.ok).length;
  console.log(`\n${passed}/${checks.length} passed`);
  process.exit(code);
}

if (!url || !serviceKey) {
  record("env", false, "missing Supabase URL or service role");
  finish(1);
}

try {
  execSync(`node scripts/public-route-smoke.mjs ${base}`, {
    cwd: REPO,
    stdio: "pipe",
    encoding: "utf8",
  });
  record("public routes", true, "11/11");
} catch {
  record("public routes", false, "public-route-smoke failed");
}

const email = `owner-journey-${Date.now()}@example.com`;
const password = `RoalE2e${randomUUID().slice(0, 12)}a1`;
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createErr || !created.user) {
  record("bootstrap user", false, createErr?.message ?? "no user");
  finish(1);
}

const userId = created.user.id;
const { data: org, error: orgErr } = await admin
  .from("organizations")
  .insert({ name: "Journey QA Org", slug: `journey-${Date.now()}` })
  .select("id")
  .single();
if (orgErr || !org) {
  record("bootstrap org", false, orgErr?.message ?? "no org");
  finish(1);
}

const { error: memberErr } = await admin.from("memberships").insert({
  organization_id: org.id,
  user_id: userId,
  role: "owner",
});
if (memberErr) {
  record("bootstrap membership", false, memberErr.message);
  finish(1);
}

const { data: restRow, error: restErr } = await admin
  .from("restaurants")
  .insert({ name: "Journey QA Kitchen", organization_id: org.id })
  .select("id")
  .single();
if (restErr || !restRow) {
  record("bootstrap restaurant", false, restErr?.message ?? "no restaurant");
  finish(1);
}
restaurant = restRow;

record("bootstrap tenant", true, "user + org + restaurant");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  record("homepage", (await page.locator("h1").count()) > 0, "h1 visible");

  await page.goto(`${base}/pricing`, { waitUntil: "domcontentloaded" });
  record("pricing", /0\.90|pricing/i.test(await page.content()), "pricing page");

  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await fillControlled(page, 'input[name="email"]', email);
  await fillControlled(page, 'input[name="password"]', password);
  const emailLen = (await page.locator('input[name="email"]').inputValue()).length;
  if (emailLen < 3) {
    record("login → dashboard", false, "email input empty");
  } else {
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(
      () => window.location.pathname.startsWith("/dashboard"),
      { timeout: 20_000 }
    );
    record("login → dashboard", true, page.url());
  }

  await page.goto(`${base}/dashboard/restaurants/${restaurant.id}`, {
    waitUntil: "networkidle",
  });
  const kdsOk =
    (await page.getByRole("heading", { name: "Phone orders" }).count()) > 0 &&
    (await page.getByRole("heading", { name: "Menu scanner" }).count()) > 0;
  record("KDS workspace", kdsOk, kdsOk ? "orders + scanner" : page.url());

  await page.goto(`${base}/dashboard/restaurants/${restaurant.id}/menu`, {
    waitUntil: "networkidle",
  });
  record("menu editor", !page.url().includes("/login"), page.url());

  await page.goto(`${base}/dashboard/billing`, { waitUntil: "networkidle" });
  record(
    "billing",
    !page.url().includes("/login") && /billing|pilot|plan/i.test(await page.content()),
    "billing dashboard"
  );

  await page.goto(`${base}/dashboard/analytics`, { waitUntil: "networkidle" });
  const analyticsOk =
    !page.url().includes("/login") &&
    ((await page.getByRole("heading", { name: /Orders & operations/i }).count()) > 0 ||
      (await page.getByText("No activity in this range").count()) > 0);
  record("analytics", analyticsOk, analyticsOk ? "analytics dashboard" : page.url());
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (!checks.some((c) => c.name === "login → dashboard")) {
    record("login → dashboard", false, msg);
  } else if (!checks.some((c) => c.name === "KDS workspace")) {
    record("KDS workspace", false, msg);
  } else {
    record("browser journey", false, msg);
  }
} finally {
  await browser.close();
}

const qaRestaurant =
  process.env.QA_RESTAURANT_ID?.trim() ||
  process.env.QA_ELEVENLABS_RESTAURANT_ID?.trim() ||
  "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
for (const [name, script] of [
  ["get_menu (ElevenLabs)", "scripts/qa-get-menu-elevenlabs.ts"],
  ["draft/finalize → KDS ticket", "scripts/qa-draft-finalize-elevenlabs.ts"],
]) {
  const run = spawnSync(
    "npx",
    ["tsx", "--env-file=.env", "--env-file=.env.local", script],
    {
      cwd: REPO,
      env: { ...process.env, QA_RESTAURANT_ID: qaRestaurant },
      encoding: "utf8",
    }
  );
  record(
    name,
    run.status === 0,
    run.status === 0 ? "pass" : (run.stderr || run.stdout || "fail").slice(0, 120)
  );
}

finish();
