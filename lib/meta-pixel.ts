/**
 * Meta (Facebook/Instagram) Pixel helpers.
 *
 * The pixel only loads when NEXT_PUBLIC_META_PIXEL_ID is set, and never on
 * signed-in workspace pages (see `isPixelPath`). Calls are no-ops otherwise,
 * so components can track events without checking anything.
 */

export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

/** Private areas where the pixel must not run (restaurant data, admin). */
const PRIVATE_PREFIXES = ["/dashboard", "/admin", "/api"];

export function isPixelPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  return !PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

type Fbq = (...args: unknown[]) => void;

function fbq(): Fbq | null {
  if (typeof window === "undefined" || !META_PIXEL_ID) return null;
  const f = (window as unknown as { fbq?: Fbq }).fbq;
  return typeof f === "function" ? f : null;
}

export type MetaStandardEvent = "PageView" | "StartTrial" | "CompleteRegistration" | "Lead" | "Contact";

/** Track a standard Meta event. Never sends personal data. */
export function trackMeta(event: MetaStandardEvent, params?: Record<string, string | number>): void {
  const f = fbq();
  if (!f) return;
  try {
    // trackSingle: plain `track` drops repeat PageViews once Meta's own history
    // tracking is off (disablePushState), so client-side route changes were lost.
    if (params) f("trackSingle", META_PIXEL_ID, event, params);
    else f("trackSingle", META_PIXEL_ID, event);
  } catch {
    // Tracking must never break the page.
  }
}
