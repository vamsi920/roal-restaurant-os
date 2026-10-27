import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";

const REPO = join(import.meta.dirname, "../..");

const AUTH_FORM = join(REPO, "components/auth/auth-form.tsx");
const LOGIN_PAGE = join(REPO, "app/(auth)/login/page.tsx");
const SIGNUP_PAGE = join(REPO, "app/(auth)/signup/page.tsx");
const AUTH_SMOKE_SCRIPT = join(REPO, "scripts/auth-smoke.mjs");
const E2E_SMOKE_SCRIPT = join(REPO, "scripts/e2e-smoke.mjs");
const SMOKE_LIB = join(REPO, "scripts/playwright-smoke-lib.mjs");

/** Must stay obviously fake — never use for real sign-in. */
const FAKE_EMAIL = "smoke-test@example.invalid";

describe("auth flow smoke (static)", () => {
  const form = readFileSync(AUTH_FORM, "utf8");
  const loginPage = readFileSync(LOGIN_PAGE, "utf8");
  const signupPage = readFileSync(SIGNUP_PAGE, "utf8");
  const smokeScript = readFileSync(AUTH_SMOKE_SCRIPT, "utf8");
  const e2eScript = readFileSync(E2E_SMOKE_SCRIPT, "utf8");
  const smokeLib = readFileSync(SMOKE_LIB, "utf8");

  it("form resolves next via safeNextPath and mode defaults", () => {
    expect(form).toContain("defaultAuthNextPath");
    expect(form).toContain("safeNextPath");
    expect(form).toContain("SIGNUP_ONBOARDING_NEXT");
  });

  it("login and signup pages mount AuthForm with correct modes", () => {
    expect(loginPage).toContain("<AuthForm");
    expect(loginPage).toContain('searchParams.mode === "signup"');
    expect(signupPage).toContain('<AuthForm mode="sign_up"');
  });

  it("form exposes email/password field types and submit handler", () => {
    expect(form).toContain('type="email"');
    expect(form).toContain('type="password"');
    expect(form).toContain('name="email"');
    expect(form).toContain('name="password"');
    expect(form).toContain("onSubmit={onSubmit}");
    expect(form).toContain('method="post"');
    expect(form).toContain('autoComplete="email"');
    expect(form).toContain('autoComplete={isSignUp ? "new-password" : "current-password"}');
    expect(form).toContain('type="submit"');
  });

  it("submit path calls Supabase auth handlers", () => {
    expect(form).toContain("signInWithPassword");
    expect(form).toContain("auth.signUp");
    expect(form).toContain("e.preventDefault()");
    expect(form).toContain("createBrowserSupabase()");
  });

  it("copy drives titles and submit labels", () => {
    expect(form).toContain("copy.form.title");
    expect(form).toContain("copy.form.submitLabel");
    expect(LOGIN_PAGE_COPY.form.submitLabel).toBe("Sign in");
    expect(SIGNUP_PAGE_COPY.form.submitLabel).toBe("Create account");
  });

  it("playwright smoke scripts use fake credentials only", () => {
    expect(smokeLib).toContain(FAKE_EMAIL);
    expect(smokeLib).toContain("example.invalid");
    expect(smokeLib).toContain("not-a-real-password");
    expect(smokeScript).toContain("playwright-smoke-lib");
    expect(e2eScript).toContain("E2E_EMAIL");
    expect(e2eScript).toContain("api/scanner/extract");
    expect(e2eScript).not.toMatch(/password.*@getroal|hello@getroal/i);
  });
});
