# Pricing Page Plan (`/pricing`)

**Prompt 26** — audit + target design for a launch-ready SaaS pricing page.  
**Implementation:** prompts **27–33** in [`launch-ready-site-100-prompts.md`](./launch-ready-site-100-prompts.md).  
**Do not code in this step** unless a follow-up prompt says so.

---

## Goal

Make `/pricing` the canonical answer for **“How much does ROAL cost?”** with:

1. **Headline message:** Only pay for successful orders.  
2. **Anchor rate:** **$0.90 per successful order** (pilot/production framing honest).  
3. **Owner trust:** what counts, what does not, no per-minute surprise bills.  
4. **Conversion:** demo + book pricing walkthrough (`hello@getroal.com`).  
5. **Visual parity:** same glass/lavender/black theme as homepage (`public-theme`), not legacy poster yellow.

Align copy with homepage: `HOME_PRICING_PILL`, `HOME_PAY`, `HOME_FAQ` (pricing items), blog post `pay-only-successful-orders`.

---

## Current state audit (as shipped)

### Route & shell

| Item | Today |
|------|--------|
| Route | `app/pricing/page.tsx` |
| Shell | `MarketingShell` → `landing-story` + `public-theme` + `landing.css` |
| Nav/footer | Shared `LandingNav` / `MarketingFooter` via `public-nav` (glass chrome) |
| Hero | `MarketingPageHero` + generic `LandingCta` (`LANDING_HERO_CTA` → demo + `/#how`) |

### Metadata

```text
title: Pricing — ROAL for restaurants
description: Success-based pricing… pilot terms, plan tiers…
```

- No **$0.90** in title/description.  
- No canonical / Open Graph / Twitter (gap in [`PUBLIC_LAUNCH_PLAN.md`](./PUBLIC_LAUNCH_PLAN.md) §P1).  
- No `FAQPage` JSON-LD (homepage has pattern in `lib/landing/home-faq-json-ld.ts`).

### Page sections (top → bottom)

| # | Section | Source | Notes |
|---|---------|--------|--------|
| 1 | Hero | `PRICING_PAGE_COPY.hero` | Title: *Pay for successful pickups—not every ring*. No dollar rate. |
| 2 | Success model | `PRICING_PAGE_COPY.successModel` + `SuccessPricingVisual` + `SUCCESS_PRICING_DEMO` | Strong story funnel + invoice preview; labeled illustrative. |
| 3 | Compare lists | `notCharged` / `countsAsSuccess` | Good AEO substance; not tied to $0.90. |
| 4 | Production caveat | `copy.caveat` | Honest “rates vary after pilot” — keep. |
| 5 | Plan tiers | `PRICING_PLANS` (3 cards) | Pilot = custom; **Growth = “Coming soon” (highlighted)**; Enterprise = talk to us. |
| 6 | FAQ | `PRICING_FAQ` (5 Qs) | Overlaps homepage FAQ; missing refunds/cancel/setup $/volume. |
| 7 | Dark CTA | `copy.close` | Request pilot → `/contact`; See demo → `/demo`. No mailto walkthrough. |

### Reusable assets (keep)

| Asset | Path | Reuse in rebuild |
|-------|------|------------------|
| Success definition | `SUCCESS_PRICING_DEMO`, `PRICING_FAQ[0]` | Primary card + FAQ |
| Funnel visual | `components/landing/chapters/success-pricing-visual.tsx` | Below hero or inside “how billing works” |
| Compare lists | `PricingCompareList` in `pricing-page-content.tsx` | Under primary card |
| Pilot honesty | `pilotNote`, `honesty`, `copy.caveat` | Footnotes under rate |
| Blog AEO | `lib/blog/posts/pay-only-successful-orders.ts` | Mirror phrasing for FAQ + metadata |

### Gaps vs launch requirements

| Requirement | Status |
|-------------|--------|
| $0.90 per successful order above the fold | **Missing** |
| “Only pay for successful orders” as hero hook | Partial (homepage has it; pricing hero does not) |
| Primary single pricing card (not 3-tier first) | **Inverted** — tiers dominate; Growth “coming soon” is highlighted |
| Included features list | **Missing** (prompt 29) |
| Qualitative comparison (missed calls / staff / apps) | **Missing** (prompt 30); `staffCompare` exists in demo data but unused on page |
| FAQ: setup cost, volume, refunds, cancellations | **Partial** |
| CTAs: demo order + mailto pricing walkthrough | **Partial** (contact page, not mailto) |
| SEO answer block for “How much does restaurant AI phone ordering cost?” | **Weak** |
| Theme fully matches homepage glass | **Mixed** — `public-theme` on shell but hero/sections still use poster `LandingSection` / `glass-card` / `btn-primary` from `landing.css` |

