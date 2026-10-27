/** The signed-in user, independent of the auth provider. */
export type SessionUser = {
  id: string;
  email: string | null;
  /** Kept for compatibility with older call sites (`user_metadata.full_name`). */
  user_metadata: { full_name?: string; avatar_url?: string };
  provider: "firebase" | "demo";
};

export const SESSION_COOKIE = "__session";
export const DEMO_SESSION_COOKIE = "roal_demo_session";
export const SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60;

export const DEMO_USER: SessionUser = {
  id: "demo-owner",
  email: "owner@demo.getroal.com",
  user_metadata: { full_name: "Maria Rossi" },
  provider: "demo",
};
