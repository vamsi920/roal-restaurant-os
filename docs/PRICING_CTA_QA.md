# Pricing CTA QA (launch queue #92)

Canonical module: `lib/landing/pricing-page-copy.ts`

## `PRICING_CTA`

| Role | Target |
|------|--------|
| Primary | `/demo` — Hear a demo call |
| Secondary | `mailto:hello@getroal.com?subject=ROAL pricing walkthrough` |
| Signup (text link) | `/signup?next=/dashboard/restaurants` |

Rendered by `PricingCta` on hero, FAQ footer, close band, and `PricingPrimaryCard`.

## Plan cards

Pilot and Enterprise buttons use `PRICING_WALKTHROUGH_CTA` (same mailto). Growth has no CTA (“Coming soon”).

## Tests

```bash
npm test -- tests/unit/pricing-cta-qa.test.ts
```
