import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const TRIAL_COOKIE_NAME = "roal_trial";
export const TRIAL_COOKIE_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export function generateTrialToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashTrialToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function trialTokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashTrialToken(token));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cookie value: `<trialId>.<token>`. */
export function encodeTrialCookie(trialId: string, token: string): string {
  return `${trialId}.${token}`;
}

export function decodeTrialCookie(
  value: string | null | undefined
): { trialId: string; token: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const trialId = value.slice(0, dot).trim();
  const token = value.slice(dot + 1).trim();
  if (!/^[0-9a-f-]{36}$/i.test(trialId) || !token) return null;
  return { trialId, token };
}

export function trialCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRIAL_COOKIE_MAX_AGE_SEC,
  };
}
