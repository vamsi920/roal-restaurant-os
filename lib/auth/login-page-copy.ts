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
    description:
      "Your phone line, live menu, and kitchen tickets—built for rush-hour pickup.",
  },
  highlights: [
    {
      title: "Answers in their language",
      tag: "Pickup calls on your restaurant line",
    },
    {
      title: "Tickets hit the kitchen",
      tag: "Confirmed name, phone, and items",
    },
    { title: "Pay per completed order", tag: "$0.90 when the ticket lands—not per ring" },
  ],
  asideNote: "Use the email tied to your workspace.",
  form: {
    eyebrow: "Sign in",
    title: "Welcome back",
    lead: "Work email and password for your restaurant workspace.",
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