---

## Target information architecture

Single scroll page, **rate-first** (BuzzOrder/Talk2Order pattern: one clear price, then tiers as “later”).

```text
[Hero]           Only pay when ROAL sends an order to your kitchen · $0.90/success
[Primary card]   $0.90 / successful order + pilot note + CTAs
[How it bills]   SuccessPricingVisual (illustrative) + not charged / counts as success
[Included]       Bullet grid — what’s in the platform at this price model
[Compare]        ROAL vs missed calls vs phone staff vs delivery apps (illustrative)
[Tiers]          Pilot (active) · Growth (waitlist) · Enterprise (contact) — demote visual weight
[FAQ]            6–8 items + FAQPage JSON-LD
[Close CTA]      Demo + mailto pricing walkthrough
```

**Anchor IDs (for nav deep links later):** `#rate`, `#included`, `#compare`, `#plans`, `#faq`.

---

## Section specs (prompts 27–33)

### 27 — Hero

| Field | Target copy (draft) |
|-------|---------------------|
| Eyebrow | Pricing |
| Title | **Only pay when ROAL sends an order to your kitchen.** |
| Lead | **$0.90 per successful pickup order** on your KDS—no per-minute phone fees, no charge for hang-ups or wrong numbers. |
| CTAs | Primary: Hear a demo call → `/demo`. Secondary: Book a pricing walkthrough → `mailto:hello@getroal.com?subject=ROAL%20pricing%20walkthrough`. |

Replace generic `LandingCta` in `app/pricing/page.tsx` with pricing-specific CTAs (same labels as homepage where possible).

### 28 — Primary pricing card

One **hero card** (glass, black CTA), not the three-column grid first.

| Element | Content |
|---------|---------|
| Price | **$0.90** / successful order |
| Sub | Per completed pickup on your pass |
| Bullets | Guest name + phone on call · ticket finalizes on KDS · not billed: rings, tests, hang-ups, info calls |
| Pilot note | “Pilot onboarding may include a platform bundle; per-order rate confirmed in writing before live traffic.” |
| CTAs | Start with a demo order → `/demo` · Book pricing walkthrough → mailto |

**Design:** Match `home-pay__price` emphasis + `home-glass-panel` from homepage; implement as `.public-pricing-hero-card` in `public-theme.css` or pricing-scoped module.

### 29 — Included

Short **“Everything on the line”** grid (6–8 items, no fake checkmarks from competitors):

- AI phone ordering on your live menu  
- Modifier and 86-aware quotes  
- Live kitchen ticket (KDS) + realtime  
- Menu scan/import + editor  
- Demo call + test ticket before go-live  
- Basic reporting / pilot weekly review  
- Human handoff paths (catering, allergy, manager)  
- Security: tenant + RLS (link `/security`)

Pull from existing product sections; avoid duplicating full `/security` prose.

### 30 — Comparison

Qualitative **2×2 or 4-row** table/cards — **illustrative / model comparison**, not guaranteed savings.

| Column | Angle |
|--------|--------|
| Missed calls | Lost pickup revenue; no billable event |
| Phone-only staff | Fixed labor; coverage gaps at rush |
| Delivery apps | Commission on every order; not your phone channel |
| ROAL | Pay when ticket hits KDS; aligned with pickup revenue |

Reuse `SUCCESS_PRICING_DEMO.visual.staffCompare` shape; add missed-calls + apps rows. Label: *“Model comparison—not a guarantee for your store.”*

### 31 — FAQ

Expand to **6–8** questions; sync with homepage `HOME_FAQ` where overlapping.

| Topic | Question (draft) |
|-------|------------------|
| Definition | What counts as a successful order? |
| Rate | Is $0.90 the final production price? |
| Calls | Do I pay for every ring? |
| Setup | Is there a setup fee? |
| Volume | What if we do hundreds of pickups a week? |
| Refunds / voids | What if an order is canceled after it hits the KDS? |
| Pilot | Month-to-month pilot? |
| Stack | KDS without voice? |

Answers: honest, short, no legal overreach on refunds (describe pilot policy: “adjusted in pilot terms” if not finalized).

### 32 — Closing CTA

| CTA | Target |
|-----|--------|
| Start with a demo order | `/demo` |
| Book pricing walkthrough | `mailto:hello@getroal.com` (subject: pricing walkthrough) |

