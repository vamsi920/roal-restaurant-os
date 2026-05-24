import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTH_ROUTES,
  buildGuestLoginRedirect,
  PROTECTED_DASHBOARD_PREFIX,
} from "@/lib/auth/auth-routes";
import { DASHBOARD_NAV_HREFS } from "@/lib/dashboard-nav";

const REPO = join(import.meta.dirname, "../..");

const DASHBOARD_PAGES = [
  "app/dashboard/page.tsx",
  "app/dashboard/restaurants/page.tsx",
  "app/dashboard/restaurants/[id]/page.tsx",
  "app/dashboard/restaurants/[id]/menu/page.tsx",
  "app/dashboard/onboarding/page.tsx",
  "app/dashboard/analytics/page.tsx",
  "app/dashboard/billing/page.tsx",
  "app/dashboard/settings/page.tsx",
  "app/dashboard/settings/notifications/page.tsx",
  "app/dashboard/support/page.tsx",
  "app/dashboard/admin/page.tsx",
] as const;

describe("auth route QA", () => {
  it("middleware matcher covers dashboard and auth pages", () => {
    const source = readFileSync(join(REPO, "middleware.ts"), "utf8");
    expect(source).toContain('"/dashboard/:path*"');
    expect(source).toContain('"/login"');
    expect(source).toContain('"/signup"');
    expect(source).toContain('"/auth/callback"');
  });

  it("guest dashboard visits redirect to login with next path", () => {
    const mw = readFileSync(join(REPO, "lib/supabase/middleware.ts"), "utf8");
    expect(mw).toContain("buildGuestLoginRedirect");
    expect(mw).toContain('pathname.startsWith("/dashboard")');

    expect(buildGuestLoginRedirect("/dashboard")).toBe(
      "/login?next=%2Fdashboard"
    );
    expect(buildGuestLoginRedirect("/dashboard/billing")).toBe(
      "/login?next=%2Fdashboard%2Fbilling"
    );
    expect(buildGuestLoginRedirect("/dashboard/restaurants/abc/menu")).toBe(
      "/login?next=%2Fdashboard%2Frestaurants%2Fabc%2Fmenu"
    );
  });

  it("dashboard nav links are under protected prefix", () => {
    for (const href of DASHBOARD_NAV_HREFS) {
      expect(href.startsWith(PROTECTED_DASHBOARD_PREFIX)).toBe(true);
    }
    expect(DASHBOARD_NAV_HREFS.length).toBeGreaterThan(5);
  });

  it("dashboard layout redirects unauthenticated users", () => {
    const layout = readFileSync(join(REPO, "app/dashboard/layout.tsx"), "utf8");
    expect(layout).toContain('redirect("/login?next=/dashboard")');
    expect(layout).toContain("getAuthContext");
  });

  it("login and signup pages exist and render auth UI", () => {
    const loginPath = join(REPO, "app/(auth)/login/page.tsx");
    const signupPath = join(REPO, "app/(auth)/signup/page.tsx");
    const authLayoutPath = join(REPO, "app/(auth)/layout.tsx");

    expect(existsSync(loginPath)).toBe(true);
    expect(existsSync(signupPath)).toBe(true);
    expect(existsSync(authLayoutPath)).toBe(true);

    const login = readFileSync(loginPath, "utf8");
    const signup = readFileSync(signupPath, "utf8");
    const authLayout = readFileSync(authLayoutPath, "utf8");

    expect(login).toContain("LoginPageEntry");
    expect(signup).toContain("SignupPageEntry");
    expect(authLayout).toContain("public-auth-main");
    expect(authLayout).toContain("PublicAuthHeader");
  });

  it("all dashboard app routes have page modules", () => {
    for (const file of DASHBOARD_PAGES) {
      expect(existsSync(join(REPO, file)), file).toBe(true);
    }
  });

  it("signed-in users on auth pages use safe next redirect", () => {
    const mw = readFileSync(join(REPO, "lib/supabase/middleware.ts"), "utf8");
    expect(mw).toContain("AUTH_PATHS");
    expect(mw).toContain("safeNextPath");
    expect(AUTH_ROUTES.login).toBe("/login");
    expect(AUTH_ROUTES.signup).toBe("/signup");
  });
});
