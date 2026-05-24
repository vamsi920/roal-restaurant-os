# Blog Theme Audit — Lavender / Black Glass Alignment

**Prompt 34** — audit only. **Implementation:** prompts **35** (index) and **36** (articles) in [`launch-ready-site-100-prompts.md`](./launch-ready-site-100-prompts.md).

**Target:** Match homepage + `/pricing` — `public-theme` tokens, glass panels, lavender/pink/amber washes, **black pill CTAs**, no yellow/cream poster stack.

**Do not** change blog post Markdown/TS content, JSON-LD, or category/filter logic in this theme pass.

---

## Executive summary

| Area | Today | Gap |
|------|--------|-----|
| Shell | `MarketingShell` → `.landing-story.public-theme` | Canvas wash is **correct** (`public-theme.css` fixed gradients) |
| Blog CSS | ~700 lines in `app/landing.css` under `.landing-story .blog-*` | Still **warm poster**: cream panels, **yellow** chips/gradients, hard offset shadows |
| Components | `landing-panel`, `landing-panel--cream`, `landing-panel--lime`, ticket corners | Not `glass-card` / `public-glass-panel` |
| Hero index | `from-accent/12` + yellow radial `::before` on index | Yellow wash, not lavender |
| Motifs | Comic line-art + ring pulse animations | On-brand for old poster; **busy** under glass aesthetic |
| CTAs | `btn-primary` (partially overridden on ink bands only) | Article/index CTAs still **poster** weight on lime/cream panels |

Blog is **functionally complete** (index, filter, articles, FAQ, schema). Theme is the main launch gap vs `/` and `/pricing`.

---

## Routes & file map

| Route | Entry | Layout / components |
|-------|--------|---------------------|
| `/blog` | `app/blog/page.tsx` | `MarketingShell` → `landing-poster-flow` → `BlogIndexHero` + `BlogIndexContent` |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | `BlogArticleLayout` → motifs + article stack |

| Concern | Primary files |
|---------|----------------|
| Styles (poster) | `app/landing.css` — blog block ~L1510–2192 |
| Shared tokens | `app/public-theme.css` (no blog-specific rules today) |
| Shell | `components/landing/marketing-shell.tsx` |
| Index UI | `blog-index-hero.tsx`, `blog-index-content.tsx`, `blog-featured-card.tsx`, `blog-post-card.tsx`, `blog-category-filter.tsx` |
| Article UI | `blog-article-layout.tsx`, `blog-article-header.tsx`, `blog-answer-short.tsx`, `blog-article-sections.tsx`, `blog-article-toc.tsx`, `blog-article-faq.tsx`, `blog-article-cta.tsx`, `blog-related-posts.tsx` |
| Decorations | `blog-motifs.tsx` (SVG uses `landing-beat-visual__*` classes from poster era) |
| Copy / SEO | `lib/blog/index-copy.ts`, `lib/blog/metadata.ts` — **no theme change needed** |

---

## Yellow / cream / poster inventory (remove or replace)

### CSS variables (legacy, still in `landing.css`)

| Token | RGB intent | Used by blog |
|-------|------------|------------|
| `--landing-cream` / `--public-cream` | Warm cream | `landing-panel--cream`, ticket bg, chip hover |
| `--landing-yellow` / `--public-yellow` | Bright yellow | Index/article `::before` radials, **active category chip**, comic fills |

### Decorative backgrounds

| Selector | Issue |
|----------|--------|
| `.blog-index--decorated::before` | Radial `rgb(var(--landing-yellow) / 0.12)` top-left |
| `.blog-article--decorated::before` | Dual radials: accent + **yellow** bottom-left |
| `.blog-index-hero` gradient | Tailwind `from-accent/12` (lime wash tied to old `--accent`) |

### Panels & cards (component classes)

| Class | Where | Replace with |
|-------|--------|--------------|
| `landing-panel` | Post cards, FAQ items, answer-short | `glass-card` or `public-glass-panel` |
| `landing-panel--cream` | `BlogAnswerShort` | Glass panel + subtle lavender tint, not cream fill |
| `landing-panel--lime` | `BlogFeaturedCard`, `BlogArticleCta` | Glass + optional `public-pricing-primary-card`-style wash |
| `blog-card--ticket-corners` + `BlogTicketCornerSvg` | Featured + post cards | **Remove** ticket corners OR replace with minimal lavender corner accent (no cream ticket SVG) |
| `landing-panel` hard shadow | Hover `5px 5px 0 rgb(landing-ink)` | `var(--public-shadow-card)` + slight translateY |

### Category chips

| Rule | Issue |
|------|--------|
| `.blog-category-filter__chip` | Poster border + **2px ink offset shadow** |
| `.is-active` | **`background: landing-yellow / 0.85`** — most visible yellow on index |

**Target chips:** Same pattern as homepage trust / FAQ — glass pill, active = ink fill or lavender tint, `public-radius-pill`, no offset shadow.

### Typography & links

