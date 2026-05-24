# Public launch readiness plan

**Date:** 2026-05-22  
**Status:** Public marketing QA complete (launch queue **85–99**) — ready for staging/production preview  
**Source queue:** `docs/launch-ready-site-100-prompts.md` (implementation + QA pass)

---

## Launch snapshot (queue 85–99)

### Final public routes

| Route | Shell / CSS | Sitemap | Notes |
|-------|-------------|---------|-------|
| `/` | `LandingHomeShell` · `landing-home.css` | Yes · `1.0` | Hero video · metrics · how-flow · FAQ · `#how` `#what` `#trust` `#proof` `#pay` |
| `/pricing` | `MarketingShell` · `public-theme` | Yes | $0.90 success pricing · mailto walkthrough CTA |
| `/blog` | `MarketingShell` | Yes · `0.9` | Category filter · 10 posts |
| `/blog/[slug]` | `MarketingShell` | Yes · per slug | AEO + JSON-LD |
| `/about` | `MarketingShell` | Yes | Company story |
| `/demo` | `MarketingShell` | Yes | Video placeholder · flow · transcript · ticket |
| `/contact` | `MarketingShell` | Yes | Pilot form (mailto) · self-serve signup link |
| `/security` | `MarketingShell` | Yes | Trust / data handling |
| `/privacy` | `MarketingShell` | Yes | Legal |
| `/terms` | `MarketingShell` | Yes | Legal |
| `/login` | `(auth)/layout` · `public-theme` | No (auth) | `AuthForm` sign-in |
| `/signup` | `(auth)/layout` · `public-theme` | No (auth) | Onboarding aside + sign-up |
| `not-found` | `MarketingShell` | — | Public 404 |

**Auth helpers (not in sitemap):** `/auth/callback`, `/auth/signout` (POST).

**Protected (not public):** `/dashboard/**` — middleware + layout redirect to `/login?next=...`.

Config: `app/sitemap.ts` (`SITEMAP_PUBLIC_PATHS`), `app/robots.ts`, `middleware.ts` matcher.

---

### Changes made (85–99)

| # | Area | Outcome |
|---|------|---------|
| 85 | Buttons | Canonical `PUBLIC_CTA` + `PublicCtaButton` / `PublicCtaActions` — `docs/BUTTON_CONSISTENCY.md` |
| 86 | Forms | `PublicFormField` + shared auth/contact styles — `docs/FORM_CONSISTENCY.md` |
| 87 | Mobile nav | Drawer scroll-lock, focus trap, Escape — `docs/MOBILE_NAV_QA.md` |
| 88 | Mobile pages | `public-mobile-pages.css` — `docs/MOBILE_PAGE_QA.md` |
| 89 | Desktop pages | Readable max-width on marketing copy — `docs/DESKTOP_PAGE_QA.md` |
| 90 | Cross-links | Nav/footer/CTA + homepage hashes `#how` `#trust` `#proof` — `docs/CROSS_LINK_QA.md` |
| 91 | Blog links | Index/related slugs validated at load — `docs/BLOG_LINK_QA.md` |
| 92 | Pricing CTAs | Demo + pricing walkthrough mailto + signup — `docs/PRICING_CTA_QA.md` |
| 93 | Demo CTAs | Bottom: Book demo call (mailto) then Sign up — `docs/DEMO_CTA_QA.md` |
| 94 | Auth routes | Dashboard → login; login/signup render — `docs/AUTH_ROUTE_QA.md` |
| 95 | Performance | Hero video `preload=metadata` · ~700 KiB mp4 · CSS scroll reveals — `docs/PUBLIC_PERFORMANCE_QA.md` |
| 96 | Accessibility | Landmarks, focus, FAQ semantics, forms — `docs/PUBLIC_ACCESSIBILITY_QA.md` |
| 97 | Lint | `npm run lint` — clean |
| 98 | Build | `npm run build` — clean (removed invalid `fetchPriority` on `<video>`) |
| 99 | This doc | Launch snapshot + preview instructions |

