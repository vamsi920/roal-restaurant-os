/** Sign-in copy for `/login` (shared with the AuthForm sign_in view). */

export const LOGIN_PAGE_COPY = {
  seo: {
    title: "Sign In — ROAL Restaurant Workspace",
    description:
      "Sign in to your ROAL restaurant workspace: live menu, phone orders, and kitchen tickets in one place.",
  },
  form: {
    title: "Welcome back",
    lead: "Sign in to your restaurant's phone host and kitchen tickets.",
    submitLabel: "Sign in",
    loadingLabel: "Signing in…",
    passwordPlaceholder: "Your password",
    forgotPasswordLink: "Forgot password?",
    resendConfirm: "Resend confirmation email",
    resendSent: "New confirmation link sent. Check your inbox.",
  },
  trialBanner: {
    lead: "Your phone host for",
    tail: "is saved.",
    action: "Sign in to keep it.",
  },
  footer: {
    newHere: "New to ROAL?",
    createAccount: "Create an account",
  },
} as const;
