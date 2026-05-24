# Button consistency (public marketing)

## Canon

| Role | Class | Label (default) | Href |
|------|--------|-----------------|------|
| Primary | `public-btn-primary` | Hear a demo call | `/demo` |
| Secondary | `public-btn-ghost` | Book a demo | `/contact` |

Source of truth: `lib/landing/public-cta.ts` (`PUBLIC_CTA`, `PUBLIC_CTA_PAIR`).

## Components

- `PublicCtaButton` — single link/button with pill + optional arrow
- `PublicCtaActions` — primary + secondary row (props: `tone` for legacy dark ink bands)
- `LandingHomeCta`, `PricingCta`, `AboutCta`, `LandingCta` — thin wrappers over `PublicCtaActions`

Nav header CTA uses `PUBLIC_CTA.bookDemo` via `lib/landing/public-nav.ts`.

## Variants

- **Home** (`/`): same labels as `PUBLIC_CTA_PAIR`; hero may use `seeHowItWorks` as secondary on long-scroll landing only (`LANDING_HERO_CTA`).
- **Demo close**: primary Sign up, secondary Book a demo (mailto).
- **Blog article**: primary stays article-specific; secondary resolves to hear demo / see pricing / book demo.
- **Ink close bands** (pricing, about): light `public-theme` band — standard black + glass; `tone="ink"` only affects legacy dark `.landing-cta-band` via `public-btn-ghost--on-ink`.

## Tests

`tests/unit/public-cta.test.ts` — pair canon, banned pilot labels, no `btn-primary`/`btn-ghost` in marketing TSX.
