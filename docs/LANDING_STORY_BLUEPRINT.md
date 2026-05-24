# ROAL Landing Story Blueprint

Audit date: 2026-05-19. Scope: landing/marketing only. **No implementation in this doc** — blueprint for the story rebuild described in `docs/landing-story-prompts.md`.

---

## Current state (audit summary)

| Area | What exists today | Gap vs story goal |
|------|-------------------|-------------------|
| **Hero** | H1: “Launch your restaurant phone agent in **20 minutes**”; chip “For independent restaurants”; stat pills; `ProductPreview` → `KdsHeroPreview` (menu sidebar + phone orders) | Leads with setup time, not emotional “never miss a call”; hero is a static dashboard mock, not call→ticket cinematic |
| **Narrative** | Linear doc page: problem cards → numbered setup → four `FeatureRow`s → security bullets → pricing cards → dark CTA | No rush-hour timeline, no conversation chapter, no success-pricing story, no social proof / audio demo |
| **Motion** | `pulse-dot` CSS only; `framer-motion` in `package.json`, **unused** on landing | No scroll chapters, reveals, pinned scenes, reduced-motion layer |
| **Visual** | Shared dashboard tokens: light gray base, cyan accent, `bg-grid`, `glass-card`, serif `font-display` | Reads as capable SaaS, not “dinner rush / kitchen ticket”; no ticket paper, waveform, or rush-hour palette |
| **Copy** | Operator-aware but feature-led; security section names RLS, `roal1`, Gemini, ElevenLabs on homepage | Jargon on `/` hurts layman trust; core differentiator “pay only for successful orders” absent |
| **Satellite pages** | `/pricing`, `/demo`, `/security`, `/contact` reuse `MarketingShell` + `MarketingPageHero`; demo shows real `ProductPreview` | Same template feel; pricing is tier cards not success-based; demo is steps + preview, not call simulation |

**Component inventory (19 files under `components/landing/`):**

- **Orchestration:** `landing-page.tsx` (all section copy + order), `marketing-shell.tsx`, `landing-section.tsx`, `landing-nav.tsx`, `landing-cta.tsx`, `marketing-footer.tsx`, `marketing-page-hero.tsx`
- **Features:** `feature-row.tsx`, `feature-visuals.tsx` → previews
- **Hero product UI:** `product-preview.tsx` → `preview/kds-hero-preview.tsx`, `menu-sidebar-preview.tsx`, `phone-orders-preview.tsx`, `shared.tsx`, `roal-mark.tsx`
- **Feature previews:** `menu-scanner-preview.tsx`, `voice-agent-preview.tsx`, `kds-feature-preview.tsx`, `handoff-visual.tsx`
- **Data:** `lib/landing-demo-data.ts`, `lib/get-landing-preview.ts` (consumed by `app/page.tsx`, `app/demo/page.tsx`)

---

## Audience

**Primary:** Independent restaurant owners and GMs (1–3 locations) who lose pickup revenue when the phone rings during the rush.

**Mindset:** Skeptical of “AI phone bots”; burned by wrong quotes, voicemail, and tools that don’t connect to the kitchen line.

**Jobs to be done:**

1. Answer every answerable call without adding a phone person.
2. Quote real menu items/modifiers accurately.
3. See orders on the pass while the guest is still on the line.
4. Pay in proportion to real orders, not failed experiments.

**Not the hero:** Enterprise procurement, generic “AI SaaS” buyers, or developers (keep technical depth on `/security` only).

---

## Competitor lessons (apply, don’t copy)

| Pattern (market) | Examples | ROAL response |
|------------------|----------|---------------|
| First-ring answer, no missed revenue | SoundHound | Open with **missed call = lost ticket**, not feature list |
| Human-like voice, no hold | VOIA, Takeorder, Serviio, TastyVox, Cleverli, Talk2Order, Appetell, Tunvo, Orda | Show **transcript + waveform**, not “Connect ElevenLabs” UI |
| Rush-hour scale | Most | **6:42 PM** story beat — line, ring, no answer |
| Menu-aware ordering | Table stakes | **“Reads your live menu”** — scan → DB → agent (product truth) |
| Analytics / basket size | SoundHound+ | Defer to pilot metrics cards; don’t fake ROI numbers |
| Generic chatbot / IVR | Implied competitor weakness | Contrast: **not a script**, KDS-synced pickup workflow |

**Memorable angle:** One cinematic arc — *ring → human agent → live menu → ticket on KDS before hang-up* — tied to **success-based pricing**, not “20-minute setup” as the lead.

---

## Core promise

**Headline (north star):**  
**Never miss a call. Let our agents handle it.**

**Supporting line (one breath):**  
They sound human, take real orders from your live menu, stream the cart to your kitchen screen, and **you only pay for successful orders**.

**Proof pillars (every chapter maps to one):**

