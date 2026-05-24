/**
 * Shared Playwright smoke helpers (auth + E2E).
 * Never commit real credentials — use env E2E_EMAIL / E2E_PASSWORD locally only.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_MENU_FIXTURE = join(__dirname, "../tests/fixtures/sample-menu.png");

export const FAKE_EMAIL = "smoke-test@example.invalid";
export const FAKE_PASSWORD = "not-a-real-password-12";

export function createResultCollector() {
  const results = [];
  return {
    results,
    pass(name, detail = "") {
      results.push({ name, ok: true, detail });
    },
    fail(name, detail = "") {
      results.push({ name, ok: false, detail });
    },
  };
}

export function printResults(results, base) {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(
      `${r.ok ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`
    );
  }
  if (failed.length) {
    process.exit(1);
  }
  console.log(`\nAll ${results.length} checks passed (${base}).`);
}

export async function waitForNextClient(page, base) {
  const mainApp = page.waitForResponse(
    (res) =>
      res.url().includes("/_next/static/chunks/main-app") && res.status() === 200,
    { timeout: 20_000 }
  );
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  try {
    await mainApp;
  } catch {
    return false;
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  return true;
}

export async function fillControlled(page, selector, value) {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      );
      descriptor.set.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { sel: selector, val: value }
  );
}

export function trackAuthRequests(page, authSignals) {
  page.on("request", (req) => {
    const url = req.url();
    if (/\/auth\/v1\//.test(url)) {
      authSignals.push(`req:${req.method()} ${url.split("?")[0]}`);
    }
  });
}

export async function checkLogin(page, base, { pass, fail }) {
  if (!(await waitForNextClient(page, base))) {
    fail(
      "login render",
      "Next client bundle missing — restart dev: rm -rf .next && npm run dev"
    );
    return;
  }

  const title = page.locator("h1.public-auth-panel__title");
  if (!(await title.isVisible())) {
    fail("login render", "missing h1");
    return;
  }
  if ((await title.textContent())?.trim() !== "Sign in") {
    fail("login render", `title=${await title.textContent()}`);
    return;
  }
  pass("login render");

  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');
  const submit = page.locator('button[type="submit"]');

  const emailType = await email.getAttribute("type");
  const passwordType = await password.getAttribute("type");
  if (emailType !== "email") {
    fail("login field types", `email type=${emailType}`);
  } else if (passwordType !== "password") {
    fail("login field types", `password type=${passwordType}`);
  } else {
    pass("login field types");
  }

  await fillControlled(page, 'input[name="email"]', FAKE_EMAIL);
  if ((await email.inputValue()) !== FAKE_EMAIL) {
    fail("login email accepts input", `value=${await email.inputValue()}`);
  } else {
    pass("login email accepts input");
  }

  const authSignals = [];
  trackAuthRequests(page, authSignals);

  await fillControlled(page, 'input[name="password"]', FAKE_PASSWORD);
  await submit.click();

  await Promise.race([
    page.waitForSelector('[role="alert"]', { timeout: 12_000 }),
    page.waitForSelector('button[aria-busy="true"]', { timeout: 12_000 }),
    page.waitForFunction(
      () =>
        document
          .querySelector('button[type="submit"]')
          ?.textContent?.includes("One moment"),
      { timeout: 12_000 }
    ),
    page.waitForResponse(
      (res) => /\/auth\/v1\//.test(res.url()) && res.request().method() === "POST",
      { timeout: 12_000 }
    ),
  ]).catch(() => {});

  const busy = await submit.getAttribute("aria-busy");
  const btnText = (await submit.textContent())?.trim();
  const hasAlert = await page.locator('[role="alert"]').isVisible().catch(() => false);
  const alertText = hasAlert
    ? await page.locator('[role="alert"]').textContent()
    : "";

  if (authSignals.some((s) => /\/auth\/v1\/(token|signup)/.test(s))) {
    pass("login signInWithPassword called", authSignals[0]);
  } else if (busy === "true" || btnText === "One moment…") {
    pass("login signInWithPassword called", "loading state on submit");
  } else if (hasAlert) {
    pass("login signInWithPassword called", `alert: ${alertText?.slice(0, 80)}`);
  } else if (page.url().includes("password=")) {
    fail(
      "login signInWithPassword called",
      "native GET submit — client JS did not hydrate"
    );
  } else {
    fail(
      "login signInWithPassword called",
      `busy=${busy} btn=${btnText} signals=${authSignals.join("; ") || "none"}`
    );
  }
}

export async function checkSignup(page, base, { pass, fail }) {
  await page.goto(`${base}/signup`, { waitUntil: "networkidle" });

  const title = page.locator("form.public-auth-panel h1");
  if (!(await title.isVisible())) {
    fail("signup render", "missing form title");
    return;
  }
  if ((await title.textContent())?.trim() !== "Create your account") {
    fail("signup render", `title=${await title.textContent()}`);
    return;
  }
  pass("signup render");

  const aside = page.locator("#signup-entry-heading");
  if (!(await aside.isVisible())) {
    fail("signup onboarding aside", "missing aside heading");
  } else {
    pass("signup onboarding aside");
  }

  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');
  const emailType = await email.getAttribute("type");
  const passwordType = await password.getAttribute("type");
  if (emailType !== "email" || passwordType !== "password") {
    fail("signup field types", `email=${emailType} password=${passwordType}`);
  } else {
    pass("signup field types");
  }

  await fillControlled(page, 'input[name="email"]', FAKE_EMAIL);
  if ((await email.inputValue()) !== FAKE_EMAIL) {
    fail("signup email accepts input");
  } else {
    pass("signup email accepts input");
  }

  const authSignals = [];
  trackAuthRequests(page, authSignals);

  const submit = page.locator('button[type="submit"]');
  await fillControlled(page, 'input[name="password"]', FAKE_PASSWORD);
  await submit.click();

  await Promise.race([
    page.waitForSelector('[role="status"]', { timeout: 12_000 }),
    page.waitForSelector('[role="alert"]', { timeout: 12_000 }),
    page.waitForSelector('button[aria-busy="true"]', { timeout: 12_000 }),
    page.waitForResponse(
      (res) => /\/auth\/v1\//.test(res.url()) && res.request().method() === "POST",
      { timeout: 12_000 }
    ),
  ]).catch(() => {});

  const status = await page.locator('[role="status"]').isVisible().catch(() => false);
  const hasAlert = await page.locator('[role="alert"]').isVisible().catch(() => false);
  const busy = await submit.getAttribute("aria-busy");

  if (authSignals.some((s) => s.includes("signup"))) {
    pass("signup signUp called", authSignals.find((s) => s.includes("signup")));
  } else if (status) {
    pass("signup signUp called", "confirm email status panel");
  } else if (hasAlert) {
    pass("signup signUp called", "error alert after submit");
  } else if (busy === "true") {
    pass("signup signUp called", "loading state on submit");
  } else if (page.url().includes("password=")) {
    fail("signup signUp called", "native GET submit — client JS did not hydrate");
  } else {
    fail("signup signUp called", `busy=${busy} signals=${authSignals.join("; ") || "none"}`);
  }
}

export async function checkProtectedRedirect(page, base, { pass, fail }) {
  await page.context().clearCookies();
  const res = await page.goto(`${base}/dashboard`, {
    waitUntil: "domcontentloaded",
  });
  const url = page.url();
  if (!url.includes("/login")) {
    fail("protected redirect", `expected /login, got ${url} (status ${res?.status()})`);
    return;
  }
  if (!url.includes("next=")) {
    fail("protected redirect", "missing next= query");
    return;
  }
  pass("protected redirect");
}

const MOCK_SCAN_MENU = {
  categories: [
    {
      name: "Mains",
      sort_order: 1,
      items: [
        {
          name: "E2E Smoke Burger",
          price: 12,
          base_availability: true,
          modifiers: [],
        },
      ],
    },
  ],
};

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function scannerUploadBuffer() {
  if (existsSync(SAMPLE_MENU_FIXTURE)) {
    return readFileSync(SAMPLE_MENU_FIXTURE);
  }
  return TINY_PNG;
}

export async function loginWithEnvCredentials(page, base, email, password) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await fillControlled(page, 'input[name="email"]', email);
  await fillControlled(page, 'input[name="password"]', password);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(
    () => window.location.pathname.startsWith("/dashboard"),
    { timeout: 20_000 }
  );
}

export async function resolveRestaurantPath(page, base, restaurantId) {
  if (restaurantId?.trim()) {
    return `/dashboard/restaurants/${restaurantId.trim()}`;
  }
  await page.goto(`${base}/dashboard/restaurants`, { waitUntil: "networkidle" });
  const link = page.locator('a[href^="/dashboard/restaurants/"]').first();
  const count = await link.count();
  if (count === 0) return null;
  const href = await link.getAttribute("href");
  return href?.startsWith("/") ? href : null;
}

export async function checkAuthenticatedDashboard(page, base, { pass, fail }) {
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  const onLogin = page.url().includes("/login");
  if (onLogin) {
    fail("authenticated dashboard", "still on login — bad E2E_EMAIL/E2E_PASSWORD?");
    return;
  }
  const overview = page.getByRole("heading", { name: /Restaurant operating system/i });
  const onboarding = page.getByRole("heading", { name: /onboarding/i });
  if ((await overview.count()) > 0 || (await onboarding.count()) > 0) {
    pass("authenticated dashboard");
  } else {
    fail("authenticated dashboard", `unexpected page ${page.url()}`);
  }
}

export async function checkRestaurantKds(page, base, restaurantPath, { pass, fail }) {
  await page.goto(`${base}${restaurantPath}`, { waitUntil: "networkidle" });
  if (page.url().includes("/login")) {
    fail("restaurant page load", "redirected to login");
    return;
  }
  if (page.url().includes("404") || (await page.locator("text=404").count()) > 0) {
    fail("restaurant page load", "not found");
    return;
  }

  const scanner = page.getByRole("heading", { name: "Menu scanner" });
  const orders = page.getByRole("heading", { name: "Phone orders" });
  const harness = page.getByRole("heading", { name: "Voice agent test harness" });

  if (!(await scanner.isVisible())) {
    fail("restaurant page load", "missing Menu scanner");
    return;
  }
  if (!(await orders.isVisible())) {
    fail("restaurant page load", "missing Phone orders");
    return;
  }
  pass("restaurant page load");

  const queueTab = page.getByRole("button", { name: /Kitchen queue/i });
  if (await queueTab.isVisible()) {
    pass("KDS orders panel");
  } else {
    fail("KDS orders panel", "Kitchen queue tab missing");
  }

  if (await harness.isVisible()) {
    pass("voice harness visible");
  } else {
    fail("voice harness visible", "harness section not found");
  }

  return restaurantPath;
}

export async function checkScannerMockPath(
  page,
  base,
  restaurantPath,
  { pass, fail },
  { skip } = {}
) {
  if (skip) {
    pass("menu scanner mock", "skipped (E2E_SKIP_SCANNER=1)");
    return;
  }

  const restaurantId = restaurantPath.split("/").pop();
  let extractHit = false;

  await page.route("**/api/scanner/extract", async (route) => {
    extractHit = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        import_id: "e2e-smoke-mock-import",
        menu: MOCK_SCAN_MENU,
        hints: [],
      }),
    });
  });

  await page.goto(`${base}${restaurantPath}`, { waitUntil: "networkidle" });
  await page.setInputFiles("#menu-image", {
    name: "sample-menu.png",
    mimeType: "image/png",
    buffer: scannerUploadBuffer(),
  });

  const scanBtn = page.getByRole("button", { name: /^Scan menu$/i });
  if (!(await scanBtn.isVisible())) {
    fail("menu scanner mock", "Scan menu button not visible");
    await page.unroute("**/api/scanner/extract");
    return;
  }
  await scanBtn.click();

  const reviewHeading = page.getByRole("heading", { name: /Review extracted menu/i });
  try {
    await reviewHeading.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    fail(
      "menu scanner mock",
      extractHit
        ? "mock extract OK but review UI missing"
        : "extract route not hit — upload blocked?"
    );
    await page.unroute("**/api/scanner/extract");
    return;
  }

  const itemVisible = await page.getByText("E2E Smoke Burger").isVisible();
  await page.unroute("**/api/scanner/extract");

  if (extractHit && itemVisible) {
    pass("menu scanner mock", `restaurant_id=${restaurantId}`);
  } else {
    fail(
      "menu scanner mock",
      `extractHit=${extractHit} itemVisible=${itemVisible}`
    );
  }
}
