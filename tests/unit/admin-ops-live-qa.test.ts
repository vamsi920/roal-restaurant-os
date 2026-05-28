import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("admin ops live posture (launch 24)", () => {
  it("admin page gates guest and member", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/admin/page.tsx"),
      "utf8"
    );
    expect(page).toContain("hasOrgAdminAccess");
    expect(page).toContain('redirect("/dashboard")');
  });

  it("dashboard layout hides platform support nav for restaurant owners", () => {
    const layout = readFileSync(
      join(REPO, "app/dashboard/layout.tsx"),
      "utf8"
    );
    expect(layout).toContain("showAdminNav={hasOrgAdminAccess(context)}");
    const shell = readFileSync(
      join(REPO, "components/dashboard/app-shell.tsx"),
      "utf8"
    );
    expect(shell).toContain("platformOnly");
    expect(shell).toContain("showAdminNav");
  });

  it("admin dashboard uses platform support copy", () => {
    const dash = readFileSync(
      join(REPO, "components/admin/AdminOpsDashboard.tsx"),
      "utf8"
    );
    expect(dash).toContain("Platform support");
    expect(dash).not.toContain("Admin / Ops");
    expect(dash).not.toMatch(/Staff/);
  });

  it("admin dashboard states no secrets shown", () => {
    const dash = readFileSync(
      join(REPO, "components/admin/AdminOpsDashboard.tsx"),
      "utf8"
    );
    expect(dash).toMatch(/No API keys or secrets/i);
    expect(dash).toContain("/api/health");
    expect(dash).not.toMatch(/process\.env\.|GEMINI_API_KEY|SERVICE_ROLE/i);
  });

  it("health route sanitizes before JSON response", () => {
    const route = readFileSync(
      join(REPO, "app/api/health/route.ts"),
      "utf8"
    );
    expect(route).toContain("sanitizeHealthReportForPublic");
    expect(route).toMatch(/Health check failed/);
  });

  it("ops snapshot sanitizes health and sync errors", () => {
    const load = readFileSync(
      join(REPO, "lib/admin/load-ops-snapshot.ts"),
      "utf8"
    );
    expect(load).toContain("sanitizeHealthReportForPublic");
    expect(load).toContain("sanitizeOpsErrorDetail");
    expect(load).toContain("agentIdSuffix");
  });
});
