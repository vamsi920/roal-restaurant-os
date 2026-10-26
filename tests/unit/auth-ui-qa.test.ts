import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";
import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";

const REPO = join(import.meta.dirname, "../..");

describe("auth UI polish", () => {
  it("auth form keeps supabase sign-in and sign-up wiring", () => {
    const form = readFileSync(join(REPO, "components/auth/auth-form.tsx"), "utf8");
    expect(form).toContain("signInWithPassword");
    expect(form).toContain("signUp");
  });

  it("copy stays short and includes trust lines", () => {
    expect(LOGIN_PAGE_COPY.form.lead.length).toBeLessThan(90);
    expect(LOGIN_PAGE_COPY.form.trustLine.length).toBeGreaterThan(10);
    expect(SIGNUP_PAGE_COPY.form.lead.length).toBeLessThan(90);
    expect(SIGNUP_PAGE_COPY.form.trustLine.length).toBeGreaterThan(10);
    expect(SIGNUP_PAGE_COPY.steps[0]?.tag.length).toBeGreaterThan(3);
  });

  it("auth form avoids invalid fields on server errors", () => {
    const form = readFileSync(join(REPO, "components/auth/auth-form.tsx"), "utf8");
    expect(form).not.toMatch(/invalid=\{hasError\}/);
    expect(form).toContain("AuthFormStatus");
  });
});
