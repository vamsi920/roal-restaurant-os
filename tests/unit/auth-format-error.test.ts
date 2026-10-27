import { describe, expect, it } from "vitest";
import {
  authErrorKind,
  formatAuthError,
  GOOGLE_DISABLED_MESSAGE,
} from "@/lib/auth/format-auth-error";

describe("formatAuthError", () => {
  it.each([
    ["Invalid login credentials", "invalid_credentials", /incorrect/i],
    ["Email not confirmed", "email_not_confirmed", /confirm your email/i],
    ["User already registered", "user_exists", /already exists/i],
    ["A user with this email address has already been registered", "user_exists", /already exists/i],
    ["Password should be at least 6 characters", "weak_password", /at least 8 characters/i],
    ["Password should be at least 6 characters.", "weak_password", /at least 8/i],
    ["Unsupported provider: provider is not enabled", "provider_disabled", /switched on yet/i],
    ["access_denied", "oauth_cancelled", /cancelled/i],
    ["email rate limit exceeded", "rate_limited", /too many attempts/i],
    ["Request rate limit reached", "rate_limited", /too many attempts/i],
    ["For security purposes, you can only request this after 42 seconds.", "rate_limited", /wait/i],
    ["Too Many Requests", "rate_limited", /too many/i],
    ["Failed to fetch", "network", /connection/i],
    ["TypeError: NetworkError when attempting to fetch resource.", "network", /connection/i],
    ["Load failed", "network", /connection/i],
    ["invalid request: both auth code and code verifier should be non-empty", "pkce_mismatch", /same browser/i],
    ["Signups not allowed for this instance", "signup_disabled", /not available/i],
    ["New password should be different from the old password.", "same_password", /different password/i],
    ['Email address "x@y" is invalid', "invalid_email", /email address/i],
    ["Email link is invalid or has expired", "link_expired", /expired/i],
    ["Token has expired or is invalid", "link_expired", /expired/i],
  ])("%s", (raw, kind, pattern) => {
    expect(authErrorKind(raw)).toBe(kind);
    expect(formatAuthError(raw)).toMatch(pattern);
  });

  it("uses the exact Google hand-off message", () => {
    expect(formatAuthError("Unsupported provider: provider is not enabled")).toBe(GOOGLE_DISABLED_MESSAGE);
    expect(GOOGLE_DISABLED_MESSAGE).toBe("Google sign-in isn't switched on yet — use email for now.");
  });

  it("falls back safely", () => {
    expect(formatAuthError("")).toMatch(/something went wrong/i);
    expect(formatAuthError(null)).toMatch(/something went wrong/i);
    expect(authErrorKind(undefined)).toBe("unknown");
    expect(formatAuthError("x".repeat(200))).toMatch(/sign-in failed/i);
    expect(formatAuthError("Short custom note")).toBe("Short custom note");
  });
});
