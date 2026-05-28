import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("auth responsive (prompt 16)", () => {
  it("mounts viewport assist and skip link on auth layout", () => {
    const layout = read("app/(auth)/layout.tsx");
    expect(layout).toContain("AuthViewportAssist");
    expect(layout).toContain('href="#auth-main"');
    expect(layout).toContain("public-auth-skip-link");
  });

  it("documents prompt 16 touch and keyboard rules in auth-page.css", () => {
    const css = read("app/auth-page.css");
    expect(css).toContain("Auth responsive (prompt 16)");
    expect(css).toContain("Auth layout comfort (prompt 17)");
  });

  it("wraps errors and supports keyboard inset padding", () => {
    const css = read("app/auth-page.css");
    const assist = read("components/auth/auth-viewport-assist.tsx");

    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("--auth-keyboard-inset");
    expect(assist).toContain("visualViewport");
    expect(assist).toContain("scrollIntoView");
  });

  it("moves focus to confirmation and forgot-password sent titles", () => {
    const form = read("components/auth/auth-form.tsx");
    const reset = read("components/auth/reset-password-form.tsx");

    expect(form).toContain("forgotSentTitleRef");
    expect(form).toContain('signInView === "forgot_sent"');
    expect(form).toContain("confirmTitleRef");
    expect(reset).toContain("successTitleRef");
    expect(form).toContain("AuthFormStatus");
  });

  it("uses auth header drawer shared with marketing nav", () => {
    const header = read("components/auth/public-auth-header.tsx");
    expect(header).toContain("PublicNavDrawerPanel");
    expect(header).toContain("usePublicNavMenu");
  });
});
