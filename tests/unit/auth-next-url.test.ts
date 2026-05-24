import { describe, expect, it } from "vitest";
import {
  authCrossLinkNext,
  authHrefWithNext,
  defaultAuthNextPath,
} from "@/lib/auth/auth-next-url";
import { SIGNUP_ONBOARDING_NEXT } from "@/lib/auth/signup-page-copy";

describe("auth next URL helpers", () => {
  it("defaults signup to onboarding and sign-in to dashboard", () => {
    expect(defaultAuthNextPath("sign_up")).toBe(SIGNUP_ONBOARDING_NEXT);
    expect(defaultAuthNextPath("sign_in")).toBe("/dashboard");
  });

  it("omits query when next matches mode default", () => {
    expect(authHrefWithNext("/signup", SIGNUP_ONBOARDING_NEXT, "sign_up")).toBe("/signup");
    expect(authHrefWithNext("/login", "/dashboard", "sign_in")).toBe("/login");
  });

  it("preserves custom next paths", () => {
    expect(authHrefWithNext("/login", "/dashboard/billing", "sign_in")).toBe(
      "/login?next=%2Fdashboard%2Fbilling"
    );
  });

  it("cross-links use target default when source still has its default", () => {
    expect(authCrossLinkNext("/dashboard", "sign_in")).toBe(SIGNUP_ONBOARDING_NEXT);
    expect(authHrefWithNext("/signup", authCrossLinkNext("/dashboard", "sign_in"), "sign_up")).toBe(
      "/signup"
    );
  });
});
