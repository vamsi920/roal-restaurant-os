/** Copy for `/reset-password`: request a link, then set a new password. */

/** Where the recovery email lands after `/auth/callback` exchanges the code. */
export const RESET_PASSWORD_UPDATE_PATH = "/reset-password?mode=update" as const;

export const RESET_PASSWORD_PAGE_COPY = {
  seo: {
    title: "Reset Password — ROAL",
    description: "Reset the password for your ROAL restaurant workspace.",
  },
  request: {
    title: "Reset your password",
    lead: "Enter your account email and we'll send you a link to set a new one.",
    submitLabel: "Send reset link",
    loadingLabel: "Sending…",
    sentTitle: "Check your inbox",
    sentLead: "If an account exists for",
    sentTail: "a reset link is on its way.",
    sentHint: "Links expire after an hour. Not there? Check spam.",
    tryAgain: "Use a different email",
    expired: "That reset link expired or was already used. Request a new one below.",
  },
  form: {
    title: "Set a new password",
    lead: "Choose a new password for your account.",
    passwordLabel: "New password",
    confirmLabel: "Confirm password",
    passwordPlaceholder: "8+ characters",
    passwordHint: "At least 8 characters.",
    submitLabel: "Update password",
    loadingLabel: "Saving…",
    mismatch: "Passwords do not match.",
    successTitle: "Password updated",
    successLead: "You're signed in with your new password.",
    continueLabel: "Continue to workspace",
  },
  footer: {
    remembered: "Remembered it?",
    backToSignIn: "Back to sign in",
  },
} as const;
