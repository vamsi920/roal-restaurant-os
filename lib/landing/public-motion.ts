/** Public marketing motion tokens (mirrors `--public-motion-*` in public-theme.css). */

export const PUBLIC_MOTION = {
  revealOffsetPx: 10,
  revealDurationMs: 480,
  staggerStepMs: 60,
  glassHoverLiftPx: 2,
  buttonHoverLiftPx: 1,
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  viewEntry: "5%",
  viewCover: "22%",
  cssVars: {
    revealOffset: "--public-motion-reveal-offset",
    revealDuration: "--public-motion-reveal-duration",
    hoverLift: "--public-motion-hover-lift",
    glassLift: "--public-motion-glass-lift",
  },
} as const;
