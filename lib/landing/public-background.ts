/**
 * Public background policy (prompt 84).
 * Homepage: optional hero video + shared wash palette.
 * All other routes: gradient wash only (no full-page video).
 */

export const HOME_HERO_VIDEO = {
  src: "/landing/hero-bg.mp4",
  /** Shown when video is skipped (reduced motion / save-data). */
  poster: undefined as string | undefined,
  /** QA budget — keep hero mp4 under this (currently ~700 KiB on disk). */
  maxBytes: 1_500_000,
  preload: "metadata" as const,
} as const;

/** Routes that may use full-bleed hero video (homepage only). */
export const FULL_BLEED_VIDEO_ROUTES = ["/"] as const;
