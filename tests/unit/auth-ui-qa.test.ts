import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";

const REPO = join(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(join(REPO, p), "utf8");

describe("auth UI", () => {
  it("auth form keeps supabase sign-in, sign-up, Google and resend wiring", () => {
    const form = read("components/auth/auth-form.tsx");
    expect(form).toContain("signInWithPassword");
    expect(form).toContain("auth.signUp");
    expect(form).toContain('provider: "google"');
    expect(form).toContain("auth.resend");
    expect(form).toContain("isGoogleProviderEnabled");
  });

  it("copy stays short", () => {
    expect(LOGIN_PAGE_COPY.form.lead.length).toBeLessThan(90);
    expect(SIGNUP_PAGE_COPY.form.lead.length).toBeLessThan(90);
    expect(LOGIN_PAGE_COPY.form.title).toBe("Welcome back");
    expect(SIGNUP_PAGE_COPY.form.title).toBe("Create your account");
  });

  it("errors render through the alert slot, not raw messages", () => {
    const form = read("components/auth/auth-form.tsx");
    expect(form).toContain("formatAuthError");
    expect(form).toContain("AuthFormStatus");
    expect(read("components/auth/auth-form-status.tsx")).toContain('role={tone === "error" ? "alert" : "status"}');
  });

  it("auth layout has no marketing nav and links legal pages", () => {
    const layout = read("app/(auth)/layout.tsx");
    expect(layout).not.toContain("SiteNav");
    expect(layout).toContain('href="/terms"');
    expect(layout).toContain('href="/privacy"');
    expect(layout).toContain("auth-page.css");
  });

  it("signup and login pages read the trial hint on the server", () => {
    expect(read("app/(auth)/signup/page.tsx")).toContain("readTrialHint");
    expect(read("app/(auth)/login/page.tsx")).toContain("readTrialHint");
    expect(read("components/auth/trial-hint.ts")).toContain("readPendingTrialFromCookie");
  });
});
