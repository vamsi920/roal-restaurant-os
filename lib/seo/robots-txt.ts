/** Paths disallowed in `app/robots.ts` (prefix match per Google robots rules). */
export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/auth/",
  "/dashboard",
] as const;
