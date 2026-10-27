import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUTH_FORM_COPY, LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";

const REPO = join(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(join(REPO, p), "utf8");

describe("auth UI", () => {
  it("auth form signs in through the Firebase client helpers only", () => {
    const form = read("components/auth/auth-form.tsx");
    expect(form).toContain('from "@/lib/firebase/client"');
    expect(form).toContain("signInWithEmail(submittedEmail, submittedPassword, { create: isSignUp, remember })");
    expect(form).toContain("signInWithGoogle(remember)");
    expect(form).toContain("signInDemo");
    expect(form).toContain("window.location.assign(next)");
    expect(form).not.toMatch(/supabase/i);
    expect(read("components/auth/reset-password-form.tsx")).not.toMatch(/supabase/i);
  });

  it("remember me is a real checkbox wired to persistence", () => {
    const form = read("components/auth/auth-form.tsx");
    expect(form).toContain('type="checkbox"');
    expect(form).toContain("checked={remember}");
    expect(AUTH_FORM_COPY.remember).toBe("Remember me on this device");
  });

  it("demo mode swaps the card for one demo button", () => {
    const form = read("components/auth/auth-form.tsx");
    expect(form).toContain("CLIENT_DEMO_MODE");
    expect(AUTH_FORM_COPY.demo.submitLabel).toBe("Continue as demo owner");
    expect(AUTH_FORM_COPY.demo.note).toBe(
      "Demo mode — Firebase isn't connected yet. You'll sign in as a demo restaurant owner."
    );
  });

  it("password reset never reveals whether an account exists", () => {
    const reset = read("components/auth/reset-password-form.tsx");
    expect(reset).toContain("requestPasswordReset");
    expect(reset).toContain('kind !== "user_not_found"');
    expect(reset).not.toContain("updateUser");
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