| Item | Today | Target |
|------|--------|--------|
| `.landing-display` / `.landing-h2` on blog | Overridden in `public-theme` for marketing | Keep; ensure blog headers use same scale as `pricing-hero-rate` / `home-h2` |
| `.landing-link` | Underline ink link | `public` muted link or `home-faq__link` style |
| `.blog-card-cta` | Heavy 800 weight underline | Semibold + arrow, match `home-btn-ghost` text link |

### Motifs & motion

| Item | Recommendation |
|------|----------------|
| `BlogMotifLayer` | **Prompt 35:** reduce opacity 40% and swap yellow ring strokes → lavender OR hide on mobile (already partial) |
| `blog-ring-pulse`, `blog-scribble-drift` | Respect `prefers-reduced-motion` (exists); default **off** or static under glass |
| `landing-beat-visual__*` SVG fills | Recolor via CSS to `--public-accent-lavender` / `--public-ink` (no cream ticket rects) |

### CTAs

| Component | Today | Target (prompt 35–36) |
|-----------|--------|------------------------|
| `BlogArticleCta` | `btn-primary` on lime panel | `public-btn-primary`; secondary “Book demo” optional |
| Index | No hero CTA | Optional: Hear demo + Blog → pricing (low priority) |
| Inline article links | `landing-link` in stub | Standard public link |

---

## What already aligns (keep)

- `MarketingShell` imports `landing.css` + uses `public-theme` canvas (`::before` lavender/pink/amber in `public-theme.css`).
- `LandingNav` / `MarketingFooter` — shared `public-nav-*` glass chrome (steps 6–10).
- `MarketingPageHero` on index — uses `landing-display` / `landing-lead` with **public-theme typography overrides** (pricing hero pattern).
- Focus rings — `public-theme` violet outline on non-button elements (L2226+).
- Blog **content structure**, metadata (`lib/blog/metadata.ts`), JSON-LD — unchanged.

---

## Target design spec (match homepage)

Reference: `app/landing-home.css`, `app/public-theme.css`, `/pricing` primary card.

| Element | Spec |
|---------|------|
| Page canvas | `rgb(var(--public-bg))` + existing `MarketingShell` gradient (no extra yellow `::before` on blog sections) |
| Cards | `border: 1px solid rgb(var(--public-border-glass) / 0.55)`, `backdrop-filter: blur`, `box-shadow: var(--public-shadow-card)` |
| Featured card | Slightly stronger shadow + thin lavender ring (`ring` or border), not lime fill |
| Active filter chip | `rgb(var(--public-ink))` text on `rgb(var(--public-ink) / 0.06)` OR lavender wash — **not yellow** |
| Article reading column | Max-width ~42–48rem; body on **elevated glass strip** or flat `--public-bg-elev` panel; long-form `line-height: 1.65` |
| Answer-in-short | Glass callout with left border or lavender tint (AEO block) |
| FAQ items | Match homepage `home-faq__item` glass + optional `<details>` later (not required in 36) |
| Section headings | Display font, ink color, no comic bold 800 everywhere |

---

## Exact change plan — Prompt 35 (`/blog` index)

### 1. Stylesheet structure

**Add** `app/blog-theme.css`:

- Import `./public-theme.css` (or rely on `landing.css` import chain).
- Scope all rules: `.landing-story.public-theme .blog-*` only.
- **Do not** grow `landing.css` further.

**Import** in `app/blog/page.tsx` (or `marketing-shell.tsx` only when path is blog — prefer explicit in blog pages):

```ts
import "@/app/blog-theme.css";
```

### 2. Remove poster decorations (CSS)

| Action | Detail |
|--------|--------|
| Delete / override | `.blog-index--decorated::before` yellow radial → **none** or single `lavender` radial at 15% opacity |
| Override | `.blog-index-hero` — remove `from-accent/12`; use transparent or `from-public-accent-lavender/10` via custom class `blog-index-hero__wash` |
| Replace hover | Card hover: `translateY(-1px)` + `shadow-soft`, remove `5px 5px` ink offset |

### 3. Component class swaps (TSX)

| File | Before | After |
|------|--------|-------|
| `blog-featured-card.tsx` | `landing-panel landing-panel--lime` + ticket corners | `glass-card public-blog-card--featured` |
| `blog-post-card.tsx` | `landing-panel` + ticket corners | `glass-card public-blog-card` |
| `blog-index-hero.tsx` | `border-b border-line` + accent gradient div | `blog-index-hero` + optional soft wash div using public tokens |
| `blog-category-filter.tsx` | (classes in CSS only) | Add `public-blog-chip` BEM if needed |

### 4. Category filter CSS (in `blog-theme.css`)

- Default chip: glass background, `border-radius: var(--public-radius-pill)`, no box-shadow offset.
- Active: `background: rgb(var(--public-ink))`, `color: rgb(var(--public-bg-elev))` OR ink border + lavender bg.
- Hover: `rgb(var(--public-surface-glass) / 0.72)`.

### 5. Motifs (index)

- **Option A (recommended):** Keep `BlogMotifLayer` but add class `blog-motifs--glass` → opacity 0.35, filter saturate(0.9), hide panel/corners <1024px.
- **Option B:** Remove motifs from index entirely for calmer journal (fastest).

