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
    title: "Your restaurant workspace",
    description:
      "Confirm your email, add your menu, and run a test call—most teams try one order before forwarding rush-hour traffic.",
  },
  steps: [
    {
      title: "Create account",
      body: "Work email and password. We send a confirm link—you sign in after you verify.",
    },
    {
      title: "Add your menu",
      body: "Scan or import your menu so phone orders match what you actually sell.",
    },
    {
      title: "Run a test order",
      body: "Place a test call and watch the ticket hit your kitchen screen.",
    },
  ],
  form: {
    title: "Create your account",
    lead: "Work email. After you confirm, you open your restaurant workspace.",
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
