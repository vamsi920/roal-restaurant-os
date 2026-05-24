# Public performance QA (launch queue #95)

## Homepage video

| Policy | Implementation |
|--------|----------------|
| Preload | `metadata` only (`HOME_HERO_VIDEO.preload`) |
| Skip | `prefers-reduced-motion`, `save-data`, CSS `@media (prefers-reduced-motion: reduce)` |
| Priority | `preload="metadata"` only (no `preload="auto"`) |
| Asset | `/public/landing/hero-bg.mp4` — must stay ≤ `HOME_HERO_VIDEO.maxBytes` (1.5 MiB; ~700 KiB today) |
| Mount | Client component; no `<video>` until motion/save-data check passes |

Marketing/auth routes use gradient wash only (`PublicBackgroundWash`) — no mp4.

## Public bundle (production build)

| Route | Page JS | First Load JS |
|-------|---------|---------------|
| `/` | ~5.2 kB | ~104 kB |
| `/pricing`, `/about`, `/security` | ~0.5 kB | ~99.5 kB |
| `/demo` | ~5.4 kB | ~144 kB (includes demo transcript motion) |

Homepage does **not** import `chapters/*`, `preview/*`, or `framer-motion`.

## Scroll / reflow

- Section reveals: CSS `animation-timeline: view()` — no JS scroll listeners.
- `HomeHowFlow`: `IntersectionObserver` + **one** `requestAnimationFrame` batch per callback (no `scroll` listeners).
- Mobile nav lock: `use-public-nav-menu` sets `position: fixed` on `html` while open only.

## Tests

```bash
npm test -- tests/unit/public-performance-qa.test.ts
npm run build   # optional: confirm First Load JS for `/`
```

## Adding assets

Do not add multi‑MiB files under `public/`. Prefer SVG/CSS placeholders (demo video slot). Re-run performance tests after any new `public/` media.
