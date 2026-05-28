# Landing Home UI Correction Audit (Prompt 23)

Scope audited:
- Public homepage only (`/`).
- Components under `components/landing/home/**`, `components/landing/landing-page.tsx`, shared public shell/nav/footer used on home.
- Homepage CSS: `app/landing-home.css` (imports `app/public-theme.css` tokens).
- Background video: `components/landing/home/landing-video-bg.tsx` + `lib/landing/public-background.ts`.
- **No product code edits in this prompt.**

Reference direction (from prompt 23):
- Luminous **video backdrop** (full viewport, soft motion visible).
- **Centered premium glass/white hero surface** (floating card/panel on first viewport).
- **Sparse navigation** (logo + few links + one CTA).
- **Short left-aligned message** inside the hero surface (headline + one support line).
- **Generous whitespace** on the first screen.
- **Minimal lower content** below the fold (no chapter sprawl).

Local reference notes also exist in `docs/landing-simple-reset-prompts.md` (brochure-style white/cream canvas, chunky panels, max ~5 sections). Prompts 24–30 in `docs/restaurant-workspace-and-landing-correction-40-prompts.md` implement hero recomposition, copy, nav/footer trim, and section reduction—this doc is the pre-change inventory.

---

## Current homepage composition

Entry: `app/page.tsx` → `components/landing/landing-page.tsx` → `LandingHomeShell`.

| Order | Section component | DOM anchor | Role today |
|------|-------------------|------------|------------|
| 0 | `LandingVideoBackground` | fixed layer | Hero mp4 + gradient wash/scrim |
| 0 | `LandingHomeNav` | sticky header | Glass chrome nav (4 links + login + signup) |
| 1 | `LandingHomeHero` | `#hero` | Full-viewport block; title, lead, pricing pill, CTAs |
| 2 | `HomeMetricsStrip` | (no id) | Pilot metrics categories (no fabricated totals) |
| 3 | `HomeHowItWorks` | `#how` | Client scroll-story `HomeHowFlow` (multi-beat visuals) |
| 4 | `HomePay` | `#pay` | Glass pricing teaser |
| 5 | `HomeFaq` | FAQ accordion | Launch FAQ |
| 6 | `HomeCtaBand` | Final CTA band | Repeat demo/book CTAs |
| 7 | `MarketingFooter` | footer | Headline, CTAs, essential link list |

**Not on homepage today (files still in repo):**
- `HomeSolution` (`sections/home-solution.tsx`) — removed from `landing-page.tsx` import chain.
- `HomeProductProof` — not mounted on `/`.
- `home-savings-card.tsx` — not mounted on `/`.

---

## Background video component

**File:** `components/landing/home/landing-video-bg.tsx`  
**Asset:** `lib/landing/public-background.ts` → `/landing/hero-bg.mp4` (~700 KiB budget).

| Behavior | Implementation | Verdict |
|----------|----------------|---------|
| Homepage-only video | `FULL_BLEED_VIDEO_ROUTES = ["/"]`; other routes use gradient-only canvas | **Retain** |
| Reduced motion / save-data | Skips `<video>`; full gradient wash + scrim | **Retain** |
| Layer stack | `video` → `__blobs` (`--public-bg-wash`) → `__wash` (`--public-bg-scrim`) | **Retain** (tune opacities in CSS, not replace asset) |
| Autoplay | `muted` `loop` `playsInline`; play() catch on block | **Retain** |
| Luminous feel | With video: `--home-bg-wash-video` / `--home-bg-scrim-video` lighter than gradient-only | **Retain**; prompt 24 may increase perceived luminosity via hero surface contrast |

**Do not change in prompt 23:** mp4 path, preload policy, or route gating logic.

---

## CSS tokens and surfaces (homepage)

**Primary stylesheet:** `app/landing-home.css`  
**Token source:** `app/public-theme.css` (`--home-*` aliases to `--public-*`).

| Token / pattern | Used for | Audit |
|-----------------|----------|-------|
| `--home-bg`, `--home-ink`, `--home-muted` | Page text/background | **Retain** |
| `--home-surface-glass`, `--home-border-glass`, `--home-blur-glass` | Nav chrome, pills, glass sections | **Retain** (hero “premium surface” in prompt 24) |
| `--home-content-max`, `--home-gutter`, `--home-section-y` | Layout rhythm | **Retain**; tighten section-y for “minimal lower” |
| `--home-shadow-card`, `--home-shadow-soft` | Nav + cards | **Retain** |
| `.home-hero` | `min-height: 100dvh`, bottom-aligned flex | **Recompose** (prompt 24): center floating surface vs bottom-weighted stack |
| `.home-hero__content` | `max-width: 44rem`, left-aligned, no card wrapper | **Recompose**: add explicit glass/white panel wrapper |
| `.home-section--glass` | Pay band background | **Simplify** or merge into one lower block (prompts 29–30) |
| `.home-glass-panel` | Pay teaser panel | **Retain** pattern; reduce duplicate pricing blocks |
| How-flow SCSS in `landing-home.css` | Large block (~scroll story, stages, visuals) | **Simplify heavily** (prompt 29) |

---

## Navigation and chrome

**Files:** `landing-home-nav.tsx` → `PublicMarketingNav` + `lib/landing/public-nav.ts` (`PUBLIC_NAV_LINKS`).

