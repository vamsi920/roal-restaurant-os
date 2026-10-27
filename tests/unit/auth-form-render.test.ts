import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firebase = vi.hoisted(() => ({ demo: false }));
const params = vi.hoisted(() => ({ value: new URLSearchParams() }));

vi.mock("next/navigation", () => ({ useSearchParams: () => params.value }));
vi.mock("@/lib/firebase/client", () => ({
  get CLIENT_DEMO_MODE() {
    return firebase.demo;
  },
  signInDemo: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

// Vitest compiles the components' JSX with the classic runtime, which expects a global React.
(globalThis as { React?: typeof React }).React = React;
const { AuthForm } = await import("@/components/auth/auth-form");
const { ResetPasswordForm } = await import("@/components/auth/reset-password-form");

function render(mode: "sign_in" | "sign_up", trial: { restaurant: string | null } | null = null) {
  return renderToStaticMarkup(createElement(AuthForm, { mode, trial }));
}

describe("AuthForm markup", () => {
  beforeEach(() => {
    firebase.demo = false;
    params.value = new URLSearchParams();
  });

  it("Firebase mode: Google, divider, email + password, remember me (checked), no demo note", () => {
    const html = render("sign_in");
    expect(html).toContain("Continue with Google");
    expect(html).toContain('class="auth-divider"');
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toMatch(/type="checkbox"[^>]*checked=""/);
    expect(html).toContain("Remember me on this device");
    expect(html).toContain("Forgot password?");
    expect(html).not.toContain("Demo mode");
    expect(html).not.toContain("Continue as demo owner");
  });

  it("demo mode: amber note + one demo button, no Google or fields", () => {
    firebase.demo = true;
    const html = render("sign_up");
    expect(html).toContain("auth-note--demo");
    expect(html).toContain("Continue as demo owner");
    expect(html).not.toContain("Continue with Google");
    expect(html).not.toContain('type="password"');
  });

  it("trial banner names the restaurant", () => {
    const html = render("sign_up", { restaurant: "Luigi's" });
    expect(html).toContain("Your phone host for");
    expect(html).toContain("Luigi&#x27;s");
  });

  it("cross-links keep the toggle on the same card design", () => {
    expect(render("sign_in")).toContain('href="/signup"');
    expect(render("sign_up")).toContain('href="/login"');
    params.value = new URLSearchParams({ next: "/dashboard/billing" });
    expect(render("sign_in")).toContain('href="/signup?next=%2Fdashboard%2Fbilling"');
  });

  it("stale session shows a quiet note on sign-in", () => {
    params.value = new URLSearchParams({ stale: "1" });
    expect(render("sign_in")).toContain("Your session ended");
  });

  it("reset form asks only for an email", () => {
    const html = renderToStaticMarkup(createElement(ResetPasswordForm));
    expect(html).toContain('type="email"');
    expect(html).not.toContain('type="password"');
    expect(html).toContain("Send reset link");
  });
});
