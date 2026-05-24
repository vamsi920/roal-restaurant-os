# Product language safety audit (prompt 80)

Last review: public marketing (`/`, `/pricing`, `/about`, `/demo`, `/security`, blog index + articles, shared metadata).

## Rules

1. **No provable absolutes** — Avoid “perfect accuracy,” “guaranteed savings,” “every ring answered,” “first ring,” and “never miss a call” unless clearly negated (e.g. “not every ring”).
2. **Forward / pilot framing** — Describe pickup lines you **forward** to ROAL, pilot metrics agreed in writing, and outcomes that **depend on volume and setup**.
3. **Pricing honesty** — Success-based fees on finalized KDS pickups; compare tables stay **illustrative** (see `docs/METRICS_SAFETY_AUDIT.md`).
4. **Blog AEO** — `answerShort` blocks use the same credible voice as landing; no universal answer-rate promises.

## Replacements (examples)

| Avoid | Prefer |
|-------|--------|
| Answers every ring | Can cover forwarded calls |
| On the first ring | When the line is forwarded to ROAL |
| Never miss a restaurant call | Answer more pickup calls during rush |
| Perfect accuracy | Menu, voice, and tickets aligned on the pass |
| Guaranteed savings | Illustrative comparison; pilot metrics in writing |

## Shared module

`lib/landing/product-language-safety.ts` — `BANNED_PRODUCT_CLAIMS`, `CREDIBLE_FRAMING`, scan globs for reviews.

## Automated check

`tests/unit/product-language-safety.test.ts` scans `lib/landing`, `lib/blog/posts`, and marketing `components/landing` + `components/blog` for banned phrases (skipping negated uses).

## Audited surfaces

| Surface | Status |
|---------|--------|
| Homepage hero + metadata | OK — rush-volume framing + qualifier |
| Root `app/layout.tsx` title | OK — no “never miss” |
| Landing demos (menu, setup, competitor) | OK — prior pass + credible framing |
| Blog posts (phone / rush / setup) | OK — forwarded-call language |
| Blog index excerpts | OK |
| Blog article CTA | OK |
| About values | OK — no “first ring” absolute |
| Footer / FAQ “not every ring” | OK — negated |

## Not in scope

- Internal docs under `docs/*-prompts.md` (historical briefs).
- Dashboard product UI (operational, not launch marketing).
- **$0.90/order** — published pilot anchor; FAQ notes volume terms.
