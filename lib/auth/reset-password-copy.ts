/** Copy for `/reset-password` after email recovery link. */

export const RESET_PASSWORD_PAGE_COPY = {
  seo: {
    title: "Set New Password — ROAL",
    description: "Choose a new password for your ROAL restaurant workspace.",
  },
  form: {
    title: "Set a new password",
    lead: "Enter a new password for your account, then continue to your workspace.",
    passwordLabel: "New password",
    confirmLabel: "Confirm password",
    passwordPlaceholder: "8+ characters",
    passwordHint: "At least 8 characters.",
    submitLabel: "Update password",
    loadingLabel: "Saving…",
    mismatch: "Passwords do not match.",
    successTitle: "Password updated",
    successLead: "You can sign in with your new password anytime.",
    continueLabel: "Continue to workspace",
  },
} as const;
