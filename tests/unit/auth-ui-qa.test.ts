import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";

const REPO = join(import.meta.dirname, "../..");

describe("auth UI polish", () => {
  it("login and signup use public-theme shell without supabase changes in form", () => {
    const layout = readFileSync(join(REPO, "app/(auth)/layout.tsx"), "utf8");
    const form = readFileSync(join(REPO, "components/auth/auth-form.tsx"), "utf8");

    expect(layout).toContain("auth-page.css");
    expect(layout).toContain("public-theme-canvas");
    expect(form).toContain("PublicFormField");
    expect(form).toContain("public-auth-trust");
    expect(form).toContain("signInWithPassword");
    expect(form).toContain("signUp");
  });

  it("copy stays short and includes trust lines", () => {
    expect(LOGIN_PAGE_COPY.form.lead.length).toBeLessThan(90);
    expect(LOGIN_PAGE_COPY.form.trustLine.length).toBeGreaterThan(10);
    expect(SIGNUP_PAGE_COPY.form.lead.length).toBeLessThan(90);
    expect(SIGNUP_PAGE_COPY.form.trustLine.length).toBeGreaterThan(10);
    expect(SIGNUP_PAGE_COPY.steps[0]?.body).not.toContain("preview form");
  });

  it("signup aside uses glass card shell", () => {
    const aside = readFileSync(
      join(REPO, "components/auth/signup-onboarding-aside.tsx"),
      "utf8"
    );
    expect(aside).toContain("public-signup-aside__card");
  });

  it("login uses split entry with value aside", () => {
    const login = readFileSync(join(REPO, "app/(auth)/login/page.tsx"), "utf8");
    const entry = readFileSync(
      join(REPO, "components/auth/login-page-entry.tsx"),
      "utf8"
    );
    expect(login).toContain("LoginPageEntry");
    expect(entry).toContain("LoginValueAside");
    expect(entry).toContain('mode="sign_in"');
  });

  it("auth form avoids invalid fields on server errors", () => {
    const form = readFileSync(join(REPO, "components/auth/auth-form.tsx"), "utf8");
    expect(form).not.toMatch(/invalid=\{hasError\}/);
    expect(form).toContain("role=\"alert\"");
  });
});
