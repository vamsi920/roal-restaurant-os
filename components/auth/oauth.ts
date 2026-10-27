"use client";

import { getPublicEnv } from "@/lib/env.public";

let googleEnabledCache: Promise<boolean | null> | null = null;

/**
 * Asks Supabase whether the Google provider is switched on (public `/auth/v1/settings`).
 * `signInWithOAuth` never reports "provider is not enabled" itself: it just redirects,
 * and Supabase answers with a raw JSON error page. Checking first lets us show a
 * friendly message instead. Returns null when the check itself fails (then we try anyway).
 */
export function isGoogleProviderEnabled(): Promise<boolean | null> {
  if (googleEnabledCache) return googleEnabledCache;
  googleEnabledCache = (async () => {
    try {
      const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
      const res = await fetch(`${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: NEXT_PUBLIC_SUPABASE_ANON_KEY },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { external?: Record<string, boolean> };
      const value = body.external?.google;
      return typeof value === "boolean" ? value : null;
    } catch {
      return null;
    }
  })();
  // Don't pin a failed lookup for the rest of the session.
  void googleEnabledCache.then((v) => {
    if (v === null) googleEnabledCache = null;
  });
  return googleEnabledCache;
}

/** `${origin}/auth/callback?next=…` — the one redirect URL Supabase must allow. */
export function authCallbackUrl(next: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
