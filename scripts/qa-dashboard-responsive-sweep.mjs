/**
 * Authenticated dashboard responsive sweep (prompt 40).
 * Run: node --env-file=.env --env-file=.env.local scripts/qa-dashboard-responsive-sweep.mjs http://localhost:3020
 *
 * Uses E2E_EMAIL / E2E_PASSWORD when set; otherwise bootstraps an ephemeral Supabase user
 * (requires service role in env). Credentials are never printed.
 */
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loginWithEnvCredentials, resolveRestaurantPath } from "./playwright-smoke-lib.mjs";

const BASE = (process.argv[2] ?? "http://localhost:3020").replace(/\/$/, "");
const OUT = join(import.meta.dirname, "..", ".qa-screenshots", "responsive-40-dashboard");

const VIEWPORTS = [
  { name: "phone-narrow", width: 320, height: 700 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const TAP_SELECTORS = [
  "#app-main-content .btn-primary",
  "#app-main-content .btn-ghost",
  "#app-main-content .kds-thumb-btn",
  "#app-main-content button[type='submit']",
  "#app-main-content a.btn-primary",
  "#app-main-content a.btn-ghost",
  ".dashboard-shell__nav a",
  ".restaurant-workspace-rail__link",
].join(",");

const FAKE_DATA_PATTERNS = [
  /\blorem ipsum\b/i,
  /\bfake metrics\b/i,
  /\bdemo revenue\b/i,
  /\bplaceholder agent\b/i,
  /\bsample restaurant\b/i,
];

function slug(route) {
  return route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "");
}

async function ensureE2eCredentials() {
  const email = process.env.E2E_EMAIL?.trim();
  const password = process.env.E2E_PASSWORD;
  const restaurantId = process.env.E2E_RESTAURANT_ID?.trim();
  if (email && password) {
    return { email, password, restaurantId: restaurantId ?? null };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Set E2E_EMAIL/E2E_PASSWORD or Supabase env for ephemeral bootstrap"
    );
  }

  const bootEmail = `responsive-40-${Date.now()}@example.com`;
  const bootPassword = `RoalR40${randomUUID().slice(0, 12)}a1`;
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: bootEmail,
    password: bootPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(createErr?.message ?? "bootstrap createUser failed");
  }

  const userId = created.user.id;
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: "Responsive 40 Org", slug: `r40-${Date.now()}` })
    .select("id")
    .single();
  if (orgErr || !org) {
    throw new Error(orgErr?.message ?? "bootstrap org failed");
  }

  const { error: memberErr } = await admin.from("memberships").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
  });
  if (memberErr) throw new Error(memberErr.message);

  await admin.from("profiles").upsert({
    id: userId,
    display_name: "Responsive QA",
  });

  const { data: restaurant, error: restErr } = await admin
    .from("restaurants")
    .insert({ name: "Responsive QA Location", organization_id: org.id })
    .select("id")
    .single();
  if (restErr || !restaurant) {
    throw new Error(restErr?.message ?? "bootstrap restaurant failed");
  }

  return {
    email: bootEmail,
    password: bootPassword,
    restaurantId: restaurant.id,
  };
}

function buildRoutes(restaurantId) {
  const base = `/dashboard/restaurants/${restaurantId}`;
  return [
    "/dashboard/restaurants",
    base,
    `${base}/menu`,
    `${base}/agent`,
    `${base}/analytics`,
    `${base}/billing`,
    "/dashboard/analytics",
    "/dashboard/billing",
    "/dashboard/onboarding",
    "/dashboard/settings",
    "/dashboard/settings/notifications",
    "/dashboard/support",
    "/dashboard/admin",
  ];
}

async function auditPage(page) {
  return page.evaluate(
    ({ tapSelector, fakePatterns }) => {
      const issues = [];
      const docW = document.documentElement.scrollWidth;
      const viewW = window.innerWidth;
      if (docW > viewW + 2) {
        issues.push(`horizontal overflow ${docW}px > ${viewW}px`);
      }

      const isVisible = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") return false;
        return true;
      };

      const tiny = [...document.querySelectorAll(tapSelector)]
        .filter(isVisible)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.height < 40 || r.width < 40;
        })
        .slice(0, 2)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const label = (el.getAttribute("aria-label") || el.textContent || "")
            .trim()
            .slice(0, 24);
          return `${el.tagName}${label ? `:${label}` : ""} ${Math.round(r.width)}x${Math.round(r.height)}`;
        });
      if (tiny.length) issues.push(`tap targets: ${tiny.join("; ")}`);

      const main = document.querySelector("#app-main-content") ?? document.querySelector("main");
      const text = (main?.innerText ?? "").slice(0, 8000);
      for (const source of fakePatterns) {
        const re = new RegExp(source.source, source.flags);
        if (re.test(text)) {
          issues.push(`suspicious copy: ${source.source}`);
          break;
        }
      }

      return issues;
    },
    { tapSelector: TAP_SELECTORS, fakePatterns: FAKE_DATA_PATTERNS.map((r) => ({ source: r.source, flags: r.flags })) }
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const creds = await ensureE2eCredentials();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const loginPage = await context.newPage();

  await loginWithEnvCredentials(loginPage, BASE, creds.email, creds.password);
  const restaurantPath = await resolveRestaurantPath(
    loginPage,
    BASE,
    creds.restaurantId
  );
  await loginPage.close();

  if (!restaurantPath) {
    await browser.close();
    console.error("No restaurant found for authenticated sweep");
    process.exit(1);
  }

  const restaurantId = restaurantPath.split("/").pop();
  const routes = buildRoutes(restaurantId);
  const results = [];

  for (const vp of VIEWPORTS) {
    for (const route of routes) {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const url = `${BASE}${route}`;
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => null);
      const status = res?.status() ?? 0;
      await page.waitForTimeout(600);

      let issues = [];
      if (page.url().includes("/login")) {
        issues.push("redirected to login");
      } else if (status >= 200 && status < 400) {
        if (route === "/dashboard/admin" && !page.url().includes("/dashboard/admin")) {
          issues = [];
        } else {
          issues = await auditPage(page);
        }
      } else {
        issues.push(`http ${status}`);
      }

      const file = join(OUT, `${slug(route)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      results.push({ route, vp: vp.name, status, finalUrl: page.url(), issues });
      await page.close();
    }
  }

  await context.close();
  await browser.close();

  let fails = 0;
  for (const r of results) {
    const ok = r.issues.length === 0 && r.status >= 200 && r.status < 400;
    if (!ok) fails++;
    console.log(
      JSON.stringify({
        route: r.route,
        viewport: r.vp,
        status: r.status,
        pass: ok,
        issues: r.issues,
      })
    );
  }
  console.log(`\n${results.length - fails}/${results.length} clean (prompt 40 dashboard)`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
