# Visual consistency audit (prompt 81)

Last review: all public routes under `MarketingShell` + homepage `LandingHomeShell` + auth `public-theme`.

## Target palette

- **Canvas:** `--public-bg` + lavender / pink / amber radial wash (not cream/yellow poster fields)
- **Surfaces:** glass (`--public-surface-glass`, blur, soft shadow)
- **Type:** ink + muted (Fraunces display, DM Sans body)
- **CTAs:** black pill (`public-btn-primary` / `btn-primary` override)

## Route status

| Route | Shell | Status |
|-------|--------|--------|
| `/` | `landing-home` | OK — glass/lavender (`landing-home.css`) |
| `/pricing` | `MarketingShell` | OK — hero wash + glass cards |
| `/about` | `MarketingShell` | OK — `MarketingPageHero` wash |
| `/demo` | `MarketingShell` | OK — `public-demo-hero` wash |
| `/contact` | `MarketingShell` | OK — `public-contact-hero` wash |
| `/security` | `MarketingShell` | OK — `public-security-hero` wash |
| `/privacy`, `/terms` | `MarketingShell` | OK — `public-legal-hero` wash |
| `/blog` | `MarketingShell` + `blog-theme.css` | OK — chips/cards glass; yellow washes suppressed |
| `/blog/[slug]` | same | OK — article glass band |
| `/login`, `/signup` | `public-theme` only | OK — no `landing.css` |
| `not-found` | `MarketingShell` | OK — inherits shell canvas |

## CSS layers

1. **`app/public-theme.css`** — canonical tokens + marketing overrides (hero bands, poster→glass remap)
2. **`app/blog-theme.css`** — blog-specific glass (imported on blog routes)
3. **`app/landing-home.css`** — homepage only
4. **`app/landing.css`** — legacy poster rules; **overridden** under `.landing-story.public-theme`

## Remaining legacy (intentional)

- `landing.css` poster tokens kept for orphan chapter components not on launch routes
- Dashboard / KDS previews may use `amber-900` status chips (operational UI, not marketing)

## Automated guard

`tests/unit/visual-consistency.test.ts` — asserts marketing shell does not ship cream/yellow beat-card modifiers in TSX.