**Unified IA:** `lib/landing/public-nav.ts` + `lib/landing/footer-copy.ts` (`LANDING_FOOTER`) on home and marketing shells via `PublicMarketingNav` / `PublicFooter`.

**Theme:** `app/public-theme.css` shared by marketing, auth, and home (via `landing-home.css` import). Poster yellow/lime is phased out on public routes.

---

### Pages checked (QA pass)

Manual + automated checks on:

- `/` — hero, nav drawer, metrics, how-flow, pay, FAQ, footer, video/reduced-motion
- `/pricing`, `/about`, `/security`, `/contact`, `/demo`
- `/blog`, `/blog/[slug]` (sample slugs)
- `/login`, `/signup`
- `/privacy`, `/terms`
- Logged-out `/dashboard` → `/login?next=...`

**Commands used in pass:**

```bash
npm run lint
npm test -- tests/unit/public-cta.test.ts tests/unit/cross-link-qa.test.ts \
  tests/unit/blog-link-qa.test.ts tests/unit/pricing-cta-qa.test.ts \
  tests/unit/demo-cta-qa.test.ts tests/unit/auth-route-qa.test.ts \
  tests/unit/public-performance-qa.test.ts tests/unit/public-accessibility-qa.test.ts
npm run build
```

---

### Canonical CTAs

**Global pair** (`PUBLIC_CTA_PAIR` — most marketing heroes/close bands):

| Role | Label | Href |
|------|-------|------|
| Primary | Hear a demo call | `/demo` |
| Secondary | Book a demo | `/contact` |

**Page-specific**

| Surface | Primary | Secondary | Tertiary / notes |
|---------|---------|-----------|------------------|
| `/` hero & CTA band | Hear a demo call | Book a demo | Pricing pill → `/pricing` |
| `/pricing` | Hear a demo call | Book a pricing walkthrough | `mailto:hello@getroal.com` (subject: ROAL pricing walkthrough) · signup text link |
| `/demo` bottom | Book a demo call | Sign up | Mailto first, then `/signup?next=/dashboard/restaurants` |
| `/contact` hero | Send your menu (`#contact-form`) | Book a demo (mailto) | Self-serve signup in aside |
| Nav (all public) | — | Book a demo | Login → `/login` |
| Footer | — | Book a demo | Login + mailto `hello@getroal.com` + Sign up |

Source: `lib/landing/public-cta.ts`, `lib/landing/pricing-page-copy.ts` (`PRICING_WALKTHROUGH_CTA`), `lib/landing/demo-page-copy.ts` (`DEMO_CTA`).

---

### Known gaps (post-QA)

| Priority | Gap | Notes |
|----------|-----|-------|
| P0 | **`NEXT_PUBLIC_APP_URL` in production** | Required for canonical URLs, sitemap origin, blog JSON-LD (`lib/site-url.ts`). Without it, metadata defaults to `http://localhost:3000`. |
| P1 | **Standalone `/faq`** | Homepage FAQ + pricing/security FAQs ship; no global `/faq` route (optional). |
| P1 | **Marketing OG/Twitter on all routes** | Blog has full metadata; spot-check `/`, `/pricing`, `/demo` share cards in staging. |
| P1 | **Homepage `Organization` / `WebSite` JSON-LD** | Home has `FAQPage` graph; site-level org schema optional. |
| P2 | **Hero demo video asset** | Placeholder frame until real rush-hour recording replaces `/public/landing/hero-bg.mp4`. |
| P2 | **Demo page video** | SVG placeholder only — no hosted demo MP4 yet. |
| P2 | **Contact form** | Mailto preview — not persisted server-side. |
| P3 | **RSS** | Optional post-launch. |
| — | **Dashboard / Supabase** | Out of scope for public launch QA; do not block marketing preview on backend env issues. |

---

### How to preview

**Local**

```bash
cp .env.example .env.local   # if needed
# Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY for auth pages
# Optional: NEXT_PUBLIC_APP_URL=http://localhost:3000

npm install
npm run dev
```

Open:

