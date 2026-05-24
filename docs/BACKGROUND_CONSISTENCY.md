# Background consistency (prompt 84)

## Policy

| Surface | Background |
|---------|------------|
| **`/` homepage** | Optional `/landing/hero-bg.mp4` under shared wash + scrim |
| **Marketing** (`PublicPageShell`) | Fixed `var(--public-bg-wash)` only — no mp4 |
| **Auth** (`public-theme-canvas`) | Same wash via `::before` |
| **`/demo` video block** | Static glass frame + SVG motif — not full-page video |

## Shared tokens (`app/public-theme.css`)

- `--public-bg-wash` — full-page lavender / pink / amber radials
- `--public-bg-wash-hero` — softer variant for page hero bands
- `--public-bg-scrim` — linear scrim (gradient-only homepage fallback)
- `--public-bg-wash-video` / `--public-bg-scrim-video` — lighter overlays when `hero-bg.mp4` plays

Source of truth for copy: `lib/landing/public-background.ts` (`HOME_HERO_VIDEO`).

## Homepage video gating

`LandingVideoBackground` (client) skips the `<video>` when:

- `prefers-reduced-motion: reduce`, or
- `navigator.connection.saveData`

Gradient blobs + scrim still render.

## Do not

- Add full-bleed background video to `/pricing`, `/about`, `/blog`, etc.
- Duplicate gradient stops in page CSS — use the CSS variables above.
