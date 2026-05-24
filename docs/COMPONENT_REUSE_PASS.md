# Component reuse pass (prompt 82)

Shared public UI lives in `components/landing/public/`.

## Components

| Component | Use |
|-----------|-----|
| `PublicPageShell` | Marketing routes (`MarketingShell` re-export) |
| `PublicPageHero` | About, pricing, blog index, demo, contact, security heroes |
| `PublicCtaBand` | Close CTAs: contact, demo, security (glass), about/pricing (ink), home CTA |
| `PublicCtaActions` / `PublicCtaButton` | Paired primary/ghost actions |
| `PublicFaq` | Home accordion, pricing divided list, security glass cards |
| `PublicMetricsStrip` | Homepage pilot metrics (`shell="home"`) |

## Page wiring

- `/` — `LandingHomeShell` + `PublicMetricsStrip`, `PublicFaq`, `PublicCtaBand` (home variant)
- `/pricing` — shell + hero + `PublicFaq` + `PublicCtaBand` (ink)
- `/security` — `PublicFaq` (cards) + `PublicCtaBand` (glass)
- `/contact`, `/demo` — `PublicCtaBand` (glass)
- `/about` — `PublicCtaBand` (ink)

## Still page-specific (thin wrappers OK)

- `LaunchAeoAnswer` + per-page `*AeoAnswer` wrappers
- `LandingSection` / `LandingHeader` for multi-block page bodies
- `PricingPrimaryCard`, `AboutCompanyStory`, demo conversation blocks

## Imports

Prefer:

```ts
import { PublicPageShell, PublicPageHero, PublicFaq } from "@/components/landing/public";
```

Legacy re-exports: `MarketingShell`, `MarketingPageHero`.
