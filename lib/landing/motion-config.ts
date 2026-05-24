/** Shared landing motion constants (safe for server imports). */

export const LANDING_MOTION = {
  offset: 20,
  stagger: 0.08,
  viewportMargin: "-10% 0px -8% 0px",
  inViewAmount: 0.2,
  revealDuration: 0.55,
  counterDuration: 1.15,
  marqueeDuration: 28,
  stickyTop: "6rem",
} as const;

/** Simple homepage poster — shorter reveals, no scroll choreography. */
export const LANDING_POSTER_MOTION = {
  offset: 12,
  stagger: 0.05,
  viewportMargin: "-8% 0px -6% 0px",
  inViewAmount: 0.12,
  revealDuration: 0.42,
} as const;

export const LANDING_EASE_OUT = [0.22, 1, 0.36, 1] as const;
