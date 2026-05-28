/** Sign-in copy for `/login` (shared with AuthForm sign_in UI). */

export const LOGIN_PAGE_COPY = {
  seo: {
    title: "Sign In — ROAL Restaurant Workspace",
    description:
      "Sign in to your ROAL restaurant workspace: live menu, phone orders, and kitchen tickets in one place.",
  },
  entry: {
    eyebrow: "Restaurant workspace",
    title: "Sign in to ROAL",
    description: "Live menu, pickup line, and kitchen tickets in one place.",
  },
  highlights: [
    { title: "Live menu on calls", tag: "Same menu as your pass" },
    { title: "Tickets on screen", tag: "Name + phone confirmed" },
    { title: "Pay per pickup", tag: "Not per ring" },
  ],
  asideNote: "Use the email tied to your workspace.",
  form: {
    eyebrow: "Sign in",
    title: "Welcome back",
    lead: "Work email and password.",
    submitLabel: "Sign in",
    loadingLabel: "One moment…",
    passwordPlaceholder: "Your password",
    trustLine: "Encrypted sign-in. We never share your password.",
    forgotPasswordLink: "Forgot password?",
    forgotTitle: "Reset your password",
    forgotLead: "We will email a link to set a new password.",
    forgotSubmitLabel: "Send reset link",
    forgotBackLabel: "Back to sign in",
    forgotSentTitle: "Check your email",
    forgotSentLead: "If an account exists for that address, we sent a reset link.",
    forgotSentHint: "Check spam if it does not arrive in a few minutes. Links expire after a short time.",
  },
  footer: {
    newHere: "New to ROAL?",
    createAccount: "Create an account",
  },
} as const;
