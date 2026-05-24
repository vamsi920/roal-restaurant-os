# Desktop page QA (prompt 89)

Routes: `/`, `/pricing`, `/blog`, `/blog/[slug]`, `/about`, `/demo`, `/login`, `/signup`.

## CSS

- `app/public-desktop-pages.css` — `@media (min-width: 900px)`
- Tokens in `public-theme.css`: `--public-readable-max` (42rem), `--public-readable-wide` (48rem), `--public-display-max` (52rem)

## Fixes

| Issue | Change |
|-------|--------|
| Too-wide copy | Leads, headers, AEO blocks, caveats capped at readable max |
| Hero titles | Display capped ~52rem (marketing hero ~48rem) |
| Empty sections | Demo/contact drop extra `padding-block` on section (wrap only) |
| AEO-only bands | Tighter wrap padding when `launch-aeo-answer` is sole child |
| Home rhythm | Slightly reduced `--home-section-y` on large screens |
| Full-bleed UI | Grids, pricing visual, compare cards stay full content width |

## Test

`tests/unit/desktop-page-layout.test.ts`
