# Demo CTA QA (launch queue #93)

Canonical: `lib/landing/demo-page-copy.ts` → `DEMO_CTA`

## Bottom band (`DemoCtaBand`)

Button order (left to right):

1. **Book a demo call** — `mailto:hello@getroal.com` (subject: Book a ROAL demo call) — primary
2. **Sign up** — `/signup?next=/dashboard/restaurants` — ghost, immediately after

Footer shows pilot inbox linked to the same mailto href.

## Tests

```bash
npm test -- tests/unit/demo-cta-qa.test.ts
```