| URL | What to verify |
|-----|----------------|
| http://localhost:3000/ | Video (or gradient if reduced motion), nav, `#how` anchor |
| http://localhost:3000/pricing | $0.90 copy, mailto walkthrough button |
| http://localhost:3000/demo | Bottom CTAs: mailto then signup |
| http://localhost:3000/contact | Form labels, mailto submit |
| http://localhost:3000/blog | Filter chips, post cards |
| http://localhost:3000/login | Glass auth panel |

Fresh bundle if chunks 404: `npm run dev:fresh` (see `docs/TESTING.md`).

**Production / staging**

1. Set `NEXT_PUBLIC_APP_URL` to the live origin (no trailing slash).
2. Deploy; hit `/api/health` (degraded OK if only marketing).
3. Run `bash scripts/smoke-test-production.sh` if configured for your host.
4. Verify `/sitemap.xml` and `/robots.txt` use the live domain.
5. Mobile: 375px width — nav drawer, no horizontal scroll on routes above.

**Sign-off bar:** `npm run lint` + `npm run build` pass; QA doc tests pass; visual pass on the route table with real `NEXT_PUBLIC_APP_URL`.

---

## Executive summary (historical context)

ROAL’s **public surface is unified**: `/` keeps the glass/lavender homepage (`LandingHomeShell`); all other marketing and auth routes use **`MarketingShell`** (`PublicPageShell`) with **`public-theme.css`**. Blog (10 posts), sitemap, robots, legal pages, `/about`, pricing ($0.90), and launch QA (85–99) are in place. Remaining launch risk is mainly **production env** (`NEXT_PUBLIC_APP_URL`) and **content assets** (real demo video), not IA or dead links.

---

## Theme guardrails (do not break)

> **Do not replace the homepage theme.** All later public-site work must keep `LandingHomeShell`, `app/landing-home.css`, the hero video (`/landing/hero-bg.mp4`), and the lavender/black glass look on `/`. Other routes should adopt this direction—never swap `/` back to `MarketingShell`, poster cream/yellow styling, or a center-orb hero.

Preserve on `/` and extend visually elsewhere — **do not revert**:

| Asset | Path | Role |
|-------|------|------|
| Homepage shell | `components/landing/home/landing-home-shell.tsx` | Video bg, glass nav, footer |
| Homepage CSS | `app/landing-home.css` | Lavender/pink/amber tokens, glass panels, black pill CTAs |
| Hero video | `/public/landing/hero-bg.mp4` (`HOME_HERO_VIDEO` in `lib/landing/public-background.ts`) | Background motion · `preload=metadata` |
| Home sections | `components/landing/landing-page.tsx` → `home/*` | 5-section brochure layout |

**Do not:**

- Replace `LandingHomeShell` with `MarketingShell` on `/`
- Reintroduce the old yellow/cream poster homepage or center-orb hero
- Apply poster tokens (`--public-yellow`, `--landing-lime`, thick ink outlines) to the homepage
- Change dashboard `globals.css` `:root` for marketing experiments

**Do:**

- Extract shared tokens from `landing-home.css` into reusable public variables/classes for `MarketingShell`, blog, auth, and new pages
- Restyle `MarketingShell` / `.public-theme` to **match** homepage glass/lavender/black — not the inverse

---

## Public route map (reference)

