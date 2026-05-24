/** Auth route paths and login redirect builder (middleware + QA). */

export const AUTH_ROUTES = {
  login: "/login",
  signup: "/signup",
  callback: "/auth/callback",
  signout: "/auth/signout",
} as const;

export const PROTECTED_DASHBOARD_PREFIX = "/dashboard";

/** Guest redirect used by `lib/supabase/middleware.ts`. */
export function buildGuestLoginRedirect(pathname: string, search = ""): string {
  const next = `${pathname}${search}`;
  const params = new URLSearchParams({ next });
  return `${AUTH_ROUTES.login}?${params.toString()}`;
}
