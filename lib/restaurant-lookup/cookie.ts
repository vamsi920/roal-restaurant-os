import { createHmac, timingSafeEqual } from "node:crypto";
import type { LookupCookiePayload } from "@/lib/restaurant-lookup/types";

export const LOOKUP_COOKIE_NAME = "roal_restaurant_lookup";
export const LOOKUP_COOKIE_MAX_AGE_SEC = 30 * 60;

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function getLookupSigningSecret(): string | null {
  return (
    process.env.AGENT_TOOL_SIGNING_SECRET?.trim() ||
    process.env.AGENT_TOOL_SECRET?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    null
  );
}

function sign(payloadB64: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(payloadB64).digest());
}

export function encodeLookupCookie(
  payload: Omit<LookupCookiePayload, "v" | "exp">,
  now = Date.now(),
  secret = getLookupSigningSecret()
): string | null {
  if (!secret) return null;
  const body: LookupCookiePayload = {
    v: 1,
    ...payload,
    exp: Math.floor(now / 1000) + LOOKUP_COOKIE_MAX_AGE_SEC,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(body));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function decodeLookupCookie(
  token: string | null | undefined,
  now = Date.now(),
  secret = getLookupSigningSecret()
): LookupCookiePayload | null {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as LookupCookiePayload;
    if (parsed.v !== 1 || typeof parsed.placeId !== "string" || !parsed.placeId.trim()) {
      return null;
    }
    if (typeof parsed.exp !== "number" || parsed.exp * 1000 <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function lookupCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOOKUP_COOKIE_MAX_AGE_SEC,
  };
}
