/** Platform staff — Admin / Ops console and internal nav (not org-scoped admin role). */

export const DEFAULT_PLATFORM_ADMIN_EMAIL = "vammu920@gmail.com";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Configurable via `PLATFORM_ADMIN_EMAIL` (server) or `NEXT_PUBLIC_PLATFORM_ADMIN_EMAIL` (client). */
export function getPlatformAdminEmail(): string {
  const fromEnv =
    process.env.PLATFORM_ADMIN_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAIL?.trim();
  return normalizeEmail(fromEnv || DEFAULT_PLATFORM_ADMIN_EMAIL);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return normalizeEmail(email) === getPlatformAdminEmail();
}