1. **Human-like** — natural clarifications, modifiers, readback (transparent AI).
2. **Live menu truth** — scan/DB/agent share one source; no guessing prices.
3. **Kitchen-first** — draft + finalized ticket on KDS during the call.
4. **Success pricing** — value tied to completed orders, not chatter or missed trials.
5. **Human handoff** — catering, complaints, manager requests escalate.

**Tone:** Restaurant-owner language (“expo line,” “pickup,” “rush”) — no RLS/webhook/RPC on `/`.

**Honesty guardrails:** “20 minutes” = typical guided pilot setup, not guaranteed; pilot pricing custom until self-serve billing ships.

---

## Section order (target story spine)

Replace the current `landing-page.tsx` flow with scroll **chapters**. Nav anchors should match `#chapter-id`s.

| # | Chapter ID | Purpose | Reuse / net-new |
|---|------------|---------|-----------------|
| 0 | — | Floating story nav + CTAs (“See demo”, “Start with success pricing”) | Rebuild `landing-nav.tsx`, `marketing-shell.tsx` |
| 1 | `hero` | Core promise + cinematic visual (phone → order → KDS) | Rewrite hero block in `landing-page.tsx`; new hero scene component(s) under `preview/` or `components/landing/hero/` |
| 2 | `rush` | Missed call at peak hour (timeline: 6:42 PM) | **New** section + visual |
| 3 | `lost-revenue` | Static/demo calculator → ties to success pricing | **New** |
| 4 | `conversation` | Transcript: human-like, modifiers, confirm | Upgrade `voice-agent-preview.tsx`; **new** motion wrapper |
| 5 | `live-menu` | Scan → items/modifiers → agent uses DB | Upgrade `menu-scanner-preview.tsx` |
| 6 | `kitchen-ticket` | Cart live before hang-up | Upgrade `kds-feature-preview.tsx` / hero KDS |
| 7 | `success-pricing` | Pay for successful orders only | **New** (replace inline pricing on home) |
| 8 | `setup` | 20-min guided path (menu → voice → test → forward) | Rework existing `SETUP_FLOW` |
| 9 | `differentiators` | Bento: 6 pillars with mini visuals | **New**; may fold current four `FeatureRow`s |
| 10 | `contrast` | Not IVR / not chatbot / not static script | **New** copy-only or light visual |
| 11 | `handoff` | Edge cases → staff | Existing `handoff-visual.tsx`, story copy |
| 12 | `trust` | Plain-language security (no RLS on home) | Slimmer than today; link `/security` |
| 13 | `proof` | Pilot metric placeholders (no fake logos) | **New** |
| 14 | `hear-demo` | Audio cards or coming-soon → `/demo` | **New** |
| 15 | `close` | Footer story + CTA | `marketing-footer.tsx` |

**Remove or demote on `/`:** Full tier pricing grid (move detail to `/pricing`); technical security bullets (RLS, `roal1`).

**Satellite alignment (same promise, shallower scroll):**

- `/demo` — call simulation + conversation + KDS + success pricing teaser  
- `/pricing` — success-based framing + pilot caveat  
- `/security` — technical depth (keep RLS/tokens here)  
- `/contact` — “Show us your menu → missed-call recovery path”

---

## Motion concept

**Principles:** `transform` + `opacity` only; no layout shift; `prefers-reduced-motion` → static fallbacks; mobile: no horizontal pin unless tested.

**Toolkit:** `framer-motion` (already installed) + thin landing-only utilities (prompts 3–4: reveal, sticky chapter, counter, marquee, scroll progress).

| Beat | Motion |
|------|--------|
| Hero | Phone pulse; ticket slide-in; call→KDS path; scroll cue; CTA hover |
| Rush | Timeline scrub on scroll (time labels fade in) |
| Conversation | Staggered bubbles; optional waveform; active turn highlight |
| KDS | Draft enters → modifiers attach → status steps (illustrative) |
| Setup | Sticky progress + step cards reveal |
| Global | Chapter progress in nav; section `whileInView` stagger; optional pinned hero on desktop only |

**Existing:** `pulse-dot` / `pulse-ring` in `globals.css` — keep for “live” badges.

---

## Visual language

| Token | Current | Target |
|-------|---------|--------|
| **Palette** | Light cool gray + cyan accent | **Rush-hour dark** base (charcoal/navy) with **warm ticket** accents (amber/cream paper, kitchen heat) |
| **Type** | `font-display` serif + body sans | Larger hero scale; tighter chapter H2s; mono for times (“6:42 PM”) |
| **Surfaces** | `glass-card`, light borders | Ticket paper cards, subtle grain, stainless/grid at low opacity — **no** gradient orbs |
| **Product UI** | Faithful dashboard chrome in previews | Same UI language but framed as **scenes** (phone bezel, ticket stub, pass monitor) |
| **Texture** | `bg-grid` only | Add ticket edge, waveform strip, optional noise overlay (CSS, landing-scoped) |
| **Icons** | Inline SVG checks/shields | Prefer mini product crops over generic icon grids |

**CSS scope:** New landing tokens in `app/globals.css` (or `app/landing.css` imported only from marketing routes) so **dashboard tokens stay unchanged**.

