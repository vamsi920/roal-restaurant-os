/** Sign-in copy for `/login` (shared with AuthForm sign_in UI). */

export const LOGIN_PAGE_COPY = {
  seo: {
    title: "Sign In — ROAL Restaurant Workspace",
    description:
      "Sign in to your ROAL restaurant workspace: live menu, phone orders, and kitchen tickets in one place.",
  },
  entry: {
    eyebrow: "Workspace",
    title: "Pick up where you left off",
    description:
      "Sign in to manage your live menu, phone line, and kitchen tickets from one place.",
  },
  highlights: [
    {
      title: "Live menu on the line",
      body: "Pickup calls read the same menu your kitchen runs—86s and modifiers included.",
    },
    {
      title: "Tickets on the pass",
      body: "Phone orders land on your kitchen screen with guest name and phone confirmed.",
    },
    {
      title: "Pay per pickup",
      body: "You are not billed for hang-ups or test calls—only orders that hit the pass.",
    },
  ],
  asideNote: "Use the work email tied to your restaurant workspace.",
  form: {
    title: "Sign in",
    lead: "Work email and password for your restaurant workspace.",
    submitLabel: "Sign in",
    loadingLabel: "One moment…",
    passwordPlaceholder: "Your password",
    trustLine: "Encrypted sign-in. We never share your password.",
  },
  footer: {
    newHere: "New to ROAL?",
    createAccount: "Create an account",
  },
} as const;
