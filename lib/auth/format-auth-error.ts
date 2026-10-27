/**
 * Plain-English auth errors for public login / signup / reset pages.
 * Supabase (GoTrue) messages are matched loosely by substring because their exact
 * wording shifts between versions. Never show raw provider jargon to a restaurant owner.
 */

export type AuthErrorKind =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_exists"
  | "weak_password"
  | "provider_disabled"
  | "oauth_cancelled"
  | "rate_limited"
  | "network"
  | "pkce_mismatch"
  | "link_expired"
  | "link_invalid"
  | "signup_disabled"
  | "invalid_email"
  | "same_password"
  | "not_configured"
  | "unknown";

export const GOOGLE_DISABLED_MESSAGE =
  "Google sign-in isn't switched on yet — use email for now.";

export const AUTH_NOT_CONFIGURED_MESSAGE =
  "Sign-in isn't set up on this server yet. Add the Supabase URL and anon key to the environment.";

/** Bucket a raw Supabase / network message so the UI can offer the right next step. */
export function authErrorKind(message: string | null | undefined): AuthErrorKind {
  const lower = message?.trim().toLowerCase() ?? "";
  if (!lower) return "unknown";

  if (lower.includes("invalid login credentials")) return "invalid_credentials";
  if (lower.includes("email not confirmed")) return "email_not_confirmed";
  if (
    lower.includes("user already registered") ||
    lower.includes("already been registered") ||
    lower.includes("email address is already") ||
    lower.includes("user_already_exists")
  ) {
    return "user_exists";
  }
  if (
    lower.includes("unsupported provider") ||
    lower.includes("provider is not enabled") ||
    lower.includes("provider_disabled")
  ) {
    return "provider_disabled";
  }
  if (
    lower.includes("access_denied") ||
    lower.includes("access denied") ||
    lower.includes("user denied") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return "oauth_cancelled";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("for security purposes, you can only request this")
  ) {
    return "rate_limited";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("network error") ||
    lower === "load failed"
  ) {
    return "network";
  }
  if (lower.includes("code verifier") || lower.includes("code challenge")) {
    return "pkce_mismatch";
  }
  if (lower.includes("signup is disabled") || lower.includes("signups not allowed")) {
    return "signup_disabled";
  }
  if (lower.includes("same password") || lower.includes("different from the old password")) {
    return "same_password";
  }
  if (
    lower.includes("password should be at least") ||
    lower.includes("password should contain") ||
    lower.includes("weak password") ||
    lower.includes("weak_password") ||
    lower.includes("password is known to be weak")
  ) {
    return "weak_password";
  }
  if (lower.includes("not configured") || lower.includes("next_public_supabase")) {
    return "not_configured";
  }
  if (lower.includes("email") && lower.includes("invalid") && !lower.includes("link")) {
    return "invalid_email";
  }
  if (lower.includes("expired")) return "link_expired";
  if (lower.includes("invalid") && (lower.includes("link") || lower.includes("token") || lower.includes("otp"))) {
    return "link_invalid";
  }
  return "unknown";
}

/** Public login/signup — no raw Supabase jargon. */
export function formatAuthError(message: string | null | undefined): string {
  const m = message?.trim();
  if (!m) return "Something went wrong. Try again.";

  const lower = m.toLowerCase();
  switch (authErrorKind(m)) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "email_not_confirmed":
      return "Confirm your email before signing in. Check your inbox for the link.";
    case "user_exists":
      return "An account with this email already exists. Sign in instead.";
    case "weak_password":
      return "Use at least 8 characters for your password.";
    case "provider_disabled":
      return GOOGLE_DISABLED_MESSAGE;
    case "oauth_cancelled":
      return "Google sign-in was cancelled. Try again, or use email.";
    case "rate_limited":
      return "Too many attempts. Wait a minute and try again.";
    case "network":
      return "Can't reach the server. Check your connection and try again.";
    case "pkce_mismatch":
      return "Open the email link in the same browser you started in, or just sign in here.";
    case "signup_disabled":
      return "Sign-up is not available right now. Contact us for a pilot invite.";
    case "same_password":
      return "Choose a different password than your current one.";
    case "not_configured":
      return AUTH_NOT_CONFIGURED_MESSAGE;
    case "invalid_email":
      return "That email address doesn't look right. Check it and try again.";
    case "link_expired":
      return lower.includes("reset")
        ? "This reset link expired. Request a new one."
        : "This link expired. Request a new email and try again.";
    case "link_invalid":
      return "This link is invalid or was already used. Request a new one.";
    case "unknown":
      break;
  }

  if (lower.includes("forgot password") || lower.includes("reset password")) {
    return "Use the reset link from your email, or request a new one.";
  }
  if (lower.includes("invalid")) {
    return "That did not work. Check your details and try again.";
  }
  if (m.length > 120) {
    return "Sign-in failed. Try again or use the link from your email.";
  }
  return m;
}
