# Cross-link QA (launch queue #90)

Canonical sources for public marketing links:

| Surface | Module |
|---------|--------|
| Nav | `lib/landing/public-nav.ts` |
| Footer | `lib/landing/footer-copy.ts` → `PublicFooter` |
| CTAs + mailto | `lib/landing/public-cta.ts`, `lib/landing/contact-mailto.ts` |
| Homepage hashes | `lib/landing/public-links.ts` (`how`, `trust`, `proof`) |
| Blog slugs | `lib/blog/posts.ts` (validated at load via `validate-links.ts`) |

## Homepage anchors

| Hash | DOM id | Section |
|------|--------|---------|
| `#how` | `how` | How it works |
| `#trust` | `trust` | Trust strip (home solution) |
| `#proof` | `proof` | Pilot metrics strip |

## Routes checked

`/`, `/pricing`, `/blog`, `/about`, `/demo`, `/login`, `/signup`, `/contact`, `/security`, `/privacy`, `/terms`, plus `/blog/[slug]` for about/resources links.

## Tests

`npm test -- tests/unit/cross-link-qa.test.ts`

Also: `tests/unit/contact-cta-qa.test.ts` for contact form anchor + mailto.
