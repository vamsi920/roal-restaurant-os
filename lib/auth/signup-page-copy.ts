/** Copy for `/signup` (shared with the AuthForm sign_up view). */

/** Default post-signup destination: onboarding auto-claims a pending try-a-call trial. */
export const SIGNUP_ONBOARDING_NEXT = "/dashboard/onboarding" as const;

export const SIGNUP_PAGE_COPY = {
  seo: {
    title: "Sign Up — ROAL Restaurant Workspace",
    description:
      "Create a ROAL account and open your restaurant workspace—menu setup, test phone order, ready for rush.",
  },
  form: {
    title: "Create your account",
    lead: "Set up your phone host in minutes. Pay only for completed orders.",
    submitLabel: "Create account",
    loadingLabel: "Creating account…",
    passwordPlaceholder: "8+ characters",
    passwordHint: "At least 8 characters.",
  },
  confirm: {
    title: "Check your inbox",
    lead: "We sent a confirmation link to",
    afterConfirm: "Open it on this device to finish setting up your workspace.",
    resend: "Resend email",
    resending: "Sending…",
    resent: "Sent again. It can take a minute to arrive.",
    resendWait: "Resend in",
    wrongEmail: "Wrong email?",
    goBack: "Go back",
    spamHint: "Not there? Check spam or promotions.",
  },
  trialBanner: {
    lead: "Your phone host for",
    tail: "is saved.",
    action: "Create an account to keep it.",
    fallbackName: "your restaurant",
  },
  footer: {
    hasAccount: "Already have an account?",
    signIn: "Sign in",
  },
} as const;