| Element | Current | vs reference “sparse nav” |
|---------|---------|-------------------------|
| Primary links | Pricing, Blog, Demo, About (4) | **Simplify** → ~2 editorial links + in-page anchor (prompt 28) |
| Actions | Login text + Sign up pill | **Retain** signup; keep login subdued |
| Chrome | Glass pill bar (`home-nav__chrome`), sticky | **Retain** glass treatment; reduce link count |
| Mobile | Hamburger drawer with full link set | **Retain** pattern; same reduced link set |

---

## Hero content (copy + structure)

**Files:** `landing-home-hero.tsx`, `lib/landing/home-theme.ts` (`HOME_HERO`, `HOME_CTA`, `HOME_PRICING_PILL`).

| Piece | Current | Prompt 25+ direction |
|-------|---------|---------------------|
| Headline | “Never miss a rush-hour call.” | Rewrite: answer calls + pickup orders in caller’s language (avoid vague “never miss” alone) |
| Lead | “Pickup orders from your live menu—straight to the kitchen.” | One short owner sentence (non-technical) |
| Pricing pill | In-hero link to `/pricing` | **Retain** or move inside glass card footer (prompt 27) |
| CTAs | Hear demo (primary) + book demo mailto (secondary) | **Retain** pair; reduce visual noise in prompt 26 |

**Layout gap vs reference:** Hero copy is left-aligned but sits on open video—not inside a **centered floating glass/white panel**. First viewport reads as “text over video,” not “premium card on luminous canvas.”

---

## Below-the-fold sections (simplify target)

### Retain (substance + compliance)

| Section | Why retain | Simplify how (later prompts) |
|---------|------------|------------------------------|
| `LandingVideoBackground` | Core brand motion | CSS-only luminosity tuning |
| `LandingHomeNav` + signup CTA | Conversion + wayfinding | Fewer links |
| `LandingHomeHero` + CTAs | Primary message | Wrap in glass surface; shorter copy |
| `HomeFaq` + `HomeFaqJsonLd` | SEO/trust | Keep; optional accordion density trim |
| `MarketingFooter` | Legal/essential exits | Shorter link row (prompt 28) |
| Metrics safety | `HOME_METRICS` uses categories + `METRICS_PILOT_DISCLAIMER`—no fake counts | **Retain** honesty; consider **collapsing** strip into one trust line (prompt 29) |

### Simplify or demote (conflicts with “minimal lower content”)

| Section | Issue | Planned action |
|---------|-------|----------------|
| `HomeMetricsStrip` | Adds second band immediately under hero | Collapse to one line or move into hero card (prompt 29) |
| `HomeHowFlow` | Heavy client scroll choreography, multiple SVG/visual beats, large CSS | Replace with **static 3-step row** or single illustration (prompt 29) |
| `HomePay` | Re-states pricing after hero pill + nav paths to `/pricing` | **Merge** with hero pricing or one teaser (prompt 29–30) |
| `HomeCtaBand` | Duplicates hero CTAs at page end | **Keep one** final CTA only (prompt 30) |
| Duplicate pricing surfaces | Hero pill + Pay section + footer CTAs | **One** pricing path on page (prompt 27) |

### Do not re-mount without explicit prompt

| Component | Reason |
|-----------|--------|
| `HomeSolution` | Duplicates “how it works” narrative |
| `HomeProductProof` | Duplicates `/demo`; heavy second product demo |
| `HomeSavingsCard` | Example/savings framing; risks fabricated ROI tone |

---

## Gap summary: current vs reference direction

| Reference target | Current state | Correction track |
|------------------|---------------|------------------|
| Luminous video backdrop | Implemented; opacities 0.72 video + wash | **Retain** asset; tune scrim in prompt 24 |
| Centered glass/white hero surface | Missing; text floats on video | **Add** `.home-hero__surface` (or similar) in prompt 24 |
| Sparse nav | 4 links + login + signup | **Reduce** links in prompt 28 |
| Short left-aligned message | Present but verbose theme (“rush-hour”) | **Rewrite** in prompt 25 |
| Generous whitespace | Hero is tall but crowded with pill + 2 CTAs | **Recompose** spacing in prompts 24–26 |
| Minimal lower content | 4 major bands + FAQ + footer CTAs | **Collapse** to ≤2 content blocks + FAQ + footer in prompts 29–30 |

---

## Files likely touched in prompts 24–30 (no edits yet)

| Prompt | Expected touch |
|--------|----------------|
| 24 | `landing-home.css`, `landing-home-hero.tsx`, maybe `landing-home-shell.tsx` |
| 25 | `lib/landing/home-theme.ts` (copy only) |
| 26 | `landing-home-cta.tsx`, hero CSS |
| 27 | `landing-home-pricing-pill.tsx`, `home-pay.tsx`, copy helpers |
| 28 | `public-nav.ts`, `public-marketing-nav.tsx`, `footer-copy.ts` |
| 29–30 | `landing-page.tsx`, section components, `landing-home.css` |

**Stable (avoid drive-by changes):** `landing-video-bg.tsx` logic, `public-background.ts` mp4 config, dashboard/auth routes, Supabase, analytics/billing.

---

## Verification note (prompt 22 carryover)

Workspace/auth changes (prompts 01–22) are documented in `docs/RESTAURANT_WORKSPACE_UI_CORRECTION.md`. Homepage audit is independent; no authenticated screens modified in prompt 23.
