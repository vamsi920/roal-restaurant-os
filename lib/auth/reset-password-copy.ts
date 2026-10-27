/**
 * Copy for `/reset-password`. Firebase emails the link and hosts the "choose a new
 * password" form; its continue button returns the owner to `/login`.
 */

export const RESET_PASSWORD_PAGE_COPY = {
  seo: {
    title: "Reset Password — ROAL",
    description: "Reset the password for your ROAL restaurant workspace.",
  },
  request: {
    title: "Reset your password",
    lead: "Enter your account email and we'll send you a link to choose a new one.",
    submitLabel: "Send reset link",
    loadingLabel: "Sending…",
    sentTitle: "Check your inbox",
    sentLead: "If an account exists for",
    sentTail: "a reset link is on its way.",
    sentHint: "Open the link, choose a new password, then sign in here. Not there? Check spam.",
    demoNote: "Demo mode — Firebase isn't connected yet, so no email was sent.",
    resend: "Resend link",
    resendWait: "Resend in",
    tryAgain: "Use a different email",
  },
  footer: {
    remembered: "Remembered it?",
    backToSignIn: "Back to sign in",
  },
} as const;
