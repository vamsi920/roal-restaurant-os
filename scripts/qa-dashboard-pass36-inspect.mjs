/**
 * Pass 36 — focused dashboard UI inspection (desktop + mobile).
 * node --env-file=.env --env-file=.env.local scripts/qa-dashboard-pass36-inspect.mjs http://localhost:3020
 */
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loginWithEnvCredentials, resolveRestaurantPath } from "./playwright-smoke-lib.mjs";

const BASE = (process.argv[2] ?? "http://localhost:3020").replace(/\/$/, "");
const OUT = join(import.meta.dirname, "..", ".qa-screenshots", "pass36-dashboard");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

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
    throw new Error("Set E2E_EMAIL/E2E_PASSWORD or Supabase service role");
  }

  const bootEmail = `pass36-${Date.now()}@example.com`;
  const bootPassword = `RoalP36${randomUUID().slice(0, 12)}a1`;
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
    .insert({ name: "Pass 36 Org", slug: `p36-${Date.now()}` })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error(orgErr?.message ?? "bootstrap org failed");

  const { error: memberErr } = await admin.from("memberships").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
  });
  if (memberErr) throw new Error(memberErr.message);

  await admin.from("profiles").upsert({ id: userId, display_name: "Pass 36 QA" });

  const { data: restaurant, error: restErr } = await admin
    .from("restaurants")
    .insert({ name: "Pass 36 QA Location", organization_id: org.id })
    .select("id")
    .single();
  if (restErr || !restaurant) {
    throw new Error(restErr?.message ?? "bootstrap restaurant failed");
  }

  return { email: bootEmail, password: bootPassword, restaurantId: restaurant.id };
}

function auditLayout(page) {
  return page.evaluate(() => {
    const issues = [];
    const docW = document.documentElement.scrollWidth;
    const viewW = window.innerWidth;
    if (docW > viewW + 2) {
      issues.push(`overflow ${docW}px > ${viewW}px`);
    }

    const main =
      document.querySelector("#app-main-content") ??
      document.querySelector("main") ??
      document.body;

    const clipped = [...main.querySelectorAll("h1, h2, button, a, input, [role='dialog']")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return false;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") return false;
        return r.right > viewW + 1 || r.left < -1;
      })
      .slice(0, 3)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const label = (el.textContent ?? el.tagName).trim().slice(0, 20);
        return `${label}@${Math.round(r.left)}-${Math.round(r.right)}`;
      });
    if (clipped.length) issues.push(`clipped: ${clipped.join("; ")}`);

    const dialog = document.querySelector("[role='dialog']");
    if (dialog) {
      const dr = dialog.getBoundingClientRect();
      if (dr.width > viewW) issues.push(`dialog wider than viewport (${Math.round(dr.width)}px)`);
      if (dr.top < 0 || dr.bottom > window.innerHeight + 2) {
        issues.push("dialog vertically off-screen");
      }
    }

    const emptyShell =
      /no restaurants yet/i.test(main.innerText) &&
      !document.querySelector(".restaurant-card, [data-restaurant-card], a[href*='/dashboard/restaurants/']");
    if (emptyShell && window.location.pathname === "/dashboard/restaurants") {
      issues.push("empty state but no CTA card visible");
    }

    const mobileRail = document.querySelector(".workspace-rail-mobile-bottom");
    if (mobileRail && viewW < 640) {
      const rr = mobileRail.getBoundingClientRect();
      const obscured = [...document.querySelectorAll("button.btn-primary, form button[type='submit']")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 40) return false;
          return r.bottom > rr.top - 4 && r.bottom <= window.innerHeight;
        })
        .slice(0, 2)
        .map((el) => (el.textContent ?? "").trim().slice(0, 24));
      if (obscured.length) {
        issues.push(`primary CTA under mobile rail: ${obscured.join(", ")}`);
      }
    }

    return issues;
  });
}

async function inspectStep(page, label, fn) {
  const issues = await fn(page);
  const file = join(OUT, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return { label, issues, url: page.url() };
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
    console.error("No restaurant for inspection");
    process.exit(1);
  }

  const rid = restaurantPath.split("/").pop();
  const steps = [
    { route: "/dashboard/restaurants", action: "list" },
    { route: `/dashboard/restaurants/${rid}`, action: "workspace" },
    { route: `/dashboard/restaurants/${rid}/menu`, action: "menu" },
    { route: `/dashboard/restaurants/${rid}/agent`, action: "agent" },
    { route: `/dashboard/restaurants/${rid}/analytics`, action: "analytics" },
    { route: "/dashboard/analytics", action: "org-analytics" },
  ];

  const results = [];

  for (const vp of VIEWPORTS) {
    for (const { route, action } of steps) {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
      await page.waitForTimeout(800);

      if (action === "list") {
        const modalBtn = page.getByRole("button", { name: /new restaurant/i });
        if (await modalBtn.isVisible().catch(() => false)) {
          await modalBtn.click();
          await page.waitForTimeout(400);
          const modal = await inspectStep(page, `${action}-modal-${vp.name}`, auditLayout);
          results.push(modal);
          await page.keyboard.press("Escape").catch(() => {});
          await page.waitForTimeout(200);
        }
      }

      const r = await inspectStep(page, `${action}-${vp.name}`, auditLayout);
      results.push(r);
      await page.close();
    }
  }

  await context.close();
  await browser.close();

  let fails = 0;
  for (const r of results) {
    const ok = r.issues.length === 0 && !r.url.includes("/login");
    if (!ok) fails++;
    console.log(
      JSON.stringify({
        label: r.label,
        pass: ok,
        url: r.url.replace(BASE, ""),
        issues: r.issues,
        loginRedirect: r.url.includes("/login"),
      })
    );
  }
  console.log(`\nScreenshots: ${OUT}`);
  console.log(`${results.length - fails}/${results.length} clean`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
