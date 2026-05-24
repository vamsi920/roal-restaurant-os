/** Public login/signup — no raw Supabase jargon. */
export function formatAuthError(message: string | null | undefined): string {
  const m = message?.trim();
  if (!m) return "Something went wrong. Try again.";

  const lower = m.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the link.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("password should be at least")) {
    return "Use at least 8 characters for your password.";
  }
  if (lower.includes("signup is disabled") || lower.includes("signups not allowed")) {
    return "Sign-up is not available right now. Contact us for a pilot invite.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (lower.includes("expired") || lower.includes("invalid")) {
    return m;
  }
  if (m.length > 180) {
    return "Sign-in failed. Try again or use the link from your email.";
  }
  return m;
}