---

## Files to change (exact list)

### Pages (routes + metadata)

| File | Change |
|------|--------|
| `app/page.tsx` | Metadata aligned to new headline; still passes `preview` |
| `app/pricing/page.tsx` | Success-pricing story, caveats |
| `app/demo/page.tsx` | Call simulation chapters, align with home |
| `app/security/page.tsx` | Plain-language lead; technical below fold |
| `app/contact/page.tsx` | Conversion story + pilot framing |

### Landing components (edit or add)

| File | Change |
|------|--------|
| `components/landing/landing-page.tsx` | **Major** — chapter order, copy, compose new sections |
| `components/landing/marketing-shell.tsx` | Story layout wrapper, optional progress slot |
| `components/landing/landing-nav.tsx` | Chapter nav, CTA labels |
| `components/landing/landing-cta.tsx` | “Success pricing” / demo primary-secondary pair |
| `components/landing/landing-section.tsx` | Chapter tones (rush dark, ticket warm) |
| `components/landing/marketing-footer.tsx` | Story close line + CTAs |
| `components/landing/marketing-page-hero.tsx` | Align typography with new tokens (satellite pages) |
| `components/landing/feature-row.tsx` | Deprecate or narrow; bento may replace |
| `components/landing/feature-visuals.tsx` | Wire upgraded previews |
| `components/landing/product-preview.tsx` | Hero scene entry point |

### Previews (upgrade visuals + motion hooks)

| File | Change |
|------|--------|
| `components/landing/preview/kds-hero-preview.tsx` | Hero scene / slimmer hero variant |
| `components/landing/preview/kds-feature-preview.tsx` | Scroll-driven status animation |
| `components/landing/preview/menu-scanner-preview.tsx` | Extraction rows, chips, review hints |
| `components/landing/preview/voice-agent-preview.tsx` | Conversation-first; less ElevenLabs chrome on `/` |
| `components/landing/preview/handoff-visual.tsx` | Edge-case stories |
| `components/landing/preview/phone-orders-preview.tsx` | Ticket styling |
| `components/landing/preview/menu-sidebar-preview.tsx` | Match new palette |
| `components/landing/preview/shared.tsx` | `PreviewFrame`, scene chrome |
| `components/landing/roal-mark.tsx` | Optional inverse mark for dark hero |

### New files (recommended)

| File | Purpose |
|------|---------|
| `components/landing/landing-motion.tsx` (or `lib/landing/motion.ts`) | Reveal, reduced-motion, scroll helpers |
| `components/landing/hero-scene.tsx` | Cinematic phone → KDS |
| `components/landing/chapters/rush-hour.tsx` | 6:42 PM timeline |
| `components/landing/chapters/lost-revenue.tsx` | Calculator teaser |
| `components/landing/chapters/success-pricing.tsx` | Pricing story + visual |
| `components/landing/chapters/differentiator-bento.tsx` | Six-tile grid |
| `components/landing/chapters/conversation.tsx` | Transcript + motion |
| `components/landing/chapters/social-proof.tsx` | Pilot metric placeholders |
| `components/landing/chapters/hear-demo.tsx` | Audio CTA / coming soon |
| `app/landing.css` | **Done** — scoped tokens under `.landing-story` |

### Data + styles

| File | Change |
|------|--------|
| `lib/landing-demo-data.ts` | Fixtures for transcript, calculator, bento |
| `lib/get-landing-preview.ts` | Only if live preview needs new fields |
| `app/globals.css` | Landing tokens, motion easing, ticket utilities |
| `package.json` | Only if adding motion deps beyond `framer-motion` |

### Docs (this file)

| File | Change |
|------|--------|
| `docs/LANDING_STORY_BLUEPRINT.md` | Update after implementation (prompt 39) |

**Out of scope (do not touch for landing rebuild):** `app/dashboard/**`, `supabase/**`, auth, Edge Functions, migrations, KDS production components.

---

## Implementation sequence (suggested)

1. Landing CSS tokens (dark rush palette) — dashboard untouched  
2. Motion primitives + reduced-motion  
3. Shell/nav + hero copy/scene  
4. Chapters 2–7 (story + previews)  
5. Demote home pricing → `/pricing` alignment  
6. Satellite pages + footer  
7. Mobile/a11y/perf QA per prompts 33–35  

---

## Success criteria

- [ ] Visitor understands **never miss a call** in &lt;5 seconds  
- [ ] Story feels like a **restaurant shift**, not generic AI SaaS  
- [ ] **Success pricing** visible on `/` and `/pricing` without unsupported savings claims  
- [ ] No RLS/jargon on `/`; technical trust on `/security`  
- [ ] Motion enhances scan path; reduced-motion passes  
- [ ] All CTAs route to `/signup`, `/demo`, `/contact`, or `/pricing` intentionally  

---

## Reference

- Build queue: `docs/landing-story-prompts.md` (prompts 2–40)  
- Research notes: competitor patterns in that file (SoundHound, VOIA, etc.)
