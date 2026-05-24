import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import {
  formatApiRouteError,
  formatSupabaseClientError,
} from "@/lib/dashboard/format-user-error";
import { formatScannerApiError } from "@/lib/scanner/scanner-user-messages";

const REPO = join(import.meta.dirname, "../..");

describe("error-state formatters", () => {
  it("maps auth login failures", () => {
    expect(formatAuthError("Invalid login credentials")).toMatch(/incorrect/i);
    expect(formatAuthError("User already registered")).toMatch(/already exists/i);
  });

  it("redacts supabase postgres errors", () => {
    expect(
      formatSupabaseClientError('duplicate key value violates unique constraint "restaurants_slug_key"')
    ).toMatch(/could not save/i);
    expect(formatSupabaseClientError("JWT expired")).toMatch(/sign in again/i);
  });

  it("maps restaurant API validation", () => {
    expect(formatApiRouteError({ error: "name is required" }, 400, "fail")).toMatch(
      /name is required/i
    );
  });

  it("scanner env errors stay owner-friendly", () => {
    expect(formatScannerApiError({ error: "Environment configuration is invalid" }, 503)).toMatch(
      /not available right now/i
    );
    expect(formatScannerApiError({ error: "Environment configuration is invalid" }, 503)).not.toMatch(
      /Gemini/i
    );
  });
});

describe("error-state wiring (launch 30)", () => {
  it("auth form uses formatAuthError", () => {
    const src = readFileSync(join(REPO, "components/auth/auth-form.tsx"), "utf8");
    expect(src).toContain("formatAuthError");
    expect(src).toContain('role="alert"');
  });

  it("KDS panel formats sync errors", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("formatSupabaseClientError");
    expect(panel).toContain("kds-empty-state");
  });

  it("menu import history avoids Unknown error", () => {
    const hist = readFileSync(
      join(REPO, "components/menu-import/MenuImportHistory.tsx"),
      "utf8"
    );
    expect(hist).toContain("formatApiRouteError");
    expect(hist).not.toContain('"Unknown error"');
  });

  it("restaurants API does not leak raw DB message", () => {
    const route = readFileSync(join(REPO, "app/api/restaurants/route.ts"), "utf8");
    expect(route).not.toMatch(
      /NextResponse\.json\(\{\s*error:\s*error\.message/
    );
  });

  it("analytics empty state is actionable", () => {
    const dash = readFileSync(
      join(REPO, "components/analytics/AnalyticsDashboard.tsx"),
      "utf8"
    );
    expect(dash).toContain("No activity in this range");
    expect(dash).toContain("Open restaurants");
  });

  it("billing pilot mode explains posture", () => {
    const billing = readFileSync(
      join(REPO, "components/billing/BillingDashboard.tsx"),
      "utf8"
    );
    expect(billing).toContain("Pilot billing mode");
  });

  it("create restaurant button formats API errors", () => {
    const btn = readFileSync(
      join(REPO, "app/dashboard/restaurants/CreateRestaurantButton.tsx"),
      "utf8"
    );
    expect(btn).toContain("formatApiRouteError");
    expect(btn).toContain('role="alert"');
  });

  it("contact form validates with role=alert", () => {
    const form = readFileSync(
      join(REPO, "components/landing/contact/contact-pilot-form.tsx"),
      "utf8"
    );
    expect(form).toContain('role="alert"');
    expect(form).not.toContain("error.message");
  });
});
