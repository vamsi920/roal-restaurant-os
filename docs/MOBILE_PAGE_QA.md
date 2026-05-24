# Mobile page QA (prompt 88)

Routes: `/`, `/pricing`, `/blog`, `/blog/[slug]`, `/about`, `/demo`, `/login`, `/signup`.

## CSS

- `app/public-mobile-pages.css` — marketing + auth (≤479px)
- `app/landing-home.css` — homepage-only tweaks in existing `@media (max-width: 479px)` block

## Fixes

| Area | Change |
|------|--------|
| Typography | `overflow-wrap: anywhere` on display headings + article titles |
| Gutters | Tighter `--public-gutter` / section spacing on narrow screens |
| CTAs | Full-width stacked buttons via `.landing-cta-hit` |
| Cards | `min-width: 0`, reduced padding on `glass-card` / pricing / about / demo steps |
| Pricing | Hero rate stacks; primary card + compare cols breathe |
| Success visual | Footer stacks; inner panels less cramped |
| Blog | Category chips wrap; prose padding reduced |
| Auth/signup | Main aligns top; signup grid gap reduced; panels less padded |

## Test

`tests/unit/mobile-page-layout.test.ts`

## Manual

375×812 (or similar): scroll each route; no horizontal scroll; no text atop text in cards/heroes.
