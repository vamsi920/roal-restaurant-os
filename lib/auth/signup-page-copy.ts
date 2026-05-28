/** Onboarding entry copy for `/signup` (shared with AuthForm sign_up UI). */

export const SIGNUP_ONBOARDING_NEXT = "/dashboard/onboarding" as const;

export const SIGNUP_PAGE_COPY = {
  seo: {
    title: "Sign Up — ROAL Restaurant Workspace",
    description:
      "Create a ROAL account and open your restaurant workspace—menu setup, test phone order, ready for rush.",
  },
  entry: {
    eyebrow: "Get started",
    title: "Open your workspace",
    description: "Confirm email, scan your menu, test a pickup call—then forward rush-hour rings.",
  },
  steps: [
    { title: "Create account", tag: "Confirm your email" },
    { title: "Add your menu", tag: "Scan or import" },
    { title: "Test on the pass", tag: "About 20 minutes" },
  ],
  form: {
    eyebrow: "Create account",
    title: "Start free",
    lead: "Work email—we send a confirm link.",
    submitLabel: "Create account",
    loadingLabel: "One moment…",
    passwordPlaceholder: "8+ characters",
    passwordHint: "At least 8 characters.",
    trustLine: "Encrypted sign-up. We email a confirm link—no charge until you choose a plan.",
  },
  confirm: {
    title: "Check your email",
    lead: "Confirm link sent to",
    afterConfirm: "Open the link, then sign in to your workspace.",
    backToSignIn: "Back to sign in",
    statusHint: "Check spam if it does not arrive in a few minutes. Links expire after a short time.",
  },
  footer: {
    hasAccount: "Have an account?",
    signIn: "Sign in",
  },
  asideNote: {
    default: "Plan about 20 minutes for menu scan and a test call.",
    onboardingPath: "After sign-in you start in setup—menu, phone line, then test call.",
  },
} as const;
