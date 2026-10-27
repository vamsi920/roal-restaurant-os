import { describe, expect, it } from "vitest";
import {
  AUTH_ERROR_MESSAGES,
  authErrorCode,
  authErrorKind,
  formatAuthError,
} from "@/lib/auth/format-auth-error";

/** Shape of a FirebaseError (code + "Firebase: Error (auth/…)." message). */
function fbError(code: string) {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

describe("formatAuthError (Firebase codes)", () => {
  it.each([
    ["auth/invalid-credential", "invalid_credentials", /incorrect/i],
    ["auth/wrong-password", "invalid_credentials", /incorrect/i],
    ["auth/user-not-found", "user_not_found", /no account/i],
    ["auth/email-already-in-use", "user_exists", /already exists/i],
    ["auth/weak-password", "weak_password", /at least 8 characters/i],
    ["auth/invalid-email", "invalid_email", /email address/i],
    ["auth/too-many-requests", "rate_limited", /too many attempts/i],
    ["auth/network-request-failed", "network", /connection/i],
    ["auth/popup-blocked", "popup_blocked", /pop-ups/i],
    ["auth/popup-closed-by-user", "popup_closed", /closed before/i],
    ["auth/cancelled-popup-request", "popup_closed", /closed before/i],
    ["auth/operation-not-allowed", "provider_disabled", /^This sign-in method isn't switched on in Firebase yet\.$/],
    ["auth/unauthorized-domain", "unauthorized_domain", /^This domain isn't authorized for sign-in yet\.$/],
    ["session/exchange-failed", "session_failed", /couldn't start your session/i],
  ])("%s", (code, kind, pattern) => {
    const err = fbError(code);
    expect(authErrorKind(err)).toBe(kind);
    expect(formatAuthError(err)).toMatch(pattern);
    // A bare code string maps the same way.
    expect(formatAuthError(code)).toBe(formatAuthError(err));
  });

  it("reads the code from the message when the object has none", () => {
    expect(authErrorCode(new Error("Firebase: Error (auth/invalid-email)."))).toBe("auth/invalid-email");
    expect(authErrorCode({ code: "auth/popup-blocked" })).toBe("auth/popup-blocked");
    expect(authErrorCode("nothing here")).toBeNull();
  });

  it("never leaks Firebase wrapping for unmapped codes", () => {
    expect(formatAuthError(fbError("auth/internal-error"))).toBe("Something went wrong. Try again.");
    const custom = Object.assign(new Error("Firebase: Quota hit for project (auth/quota-exceeded)."), {
      code: "auth/quota-exceeded",
    });
    expect(formatAuthError(custom)).toBe("Quota hit for project");
  });

  it("every message is plain English with no codes", () => {
    for (const msg of Object.values(AUTH_ERROR_MESSAGES)) {
      expect(msg).not.toMatch(/auth\/|firebase:/i);
      expect(msg.length).toBeLessThan(120);
    }
  });

  it("still maps legacy wording and network failures", () => {
    expect(formatAuthError("Invalid login credentials")).toMatch(/incorrect/i);
    expect(formatAuthError("User already registered")).toMatch(/already exists/i);
    expect(formatAuthError(new TypeError("Failed to fetch"))).toMatch(/connection/i);
  });

  it("falls back safely", () => {
    expect(formatAuthError("")).toMatch(/something went wrong/i);
    expect(formatAuthError(null)).toMatch(/something went wrong/i);
    expect(formatAuthError({})).toMatch(/something went wrong/i);
    expect(authErrorKind(undefined)).toBe("unknown");
    expect(formatAuthError("x".repeat(200))).toMatch(/sign-in failed/i);
    expect(formatAuthError("Demo sign-in is not available.")).toBe("Demo sign-in is not available.");
  });
});
