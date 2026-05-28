import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatAuthError } from "@/lib/auth/format-auth-error";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("auth form states responsive (prompt 18)", () => {
  it("keeps auth errors short and plain", () => {
    expect(formatAuthError("Invalid login credentials")).toMatch(/incorrect/i);
    expect(
      formatAuthError("otp_expired email link is invalid or has expired please request a new one")
    ).toMatch(/expired|invalid/i);
    expect(formatAuthError("x".repeat(200)).length).toBeLessThan(80);
  });

  it("uses reserved status slot in auth and reset forms", () => {
    const form = read("components/auth/auth-form.tsx");
    const reset = read("components/auth/reset-password-form.tsx");
    const status = read("components/auth/auth-form-status.tsx");

    expect(status).toContain("public-auth-status-slot");
    expect(status).toContain('role="alert"');
    expect(form).toContain("AuthFormStatus");
    expect(reset).toContain("AuthFormStatus");
    expect(form).toContain("public-auth-submit--busy");
    expect(form).toContain("aria-busy={loading}");
  });

  it("styles loading, disabled, errors, and focus in auth-page.css", () => {
    const css = read("app/auth-page.css");
    expect(css).toContain("Auth form states (prompt 18)");
    expect(css).toMatch(/\.public-auth-status-slot\[data-empty\][\s\S]*min-height/);
    expect(css).toContain(".public-auth-submit--busy");
    expect(css).toContain(".public-auth-panel--busy");
    expect(css).toMatch(/\.public-form-field__input:focus-visible/);
    expect(css).toContain(".public-auth-panel--success");
  });
});