Document choice in PR; default **Option A** for prompt 35.

### 6. Layout wrapper

| File | Change |
|------|--------|
| `app/blog/page.tsx` | Replace `landing-poster-flow` with `blog-shell min-w-0` (no poster gap vars) |

### 7. Index QA (35)

- [ ] No visible yellow block on category “All” or active chip  
- [ ] Featured card reads as glass, not lime/cream  
- [ ] Nav/footer match `/pricing`  
- [ ] 320px / 390px: grid 1 col, chips wrap, no horizontal scroll  

---

## Exact change plan — Prompt 36 (`/blog/[slug]` articles)

### 1. Reading surface

| Element | Change |
|---------|--------|
| `.blog-article--decorated::before` | Remove yellow radial; optional **fixed** subtle lavender blob behind header only (not full bleed under paragraphs) |
| `.blog-article__body` | Add `public-blog-prose` wrapper: `background: rgb(var(--public-bg-elev) / 0.88)`, padding, radius, max-width 48rem |
| TOC sidebar | Glass sticky card on `lg+`; plain list on mobile |

### 2. Component class swaps

| File | Before | After |
|------|--------|-------|
| `blog-answer-short.tsx` | `landing-panel--cream` + ticket corners | `public-glass-panel public-blog-answer` |
| `blog-article-faq.tsx` | each item `landing-panel` | `glass-card` or `home-faq__item` pattern |
| `blog-article-cta.tsx` | `landing-panel--lime` | `public-glass-panel` + `public-btn-primary` + optional `public-btn-ghost` |
| `blog-article-layout.tsx` | `landing-poster-flow` | `blog-shell` |
| `blog-related-posts.tsx` | cards use `BlogPostCard` | Inherits 35 card styles |

### 3. Prose & headings (`blog-theme.css`)

- `.public-blog-prose p` → `color: rgb(var(--public-muted))`, `font-size: 1.0625rem`, `max-width: 65ch`.
- `.blog-article-section__title` → display font, `home-h2` scale, no 800 weight.
- `.blog-article-header__title` → align with `landing-display` public overrides.

### 4. Motifs (article)

- Keep single ring motif top-right at low opacity OR remove entirely so **prose area has no animation** behind text.
- **Rule:** No animated SVG behind `.public-blog-prose` (readability).

### 5. Article CTA copy hook (optional, not required)

- Align default `BLOG_CTA_DEMO` label with homepage: “Hear a demo call” (content change — optional in 36).

### 6. Article QA (36)

- [ ] Cream “Answer in short” box gone  
- [ ] Lime CTA band → glass + black button  
- [ ] FAQ readable on white/glass, not cream stack  
- [ ] Long post: TOC + prose no horizontal overflow  
- [ ] Related posts match index cards  

---

## CSS migration checklist (single PR or 35 then 36)

| Step | Task |
|------|------|
| 1 | Create `app/blog-theme.css` with token-only references (`--public-*`) |
| 2 | Copy blog rules from `landing.css` → refactor, delete yellow/cream rules from `landing.css` once parity verified |
| 3 | Add `.public-blog-*` utilities: card, chip, prose, hero wash |
| 4 | Update TSX class names (tables above) |
| 5 | Recolor `blog-motifs` SVG via CSS variables (or simplify SVG markup in `blog-motifs.tsx`) |
| 6 | Run visual pass: `/blog`, one long article, one short article |
| 7 | Update `docs/BLOG_CONTENT_PLAN.md` one line: theme = glass not poster (optional) |

---

## Do / don’t

| Do | Don’t |
|----|--------|
| Reuse `glass-card`, `public-btn-primary`, `--public-accent-lavender` | Reintroduce `--landing-yellow` on blog surfaces |
| Keep editorial typography (display headings) | Add hero video or heavy scroll choreography to blog |
| Preserve AEO blocks (answer-short, FAQ schema) | Change article bodies or slugs in theme PR |
| Scope blog CSS to `.landing-story.public-theme` | Touch `globals.css` or dashboard |
| Mobile-first chip + grid | New category system or CMS |

---

## Dependency order

```text
34 Audit (this doc)
  → 35 Index: blog-theme.css + index components + filter/card CSS
  → 36 Article: prose shell + article components + motif trim
  → 37+ Content audits (separate)
```

---

## Reference links

- Homepage tokens: [`app/public-theme.css`](../app/public-theme.css), [`app/landing-home.css`](../app/landing-home.css)
- Pricing card pattern: [`components/landing/pricing/pricing-primary-card.tsx`](../components/landing/pricing/pricing-primary-card.tsx)
- Public launch plan: [`docs/PUBLIC_LAUNCH_PLAN.md`](./PUBLIC_LAUNCH_PLAN.md) §Theme tokens
- Original blog brief (poster): [`docs/blog-and-theme-cursor-prompts.md`](./blog-and-theme-cursor-prompts.md) — **superseded for visual direction** by launch guardrails
