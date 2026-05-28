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
  if (lower.includes("forgot password") || lower.includes("reset password")) {
    return "Use the reset link from your email, or request a new one below.";
  }
  if (lower.includes("same password")) {
    return "Choose a different password than your current one.";
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
  if (lower.includes("reset link") && lower.includes("expired")) {
    return "This reset link expired. Request a new one from sign in.";
  }
  if (lower.includes("expired") && (lower.includes("link") || lower.includes("token"))) {
    return "This link expired. Request a new email and try again.";
  }
  if (lower.includes("invalid") && (lower.includes("link") || lower.includes("token"))) {
    return "This link is invalid. Request a new one from sign in.";
  }
  if (lower.includes("expired")) {
    return "This link expired. Try again or request a new email.";
  }
  if (lower.includes("invalid")) {
    return "That did not work. Check your details and try again.";
  }
  if (m.length > 120) {
    return "Sign-in failed. Try again or use the link from your email.";
  }
  return m;
}
