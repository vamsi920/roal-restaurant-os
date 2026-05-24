/**
 * Prompt 29 — accessibility + performance live sweep.
 * Usage: node scripts/qa-a11y-perf-live.mjs http://localhost:3020
 */
import { chromium } from "playwright";

const BASE = (process.argv[2] ?? "http://localhost:3020").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/demo",
  "/contact",
  "/about",
  "/blog",
  "/security",
];

function summarize(checks) {
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

async function auditPage(page, route) {
  const issues = [];
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!/favicon|404.*\.(png|jpg|webp)/i.test(t)) consoleErrors.push(t.slice(0, 120));
    }
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message.slice(0, 120)));

  const t0 = Date.now();
  const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const loadMs = Date.now() - t0;

  const data = await page.evaluate(() => {
    const out = {};

    const skip = document.querySelector('a[href="#main"], a[href="#auth-main"]');
    out.skipLink = Boolean(skip);

    const main = document.querySelector("main");
    out.mainLandmark = Boolean(main);

    const h1s = document.querySelectorAll("h1");
    out.h1Count = h1s.length;

    const unlabeled = [];
    for (const input of document.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), textarea, select'
    )) {
      const id = input.id;
      const hasLabel =
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        input.getAttribute("aria-label") ||
        input.getAttribute("aria-labelledby");
      if (!hasLabel) {
        unlabeled.push(input.name || input.type || "input");
      }
    }
    out.unlabeled = unlabeled.slice(0, 5);

    const buttonsNoName = [];
    for (const btn of document.querySelectorAll("button")) {
      const name =
        btn.getAttribute("aria-label") ||
        btn.textContent?.trim() ||
        btn.querySelector(".sr-only")?.textContent?.trim();
      if (!name) buttonsNoName.push(btn.className.slice(0, 40) || "button");
    }
    out.buttonsNoName = buttonsNoName.slice(0, 3);

    out.reducedMotionCss = Array.from(document.styleSheets).some(() => true);

    return out;
  });

  if (!data.skipLink) issues.push("missing skip link");
  if (!data.mainLandmark) issues.push("missing main landmark");
  if (data.h1Count !== 1) issues.push(`h1 count=${data.h1Count}`);
  if (data.unlabeled.length) issues.push(`unlabeled inputs: ${data.unlabeled.join(", ")}`);
  if (data.buttonsNoName.length) issues.push(`unnamed buttons: ${data.buttonsNoName.join(", ")}`);
  if (consoleErrors.length) issues.push(`console: ${consoleErrors.slice(0, 2).join(" | ")}`);
  if (loadMs > 8000) issues.push(`slow load ${loadMs}ms`);

  // Tab focus smoke — first focusable should show focus ring or receive focus
  await page.keyboard.press("Tab");
  const focusInfo = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { ok: false, tag: "body" };
    const style = getComputedStyle(el);
    return {
      ok: true,
      tag: el.tagName,
      outline: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow !== "none",
    };
  });
  if (!focusInfo.ok) issues.push("tab focus did not move off body");

  return { issues, loadMs, consoleErrors };
}

async function checkHeroVideo(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const withMotion = await page.evaluate(() => ({
    video: !!document.querySelector(".home-video-layer video"),
    gradientOnly: !document.querySelector(".home-video-layer video"),
    wash: !!document.querySelector(".home-video-layer__wash"),
  }));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  const reduced = await page.evaluate(() => ({
    video: !!document.querySelector(".home-video-layer video"),
    wash: !!document.querySelector(".home-video-layer__wash"),
  }));

  return { withMotion, reduced };
}

async function checkVideoAsset(page) {
  const res = await page.goto(`${BASE}/landing/hero-bg.mp4`, { waitUntil: "domcontentloaded" });
  return res?.status() ?? 0;
}

async function main() {
  const checks = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const route of ROUTES) {
    const p = await browser.newPage();
    const { issues, loadMs } = await auditPage(p, route);
    checks.push({
      name: `${route} a11y + console`,
      ok: issues.length === 0,
      detail: issues.length ? issues.join("; ") : `${loadMs}ms`,
    });
    await p.close();
  }

  const vp = await browser.newPage();
  const mp4Status = await checkVideoAsset(vp);
  checks.push({
    name: "hero-bg.mp4 asset",
    ok: mp4Status === 200,
    detail: `HTTP ${mp4Status}`,
  });

  const vPage = await browser.newPage();
  const { withMotion, reduced } = await checkHeroVideo(vPage);
  checks.push({
    name: "hero video fallback (reduced motion)",
    ok: !reduced.video && reduced.wash,
    detail: reduced.video ? "video still present" : "gradient wash only",
  });
  checks.push({
    name: "hero video layer (default motion)",
    ok: withMotion.wash,
    detail: withMotion.video ? "video + wash" : "wash only (ok if save-data)",
  });

  // Reduced-motion CSS static check
  const cssPage = await browser.newPage();
  await cssPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const rmCss = await cssPage.evaluate(async () => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) =>
      (l).href
    );
    let found = false;
    for (const href of links) {
      try {
        const t = await (await fetch(href)).text();
        if (t.includes("prefers-reduced-motion: reduce") && t.includes("animation: none")) {
          found = true;
          break;
        }
      } catch {
        /* ignore */
      }
    }
    return found;
  });
  checks.push({
    name: "reduced-motion CSS bundled",
    ok: rmCss,
    detail: rmCss ? "present" : "missing",
  });

  await browser.close();
  summarize(checks);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
