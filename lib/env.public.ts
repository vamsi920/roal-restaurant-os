import { z } from "zod";
import {
  ENV_HINTS,
  optionalString,
  parseEnv,
} from "@/lib/env.shared";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_URL is required" })
    .url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" })
    .min(20, { message: "NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short" }),
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
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
    ENV_HINTS
  );
  return cached;
}

export function resetPublicEnvCache(): void {
  cached = null;
}
