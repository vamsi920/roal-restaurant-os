/**
 * Playwright E2E smoke (prompt 57).
 * - Auth UI with fake credentials (no paid APIs)
 * - Protected redirect
 * - Optional signed-in KDS path via E2E_EMAIL / E2E_PASSWORD (never commit)
 * - Menu scanner via mocked POST /api/scanner/extract (no Gemini)
 *
 * Run: npm run e2e-smoke
 *      E2E_EMAIL=… E2E_PASSWORD=… npm run e2e-smoke
 *      node scripts/e2e-smoke.mjs http://localhost:3000
 */
import { chromium } from "playwright";
import {
  checkAuthenticatedDashboard,
  checkLogin,
  checkProtectedRedirect,
  checkRestaurantKds,
  checkScannerMockPath,
  checkSignup,
  createResultCollector,
  loginWithEnvCredentials,
  printResults,
  resolveRestaurantPath,
} from "./playwright-smoke-lib.mjs";

const base =
  process.argv[2] ??
  process.env.E2E_BASE_URL ??
  process.env.SMOKE_BASE_URL ??
  "http://localhost:3000";

const e2eEmail = process.env.E2E_EMAIL?.trim();
const e2ePassword = process.env.E2E_PASSWORD;
const restaurantId = process.env.E2E_RESTAURANT_ID?.trim();
const skipAuth = process.env.E2E_SKIP_AUTH === "1";
const skipScanner = process.env.E2E_SKIP_SCANNER === "1";

function skipAuthenticated(pass, label) {
  pass("authenticated dashboard", label);
  pass("restaurant page load", label);
  pass("KDS orders panel", label);
  pass("voice harness visible", label);
  pass("menu scanner mock", label);
}

async function main() {
  const { results, pass, fail } = createResultCollector();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    if (!skipAuth) {
      await checkLogin(page, base, { pass, fail });
      await checkSignup(page, base, { pass, fail });
    }

    await checkProtectedRedirect(page, base, { pass, fail });

    if (!e2eEmail || !e2ePassword) {
      skipAuthenticated(pass, "skipped — set E2E_EMAIL and E2E_PASSWORD");
    } else {
      const authContext = await browser.newContext();
      const authPage = await authContext.newPage();
      let loginOk = true;
      try {
        await loginWithEnvCredentials(authPage, base, e2eEmail, e2ePassword);
      } catch (err) {
        loginOk = false;
        const msg = err instanceof Error ? err.message : String(err);
        fail("authenticated login", msg);
        skipAuthenticated(pass, "skipped — login failed");
      }

      if (loginOk) {
        await checkAuthenticatedDashboard(authPage, base, { pass, fail });

        const restaurantPath = await resolveRestaurantPath(
          authPage,
          base,
          restaurantId
        );
        if (!restaurantPath) {
          fail(
            "restaurant page load",
            "no restaurants — create one or set E2E_RESTAURANT_ID"
          );
          pass("KDS orders panel", "skipped — no restaurant");
          pass("voice harness visible", "skipped — no restaurant");
          pass("menu scanner mock", "skipped — no restaurant");
        } else {
          await checkRestaurantKds(authPage, base, restaurantPath, { pass, fail });
          await checkScannerMockPath(authPage, base, restaurantPath, { pass, fail }, {
            skip: skipScanner,
          });
        }
      }
      await authContext.close();
    }
  } finally {
    await browser.close();
  }

  printResults(results, base);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
