/**
 * Responsive UI sweep — overflow + screenshot audit (prompt 28).
 * Run: node scripts/qa-responsive-sweep.mjs http://localhost:3020
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:3020").replace(/\/$/, "");
const OUT = join(import.meta.dirname, "..", ".qa-screenshots", "responsive-28");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

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
  "/dashboard/restaurants",
  "/dashboard/onboarding",
];

function slug(route) {
  return route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "");
}

async function auditPage(page) {
  return page.evaluate(() => {
    const issues = [];
    const docW = document.documentElement.scrollWidth;
    const viewW = window.innerWidth;
    if (docW > viewW + 2) {
      issues.push(`horizontal overflow ${docW}px > ${viewW}px`);
    }
    const tiny = [...document.querySelectorAll("button, a.public-btn-primary, a.public-btn-ghost, .public-btn-primary")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 44);
      })
      .slice(0, 3)
      .map((el) => `${el.tagName}.${[...el.classList].slice(0, 2).join(".")} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    if (tiny.length) issues.push(`small tap targets: ${tiny.join("; ")}`);

    const lowContrast = [];
    for (const el of document.querySelectorAll("p, span, li, h1, h2, h3, label")) {
      const style = getComputedStyle(el);
      const fs = parseFloat(style.fontSize);
      if (fs > 0 && fs < 10.5 && el.textContent?.trim()) {
        lowContrast.push(`${el.tagName} ${fs}px`);
        if (lowContrast.length >= 2) break;
      }
    }
    if (lowContrast.length) issues.push(`tiny text: ${lowContrast.join(", ")}`);

    return issues;
  });
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
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => null);
      const status = res?.status() ?? 0;
      await page.waitForTimeout(400);
      const issues = await auditPage(page);
      const file = join(OUT, `${slug(route)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
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
        screenshot: r.file.replace(join(import.meta.dirname, "..") + "/", ""),
      })
    );
  }
  console.log(`\n${results.length - fails}/${results.length} clean`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
