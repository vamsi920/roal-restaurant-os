/**
 * Credible product language — avoid absolute outcomes we cannot prove.
 * Use in marketing copy reviews; not enforced at runtime.
 */

/** Prefer these framings over banned patterns below. */
export const CREDIBLE_FRAMING = {
  calls: "pickup calls you forward to ROAL",
  menuSync: "your live menu on the next call after you edit it",
  accuracy: "menu, voice, and tickets aligned on the pass",
  pricing: "success-based fees tied to finalized pickups",
} as const;

/** Phrases to avoid in customer-facing product copy (blog, landing, metadata). */
export const BANNED_PRODUCT_CLAIMS = [
  "perfect accuracy",
  "guaranteed savings",
  "guaranteed dollar",
  "100% accurate",
  "zero mistakes",
  "flawless",
  "every call answered",
  "answer every call",
  "answers every ring",
  "on the first ring",
] as const;

/** Scan paths for launch copy audits (relative to repo root). */
export const PRODUCT_LANGUAGE_SCAN_GLOBS = [
  "lib/landing/**/*.ts",
  "lib/blog/posts/**/*.ts",
  "lib/blog/posts.ts",
  "lib/blog/index-copy.ts",
  "components/landing/**/*.{ts,tsx}",
  "components/blog/**/*.{ts,tsx}",
] as const;

/** Negation prefixes that make a banned substring acceptable in context. */
export const PRODUCT_LANGUAGE_NEGATION_PREFIXES = [
  "not ",
  "no ",
  "don't ",
  "do not ",
  "cannot ",
  "can't ",
  "isn't ",
  "aren't ",
  "won't ",
  "without ",
] as const;
