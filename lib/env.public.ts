import { z } from "zod";
import {
  ENV_HINTS,
  optionalString,
  parseEnv,
} from "@/lib/env.shared";

const publicEnvSchema = z.object({
  /** Firebase web app config (all optional — missing = demo mode with a local demo owner). */
  NEXT_PUBLIC_FIREBASE_API_KEY: optionalString,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalString,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_APP_ID: optionalString,
  /** Production origin for canonicals, OG, billing redirects, Twilio webhooks (falls back to VERCEL_URL). */
  NEXT_PUBLIC_APP_URL: optionalString,
  /** Planned: Stripe Checkout / Customer Portal (not required for POC). */
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cached) return cached;
  // Direct `process.env.NEXT_PUBLIC_*` refs so Next.js inlines them in client bundles.
  cached = parseEnv(
    publicEnvSchema,
    {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
    ENV_HINTS
  );
  return cached;
}

/** True when the Firebase web config needed for client sign-in is present. */
export function isFirebaseClientConfigured(env: PublicEnv = getPublicEnv()): boolean {
  return Boolean(
    env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function resetPublicEnvCache(): void {
  cached = null;
}
