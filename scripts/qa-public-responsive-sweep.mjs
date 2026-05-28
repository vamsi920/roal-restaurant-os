/**
 * Public surfaces responsive sweep (prompt 39).
 * Run: node scripts/qa-public-responsive-sweep.mjs http://localhost:3020
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:3020").replace(/\/$/, "");
const OUT = join(import.meta.dirname, "..", ".qa-screenshots", "responsive-39-public");

const VIEWPORTS = [
  { name: "phone-narrow", width: 320, height: 700 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

const ROUTES = [
  "/",
  "/pricing",
  "/about",
  "/blog",
  "/blog/why-restaurants-miss-calls-dinner-rush",
  "/demo",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
];

const TAP_SELECTORS = [
  ".public-btn-primary",
  ".public-btn-ghost",
  ".home-btn-primary",
  ".home-btn-ghost",
  ".public-nav-menu-btn",
  ".public-nav-cta",
  ".public-nav-drawer__cta",
  ".public-nav-drawer__link",
  ".public-footer__cta",
  ".home-pricing-pill",
  ".public-auth-submit",
  ".public-auth-header__menu-btn",
].join(",");

function slug(route) {
  return route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "");
}

async function auditPage(page) {
  return page.evaluate((tapSelector) => {
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
      if (style.clip === "rect(0px, 0px, 0px, 0px)") return false;
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
          .slice(0, 28);
        return `${el.className.toString().split(" ")[0] || el.tagName}${label ? `:${label}` : ""} ${Math.round(r.width)}x${Math.round(r.height)}`;
      });
    if (tiny.length) issues.push(`primary tap targets: ${tiny.join("; ")}`);

    const main = document.querySelector("main") ?? document.body;
    const lowContrast = [];
    for (const el of main.querySelectorAll("h1, h2, h3, p, label, button, a.public-btn-primary, a.public-btn-ghost")) {
      if (!isVisible(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs > 0 && fs < 11 && el.textContent?.trim()) {
        lowContrast.push(`${el.tagName} ${fs}px`);
        if (lowContrast.length >= 2) break;
      }
    }
    if (lowContrast.length) issues.push(`unreadable text in main: ${lowContrast.join(", ")}`);

    return issues;
  }, TAP_SELECTORS);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const url = `${BASE}${route}`;
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => null);
      const status = res?.status() ?? 0;
      await page.waitForTimeout(500);
      const issues =
        status >= 200 && status < 400 ? await auditPage(page) : [`http ${status}`];
      const file = join(OUT, `${slug(route)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      results.push({ route, vp: vp.name, status, issues, file });
      await page.close();
    }
  }

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
  console.log(`\n${results.length - fails}/${results.length} clean (prompt 39 public)`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