Optional tertiary: `/signup` for self-serve setup.

### 33 — SEO / AEO

| Item | Action |
|------|--------|
| `metadata.title` | Include success-based + $0.90 (≤60 chars) |
| `metadata.description` | Answer-style: cost model + successful order definition |
| `canonical` | `absoluteUrl("/pricing")` via `getMetadataBase()` |
| Open Graph / Twitter | Same as blog pattern |
| On-page H2 | “How much does restaurant AI phone ordering cost?” with 2–3 sentence direct answer |
| JSON-LD | `FAQPage` from pricing FAQ array (mirror `buildHomeFaqPageJsonLd`) |
| Internal links | Homepage pill, `HomePay`, blog `pay-only-successful-orders` |

---

## Plan tiers (demote, don’t delete)

Keep `PRICING_PLANS` for buyers who need segmentation, but **below** primary card + included + compare.

| Tier | Price display | Change |
|------|---------------|--------|
| Pilot | **From $0.90 / successful order** + custom onboarding | Active; primary CTA |
| Growth | Waitlist / coming soon | Remove `highlight: true` until live |
| Enterprise | Talk to us | Unchanged |

Growth card should not be the visual “featured” plan while price is pilot-led.

---

## Theme & components

| Approach | Recommendation |
|----------|----------------|
| Shell | Keep `MarketingShell` + `public-theme` (already applied) |
| Sections | Prefer `public-wrap` / glass utilities from `public-theme.css` over heavy `LandingSection` poster spacing where easy |
| Buttons | Black pill = `public-btn-primary` or shared with `home-btn-primary` tokens |
| New UI | `components/landing/pricing/pricing-hero-card.tsx`, `pricing-included.tsx`, `pricing-compare.tsx` |
| Copy | Extend `lib/landing/pricing-page-copy.ts` — single source for page + JSON-LD |

**Guardrail:** Do not change dashboard billing logic or Stripe; page is **marketing truth** aligned with pilot quotes, with caveat for production variance.

---

## Copy canon (use everywhere)

| Phrase | Use |
|--------|-----|
| Only pay for successful orders | H1, OG, pill |
| $0.90 per successful order | Hero, card, metadata (say “per successful pickup on your KDS” once for clarity) |
| Successful order | Guest confirms name + phone on the call; ticket finalizes on your kitchen screen |
| Not billed | Wrong numbers, hang-ups, tests, abandoned carts, per-minute talk time |
| Pilot | Terms in writing before live guest traffic |

---

## Implementation map

| Step | Prompt | Files (expected) |
|------|--------|-------------------|
| Hero + metadata | 27, 33 | `app/pricing/page.tsx`, `pricing-page-copy.ts` |
| Primary card | 28 | `pricing-hero-card.tsx`, `public-theme.css` |
| Included | 29 | `pricing-included.tsx`, copy |
| Compare | 30 | `pricing-compare.tsx`, extend `success-pricing-demo.ts` |
| FAQ + schema | 31, 33 | `pricing-page-copy.ts`, `pricing-faq-json-ld.tsx` |
| Close CTA | 32 | `pricing-page-content.tsx` |
| Tier demotion | 28–29 | `PRICING_PLANS`, `pricing-page-content.tsx` |

**Suggested order:** 27 → 28 → 29 → 30 → 31 → 32 → 33 (or 33 metadata alongside 27).

---

## QA checklist (post-implementation)

- [ ] $0.90 visible without scrolling on mobile (hero or card)  
- [ ] Successful-order definition matches homepage FAQ + blog  
- [ ] No “per minute” implication anywhere  
- [ ] Growth tier not featured over Pilot  
- [ ] Mailto walkthrough opens with subject line  
- [ ] No horizontal overflow at 320px / 390px  
- [ ] FAQ JSON-LD validates (Google Rich Results test)  
- [ ] Canonical URL uses production origin when `NEXT_PUBLIC_APP_URL` set  

---

## References

- [`docs/PUBLIC_LAUNCH_PLAN.md`](./PUBLIC_LAUNCH_PLAN.md) — P0 pricing message gap  
- [`docs/launch-ready-site-100-prompts.md`](./launch-ready-site-100-prompts.md) — prompts 27–33  
- [`lib/landing/home-theme.ts`](../lib/landing/home-theme.ts) — `HOME_PRICING_PILL`  
- [`lib/landing/contact-page-copy.ts`](../lib/landing/contact-page-copy.ts) — `CONTACT_PILOT_EMAIL`
