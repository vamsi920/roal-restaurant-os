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
    staleSession: "Your session ended. Sign in again to continue.",
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

/** Shared by sign-in and sign-up. */
export const AUTH_FORM_COPY = {
  google: "Continue with Google",
  googleLoading: "Opening Google…",
  divider: "or",
  remember: "Remember me on this device",
  rememberHint: "Off: you're signed out when you close the browser.",
  demo: {
    note: "Demo mode — Firebase isn't connected yet. You'll sign in as a demo restaurant owner.",
    submitLabel: "Continue as demo owner",
    loadingLabel: "Opening your workspace…",
  },
} as const;
