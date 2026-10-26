import { describe, expect, it } from "vitest";
import {
  decodeTrialCookie,
  encodeTrialCookie,
  generateTrialToken,
  hashTrialToken,
  TRIAL_COOKIE_MAX_AGE_SEC,
  TRIAL_COOKIE_NAME,
  trialCookieOptions,
  trialTokenMatches,
} from "@/lib/trial/token";

const TRIAL_ID = "11111111-1111-4111-8111-111111111111";

describe("trial tokens", () => {
  it("generates unique url-safe tokens", () => {
    const a = generateTrialToken();
    const b = generateTrialToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(30);
  });

  it("hashes deterministically with sha256 hex", () => {
    const hash = hashTrialToken("abc");
    expect(hash).toBe(hashTrialToken("abc"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(hashTrialToken("abd"));
  });

  it("matches a token against its hash and rejects others", () => {
    const token = generateTrialToken();
    const hash = hashTrialToken(token);
    expect(trialTokenMatches(token, hash)).toBe(true);
    expect(trialTokenMatches(`${token}x`, hash)).toBe(false);
    expect(trialTokenMatches(token, "short")).toBe(false);
    expect(trialTokenMatches(token, "")).toBe(false);
  });
});

describe("trial cookie", () => {
  it("round-trips through encode/decode", () => {
    const token = generateTrialToken();
    const encoded = encodeTrialCookie(TRIAL_ID, token);
    expect(encoded).toBe(`${TRIAL_ID}.${token}`);
    expect(decodeTrialCookie(encoded)).toEqual({ trialId: TRIAL_ID, token });
  });

  it("rejects malformed values", () => {
    expect(decodeTrialCookie(undefined)).toBeNull();
    expect(decodeTrialCookie(null)).toBeNull();
    expect(decodeTrialCookie("")).toBeNull();
    expect(decodeTrialCookie("no-dot")).toBeNull();
    expect(decodeTrialCookie(".token")).toBeNull();
    expect(decodeTrialCookie(`${TRIAL_ID}.`)).toBeNull();
    expect(decodeTrialCookie("not-a-uuid.token")).toBeNull();
  });

  it("exposes stable cookie options", () => {
    expect(TRIAL_COOKIE_NAME).toBe("roal_trial");
    expect(TRIAL_COOKIE_MAX_AGE_SEC).toBe(7 * 24 * 60 * 60);
    expect(trialCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TRIAL_COOKIE_MAX_AGE_SEC,
    });
  });
});
