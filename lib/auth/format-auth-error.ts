/**
 * Plain-English auth errors for the public login / signup / reset pages.
 * Firebase Auth reports a stable `code` (e.g. `auth/invalid-credential`); we map those,
 * and fall back to the message with Firebase's "Firebase: … (auth/…)" wrapping stripped.
 * Never show raw provider jargon to a restaurant owner.
 */

export type AuthErrorKind =
  | "invalid_credentials"
  | "user_not_found"
  | "user_exists"
  | "user_disabled"
  | "weak_password"
  | "invalid_email"
  | "rate_limited"
  | "network"
  | "popup_blocked"
  | "popup_closed"
  | "provider_disabled"
  | "unauthorized_domain"
  | "session_failed"
  | "unknown";

const CODE_KIND: Record<string, AuthErrorKind> = {
  "auth/invalid-credential": "invalid_credentials",
  "auth/invalid-login-credentials": "invalid_credentials",
  "auth/wrong-password": "invalid_credentials",
  "auth/user-not-found": "user_not_found",
  "auth/email-already-in-use": "user_exists",
  "auth/user-disabled": "user_disabled",
  "auth/weak-password": "weak_password",
  "auth/invalid-email": "invalid_email",
  "auth/missing-email": "invalid_email",
  "auth/too-many-requests": "rate_limited",
  "auth/network-request-failed": "network",
  "auth/popup-blocked": "popup_blocked",
  "auth/popup-closed-by-user": "popup_closed",
  "auth/cancelled-popup-request": "popup_closed",
  "auth/user-cancelled": "popup_closed",
  "auth/operation-not-allowed": "provider_disabled",
  "auth/unauthorized-domain": "unauthorized_domain",
  "auth/unauthorized-continue-uri": "unauthorized_domain",
  "auth/invalid-continue-uri": "unauthorized_domain",
  "session/exchange-failed": "session_failed",
};

export const AUTH_ERROR_MESSAGES: Record<Exclude<AuthErrorKind, "unknown">, string> = {
  invalid_credentials: "Email or password is incorrect. Try again or reset your password.",
  user_not_found: "No account uses that email yet. Create one instead.",
  user_exists: "An account with this email already exists. Sign in instead.",
  user_disabled: "This account has been turned off. Contact support to turn it back on.",
  weak_password: "Use at least 8 characters for your password.",
  invalid_email: "That email address doesn't look right. Check it and try again.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
  network: "Can't reach the server. Check your connection and try again.",
  popup_blocked:
    "Your browser blocked the Google sign-in window. Allow pop-ups for this site, or use email below.",
  popup_closed: "The Google window closed before sign-in finished. Try again.",
  provider_disabled: "This sign-in method isn't switched on in Firebase yet.",
  unauthorized_domain: "This domain isn't authorized for sign-in yet.",
  session_failed: "You signed in, but we couldn't start your session. Try again.",
};

const GENERIC = "Something went wrong. Try again.";

/** Pull a Firebase-style code from an error object, a bare code, or a "Firebase: … (auth/x)." message. */
export function authErrorCode(input: unknown): string | null {
  if (input && typeof input === "object" && "code" in input) {
    const code = (input as { code?: unknown }).code;
    if (typeof code === "string" && code) return code;
  }
  const text = typeof input === "string" ? input : input instanceof Error ? input.message : "";
  const match = /\b((?:auth|session)\/[a-z-]+)\b/.exec(text);
  return match ? match[1] : null;
}

function messageOf(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message;
  if (input && typeof input === "object" && "message" in input) {
    const m = (input as { message?: unknown }).message;
    return typeof m === "string" ? m : "";
  }
  return "";
}

/** Bucket an auth failure so the UI can highlight the right field or offer the next step. */
export function authErrorKind(input: unknown): AuthErrorKind {
  const code = authErrorCode(input);
  if (code && CODE_KIND[code]) return CODE_KIND[code];

  // Older (pre-Firebase) wording and plain network failures, matched loosely.
  const lower = messageOf(input).trim().toLowerCase();
  if (!lower) return "unknown";
  if (lower.includes("invalid login credentials")) return "invalid_credentials";
  if (lower.includes("already registered") || lower.includes("already in use")) return "user_exists";
  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower === "load failed"
  ) {
    return "network";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) return "rate_limited";
  return "unknown";
}

/** Owner-facing sentence for any auth failure (Firebase error, code string, or message). */
export function formatAuthError(input: unknown): string {
  const kind = authErrorKind(input);
  if (kind !== "unknown") return AUTH_ERROR_MESSAGES[kind];

  const cleaned = messageOf(input)
    .replace(/^Firebase:\s*/i, "")
    .replace(/\s*\((?:auth|session)\/[a-z-]+\)\.?/i, "")
    .trim();
  if (!cleaned || /^error\.?$/i.test(cleaned)) return GENERIC;
  if (cleaned.length > 120) return "Sign-in failed. Try again.";
  return cleaned;
}
