/**
 * Demo mode: Firebase is not configured, so auth is a single local demo owner and
 * data lives in the in-memory store. Never on in production unless explicitly forced.
 */
export function isFirebaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() &&
      (process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim())
  );
}

export function isAuthDemoMode(): boolean {
  if (isFirebaseAuthConfigured()) return false;
  if (process.env.NODE_ENV === "production" && process.env.ROAL_DEMO_MODE !== "1") return false;
  return true;
}