Authoritative route table: [Launch snapshot (queue 85–99)](#launch-snapshot-queue-8599) above.

| Route | App file |
|-------|----------|
| `/` | `app/page.tsx` |
| `/pricing` | `app/pricing/page.tsx` |
| `/blog` | `app/blog/page.tsx` |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` |
| `/about` | `app/about/page.tsx` |
| `/demo` | `app/demo/page.tsx` |
| `/contact` | `app/contact/page.tsx` |
| `/security` | `app/security/page.tsx` |
| `/privacy` | `app/privacy/page.tsx` |
| `/terms` | `app/terms/page.tsx` |
| `/login` | `app/(auth)/login/page.tsx` |
| `/signup` | `app/(auth)/signup/page.tsx` |
| 404 | `app/not-found.tsx` |

---

## Resolved gaps (were P0–P1 before QA 85–99)

The items below were launch blockers in earlier drafts; **addressed** unless listed in [Known gaps](#known-gaps-post-qa):

- Unified nav/footer (`public-nav.ts`, `LANDING_FOOTER`, `PublicMarketingNav`, `PublicFooter`)
- Glass `public-theme` on marketing + auth (`(auth)/layout.tsx` imports `public-theme.css`)
- `/about`, `/privacy`, `/terms` shipped and in sitemap
- Pricing + homepage $0.90 / successful-order messaging
- Homepage metrics strip, FAQ (`HomeFaq` + JSON-LD), trust row (`#trust`), savings card, how-flow, product proof
- Cross-links, blog slug validation, CTA consistency, mobile/desktop QA passes
- Lint + production build green for public TypeScript surfaces

---

## Theme tokens to reuse

### Shared source of truth (`app/public-theme.css`) — **shipped step 4**

Imported by `landing-home.css`, `landing.css`, and `(auth)/layout.tsx`. Scoped to `.public-theme`, `.landing-home`, `.landing-story` only (dashboard `globals.css` untouched).

**Canonical variables:** `--public-bg`, `--public-ink`, `--public-accent-lavender`, etc.  
**Homepage aliases:** `--home-*` → `--public-*`  
**Tailwind bridges:** `--bg-base`, `--text-primary`, `--accent`, …  
**Shared classes:** `.public-wrap`, `.public-glass-panel`, `.public-btn-primary`, `.public-display`, …  
**Auth/marketing overrides:** `.public-theme .glass-card`, `.public-theme .btn-primary` (black pill)

### Homepage layout (`app/landing-home.css`)

Component/layout rules only; tokens come from `public-theme.css`. Mirror for custom markup:

| Token | CSS variable | Use on public pages |
|-------|----------------|---------------------|
| Background | `--home-bg` | Page canvas |
| Elevated / glass surface | `--home-bg-elev`, `--home-surface-glass` | Cards, nav pill |
| Text | `--home-ink`, `--home-muted`, `--home-subtle` | Body hierarchy |
| Accents | `--home-accent-lavender`, `--home-accent-pink`, `--home-accent-amber` | Washes, blobs (no yellow/lime) |
| Glass | `--home-border-glass`, `--home-blur-glass`, `--home-shadow-soft`, `--home-shadow-card` | Panels, nav |
| Radius | `--home-radius-pill`, `--home-radius-card`, `--home-radius-nav` | Buttons, cards |
| Layout | `--home-content-max`, `--home-gutter`, `--home-section-y` | Sections |
| Type scale | `--home-text-display`, `--home-h2`, `--home-text-lead`, `--home-text-body` | Headings |
| Focus | `--home-focus-ring`, `--home-focus-offset` | a11y |
| Motion | `--home-ease` | Transitions |

### Existing utility classes (homepage)

Reuse or alias on marketing pages:

- `.home-glass-panel`, `.home-glass-nav`, `.home-btn-primary` (black pill), `.home-btn-secondary` (glass)
- `.home-wrap`, `.home-section`, `.home-section--glass`
- Typography: `.home-eyebrow`, `.home-display`, `.home-h2`, `.home-lead`, `.home-body`

### Poster stack to phase out on public pages (`app/landing.css`)

Still used by `MarketingShell`, blog, pricing, demo, contact, security, 404:

- `--public-cream`, `--public-yellow`, `--public-lime`, `--landing-outline`, `--landing-shadow`
- Semantic bridges: `--bg-base`, `--text-primary`, `btn-primary` tied to lime accent

**Migration approach:** Add a `public-home-bridge` block in `landing.css` (or shared `public-theme.css`) mapping poster semantics → home tokens; then restyle components without touching dashboard.

### Config / copy tokens

| Module | Purpose |
|--------|---------|
| `lib/landing/home-theme.ts` | `HOME_NAV`, `HOME_HERO`, `HOME_CTA`, video src |
| `lib/landing/chapters.ts` | `LANDING_NAV`, `LANDING_CTA` (marketing) — **consolidate with HOME_*** |
| `lib/landing/footer-copy.ts` | `LANDING_FOOTER` — expand for launch footer IA |
| `lib/landing/pricing-page-copy.ts` | Pricing hero, FAQ, plans |
| [`docs/PRICING_PAGE_PLAN.md`](./PRICING_PAGE_PLAN.md) | `/pricing` audit + $0.90 success-based rebuild (prompts 27–33) |
| [`docs/BLOG_THEME_AUDIT.md`](./BLOG_THEME_AUDIT.md) | Blog index/article poster → glass theme plan (prompts 34–36) |
| `lib/landing/contact-page-copy.ts` | `CONTACT_PILOT_EMAIL` |

### Fonts (already global)

- `DM_Sans` → `--font-body`
- `Fraunces` → `--font-display`  
Set in `app/layout.tsx`; safe on all public routes.

---

## Navigation structure (shipped)

**Nav** (`PUBLIC_NAV_LINKS`): How it works → `/#how` · Pricing · Blog · About · header **Book a demo** → `/contact` · **Login** → `/login`.

**Footer** (`LANDING_FOOTER`): Product (Demo, Pricing, Security) · Company (About, Contact, Sign up) · Resources (Blog) · Legal (Privacy, Terms) · mailto + Book demo + Login.

Home and marketing shells share `PublicMarketingNav` + `PublicFooter` (see `docs/CROSS_LINK_QA.md`).

---

## SEO / AEO needs

### Already implemented

| Item | Location |
|------|----------|
| `sitemap.ts` | Static marketing paths + all blog slugs |
| `robots.ts` | Disallow `/dashboard/`, `/api/`; sitemap URL |
| Blog metadata | `lib/blog/metadata.ts` — canonical, OG, Twitter |
| Blog AEO body | `answerShort` + 3–5 FAQs per post; `validate-aeo.ts` at load |
| Article JSON-LD | `components/blog/blog-article-json-ld.tsx`, `lib/blog/json-ld.ts` |
| 10 journal posts | `lib/blog/posts.ts` — categories aligned to product keywords |

### Gaps to implement

| Item | Priority | Notes |
|------|----------|-------|
| `NEXT_PUBLIC_APP_URL` in prod | P0 | Enables absolute canonicals and JSON-LD |
| Marketing page OG + canonical | P1 | Mirror `buildBlogIndexMetadata` pattern for `/pricing`, `/demo`, etc. |
| Homepage `Organization` + `WebSite` JSON-LD | P1 | Name, url, logo, contact |
| Homepage FAQ section + `FAQPage` schema | P1 | 5–8 owner questions; supports AI overviews |
| Pricing page headline + FAQ alignment | P0 | Must state $0.90 and successful-order definition (match blog post `pay-only-successful-orders`) |
| `/about` page with clear entity description | P1 | AEO: who ROAL is, who it serves |
| Internal linking | P2 | Blog → `/pricing`, `/demo`; pricing → security/contact |
| `hreflang` | P3 | English-only OK for v1 |
| RSS | P3 | Optional |

### AEO content rules (keep)

- One-sentence **Answer in short** at top of each article
- **3–5 unique FAQs** per post (enforced)
- Plain-language definitions (successful order, live menu, handoff)
- No unsupported revenue claims; label pilot metrics clearly

### Keyword themes (content + meta)

- Missed restaurant calls / dinner rush
- AI phone ordering / voice agent for restaurants
- Live menu + KDS tickets
- Success-based pricing / pay per completed order
- Setup time / pilot onboarding

---

## Homepage section audit (step 11)

**Entry:** `app/page.tsx` → `LandingPage` → `LandingHomeShell` (5 sections + hero chrome).  
**Constraint:** Keep glass/lavender/video theme; stay brochure-short (~7 logical blocks max, +2 mobile screen heights vs today).  
**Do not:** Re-add 17-chapter story scroll (`docs/LANDING_STORY_BLUEPRINT.md` is historical).

### Current map (shipped)

| # | Component | `id` / anchor | Layout | Copy focus |
|---|-----------|---------------|--------|------------|
| 1 | `LandingHomeHero` + pricing pill | `#hero` | Full-viewport video; headline + lead + CTAs | Missed calls; demo/signup CTAs |
| 2 | `HomeSolution` | `#what` | Glass band; 3 cards | Phone · live menu · KDS ticket |
| 3 | `HomeHowItWorks` | `#how` | 3 glass step cards | Menu → line → orders (nav links here) |
| 4 | `HomePay` | `#pay` | 2-col glass | Success billing definition |
| 5 | `HomeCtaBand` | — | Centered glass panel | Try ROAL; demo CTAs |

**Chrome (not sections):** `LandingHomeNav`, `PublicFooter`, `LandingHomePricingPill` → `/pricing`.

**Gaps vs launch queue:** metrics strip, FAQ (`#faq`), enterprise trust row, $0.90 in pay block, hero CTA = Hear demo + Book demo, optional product proof visual.

---

### Recommended target layout (still short)

| # | Section | Action | Placement rationale |
|---|---------|--------|-------------------|
| 1 | Hero | **Polish only** (steps 12–13): CTAs → Hear demo + Book demo; keep pill + video | Already owns above-the-fold |
| 2 | **Metrics strip** | **Add** — 3 pilot-labeled stats in one glass row | **After `#what`** (credibility once value is clear); ~80px tall |
| 3 | `HomeSolution` | **Extend in place** — 4th micro-row: enterprise trust chips (4 bullets, one line each) | Avoid new section; chips under card grid |
| 4 | `HomeHowItWorks` | **Planned scroll flow** — see [`docs/HOME_HOW_FLOW_PLAN.md`](./HOME_HOW_FLOW_PLAN.md) (steps 18–19 build) | Nav anchor `#how` stays |
| 5 | **Product proof** | **Optional** — single compact call→ticket visual inside `#what` or between `#how` and `#pay` | Only if reusing `getLandingPreview` / static art; skip if it adds scroll |
| 6 | `HomePay` | **Enhance in place** — headline mentions $0.90/order + link to `/pricing` (step 21) | Pricing story before FAQ |
| 7 | **FAQ** | **Add** — `HomeFaq` with `id="faq"`, 5–6 items, glass accordion | **Before** final CTA; supports AEO + owner objections |
| 8 | `HomeCtaBand` | **Polish** — align CTAs with hero; one-line trust repeat optional | Closes page |

**Net new sections:** 2 (metrics strip, FAQ). Everything else is in-section polish → ~+1.5–2 mobile screens, not a long landing.

---

### Metrics strip (step 14)

| Item | Spec |
|------|------|
| **Where** | New `HomeMetricsStrip` between `HomeSolution` and `HomeHowItWorks` |
| **UI** | `home-section--tight` + 3 columns; glass cards or inline stat + label |
| **Label** | Eyebrow: “Pilot metrics we track” (not “results we guarantee”) |
| **Stats (example placeholders)** | Orders recovered from missed calls · Staff hours back on the floor · Fewer order-taking interruptions |
| **Numbers** | Use ranges or “pilot average” only if backed; else label-only until real data |
| **Theme** | Reuse `home-glass-panel`, `home-eyebrow`, no poster/lime |

---

### Enterprise polish (steps 16, 20 — fold in, don’t bloat)

| Trust point | Where to surface |
|-------------|------------------|
| Secure menu + tenant data | Trust chip in `HomeSolution` + footer trust line (done) + FAQ item |
| Human handoff to staff | `HomeSolution` card copy + FAQ |
| Live kitchen ticket (KDS) | Already in solution cards |
| No per-minute surprise billing | Pay section + pricing pill + FAQ |
| Link to `/security` | One sentence + text link at bottom of FAQ or trust chip row |

**Skip for v1 homepage:** customer logos, long testimonials, SOC2 badges (point to `/security` instead).

---

### FAQ (steps 22–23)

| Item | Spec |
|------|------|
| **Where** | New `HomeFaq` after `HomePay`, before `HomeCtaBand`; `id="faq"` |
| **Count** | 5–6 questions (not 10+) |
| **Topics** | What counts as a successful order / $0.90 pricing · Setup time & menu scan · Keep my phone number? · Wrong orders or handoff · Menu accuracy · Data security (link `/security`) |
| **UI** | Native `<details>` or minimal accordion; `home-glass-panel` per item |
| **AEO** | Mirror phrasing from `/pricing` FAQ + blog `pay-only-successful-orders`; add `FAQPage` JSON-LD in `app/page.tsx` when implemented |
| **Nav** | Optional later: footer or nav link `/#faq` — not required for launch if page stays short |

---

### Section-by-section: do / don’t

| Section | Do | Don’t |
|---------|-----|------|
| Hero | Pill ✅; dual CTA polish; keep spacer/video | Extra headline bands; auto-playing audio |
| Solution | Trust chips; maybe one static ticket visual | Second product chapter; competitor tables |
| Metrics | One row, pilot-labeled | Fake “10,000+ restaurants” counts |
| How | Scroll flow per [`HOME_HOW_FLOW_PLAN.md`](./HOME_HOW_FLOW_PLAN.md) | 17-chapter scroll choreography |
| Pay | $0.90 + `/pricing` link | Full pricing table (belongs on `/pricing`) |
| FAQ | 5–6 owner questions | Duplicate full `/security` prose |
| CTA band | Hear demo + Book demo | Third signup push |

---

### Anchors & nav alignment

| Anchor | Section | In nav today? |
|--------|---------|-------------|
| `#hero` | Hero | — |
| `#what` | Solution | — (consider “Product” → `/#what` later) |
| `#how` | How it works | Yes (`/#how`) |
| `#pay` | Pay | — (pricing pill → `/pricing`) |
| `#faq` | FAQ (planned) | No (add when section ships) |

---

### Implementation order (homepage only)

1. Hero CTA copy (12–13) — **done**  
2. Metrics strip (14) — **done**  
3. Savings card (15) — **done**  
4. Trust chips in solution (16) — **done**  
5. How scroll flow (17 plan → 18–19 build) — **plan:** [`HOME_HOW_FLOW_PLAN.md`](./HOME_HOW_FLOW_PLAN.md)  
6. Pay $0.90 teaser (21)  
7. FAQ + schema (22–23)  
8. CTA band alignment — **done** (13)  
9. Optional product proof visual (20) — only if time

Do **not** re-expand to 17-chapter story layout (`docs/LANDING_STORY_BLUEPRINT.md` is historical).

---

## QA checklist (public launch)

Run on **production URL** with `NEXT_PUBLIC_APP_URL` set. Desktop + mobile (375px). Automated coverage: `docs/*_QA.md` files listed in [Changes made](#changes-made-8599).

### Preflight

- [x] `npm run lint` pass (queue 97)
- [x] Targeted unit tests pass (CTA, links, auth, perf, a11y)
- [x] `npm run build` pass (queue 98)
- [ ] `GET /api/health` healthy/degraded on staging/prod
- [ ] `NEXT_PUBLIC_APP_URL` matches live domain
- [ ] `/sitemap.xml` loads; URLs use production origin
- [ ] `/robots.txt` correct; sitemap line present

### Routes & links

- [x] `/` — video/metadata preload; anchors `#how` `#trust` `#proof` `#pay` (queue 90)
- [x] `/pricing`, `/demo`, `/blog`, `/about`, `/contact`, `/security`, `/privacy`, `/terms` — build + link QA
- [x] `/login`, `/signup` — render + redirect rules (queue 94)
- [ ] `/blog/[slug]` — spot-check 2–3 posts in browser
- [ ] Signed-in user: `/login` → dashboard; guest `/dashboard` → login with `next`
- [ ] Unknown path → 404

### Visual / brand

- [x] Glass/lavender public theme on marketing + auth
- [x] Mobile nav + page layout QA (87–88)
- [x] Desktop readable width (89)
- [ ] Final visual pass on staging with real content

### Copy & conversion

- [x] Pricing $0.90 + walkthrough mailto (92)
- [x] Demo bottom mailto + signup (93)
- [x] Canonical CTA labels (85)
- [ ] `hello@getroal.com` opens correct mail client on device

### SEO / social

- [ ] Production canonicals / OG spot-check (blog confirmed in code)
- [ ] Rich Results test on one blog article
- [ ] Lighthouse SEO spot-check (best effort)

### Accessibility

- [x] Automated public a11y QA (96) + `docs/AUTH_ACCESSIBILITY.md`
- [ ] Manual keyboard pass on `/` and `/pricing`

### Performance

- [x] Hero mp4 ≤ budget; `preload=metadata` (95)
- [ ] Lighthouse performance spot-check on `/`

### Security / privacy (smoke)

- [ ] No service role in client bundles
- [ ] `/dashboard` disallowed in robots

---

## Implementation phases (maps to prompt queue)

| Phase | Scope | Doc prompts |
|-------|--------|-------------|
| **A — Plan** | This file | §1–2 |
| **B — Tokens + shell** | Bridge `landing-home` → `MarketingShell`; `.public-theme` for auth | §4–5, §10 |
| **C — IA** | Unified nav/footer; pricing pill | §6–9 |
| **D — Homepage** | Metrics, FAQ, trust, CTA/copy | §11–20 |
| **E — Pages** | `/pricing` $0.90, `/about`, `/demo`, `/contact`, `/security` copy/theme | §21–30 |
| **F — Blog + auth** | Blog skin match; auth glass | §31–40 |
| **G — SEO** | OG, JSON-LD, sitemap updates | §41–50 |
| **H — QA** | Checklist above + visual pass | §51+ |

---

## Reference: competitor IA (inform launch, not copy)

| Site | Nav patterns worth mirroring |
|------|------------------------------|
| Talk2Order | Features, Pricing, FAQ, About, Blog, Book demo |
| BuzzOrder | How it works, pricing tiers, FAQ, feature list |
| TastyVox | Demo-first CTA, trust bullets, blog/tools |
| Serviio / TalkDin | Simple setup, book demo, pricing |

ROAL differentiator to keep central: **live menu → KDS ticket → pay only for successful orders**.

---

## Related docs

| Doc | Relevance |
|-----|-----------|
| `docs/CROSS_LINK_QA.md` | Nav, footer, CTAs, homepage hashes |
| `docs/BLOG_LINK_QA.md` | Blog index + related posts |
| `docs/PRICING_CTA_QA.md` · `docs/DEMO_CTA_QA.md` | Conversion CTAs |
| `docs/AUTH_ROUTE_QA.md` · `docs/AUTH_ACCESSIBILITY.md` | Auth |
| `docs/PUBLIC_PERFORMANCE_QA.md` · `docs/PUBLIC_ACCESSIBILITY_QA.md` | Perf + a11y |
| `docs/BUTTON_CONSISTENCY.md` · `docs/FORM_CONSISTENCY.md` | UI canon |
| `docs/MOBILE_NAV_QA.md` · `docs/MOBILE_PAGE_QA.md` · `docs/DESKTOP_PAGE_QA.md` | Layout |
| `docs/launch-ready-site-100-prompts.md` | Full prompt queue |
| `docs/AUTH.md` · `docs/DEPLOYMENT.md` | Auth flows · deploy env |

---

## Sign-off criteria for “public launch ready”

1. [x] Single visual language across `/` and marketing/auth routes (glass/lavender/black).
2. [x] Unified nav/footer IA including `/about`, `/security`, legal, pricing $0.90.
3. [x] Homepage FAQ + metrics + trust + how-flow + canonical CTAs.
4. [ ] Production `NEXT_PUBLIC_APP_URL`; sitemap/robots/OG verified on live host.
5. [ ] Remaining items in [QA checklist](#qa-checklist-public-launch) on staging/production.
6. [x] No public-frontend build/lint blockers; dashboard unchanged by this pass.
