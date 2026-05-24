/**
 * Auth UI smoke. No real credentials — uses fake email/password.
 *
 * Run: npm run auth-smoke
 *      node scripts/auth-smoke.mjs http://localhost:3000
 */
import { chromium } from "playwright";
import {
  checkLogin,
  checkSignup,
  createResultCollector,
  printResults,
} from "./playwright-smoke-lib.mjs";

const base =
  process.argv[2] ??
  process.env.E2E_BASE_URL ??
  process.env.SMOKE_BASE_URL ??
  "http://localhost:3000";

async function main() {
  const { results, pass, fail } = createResultCollector();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await checkLogin(page, base, { pass, fail });
    await checkSignup(page, base, { pass, fail });
  } finally {
    await browser.close();
  }

  printResults(results, base);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
