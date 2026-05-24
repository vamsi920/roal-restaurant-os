# Homepage “How it works” scroll flow plan

**Date:** 2026-05-22  
**Status:** Plan only (step 17) — no implementation  
**Implements:** Steps 18–19 of `docs/launch-ready-site-100-prompts.md`  
**Anchor:** `#how` (keep for nav `/#how`)

---

## Goal

Replace the three static glass cards in `HomeHowItWorks` with a **short cinematic scroll story**—four beats owners can skim in one pass:

1. **Scan menu** — printed menu → live digital menu  
2. **Connect line** — restaurant phone line routes to ROAL  
3. **AI answers** — guest hears a natural voice; order builds  
4. **Ticket lands** — ticket appears on the kitchen display  

**Constraints**

- Same homepage theme: `landing-home.css`, glass panels, lavender wash, black CTAs—no poster/lime, no GSAP chapter rail.  
- **Do not** grow page length like the old 17-chapter story (`docs/LANDING_STORY_BLUEPRINT.md`). Target **one viewport-ish** section on desktop (~min 70vh, max ~95vh), not four full screens.  
- Layman copy; no RLS/ElevenLabs jargon on the section face.  
- `prefers-reduced-motion`: full static fallback (four steps visible without scroll choreography).

---

## Current state

| Item | Detail |
|------|--------|
| Component | `components/landing/home/sections/home-how-it-works.tsx` |
| Layout | `home-card-grid` — 3 equal cards |
| Steps today | 1 Add menu · 2 Connect line · 3 Take orders |
| CSS | `home-card`, `home-glass-panel`, `home-step-num` |
| Nav | Primary link `/#how` |

**Gap:** No visual continuity between steps; beat 3 (AI on the call) is implied, not shown.

---

## Recommended pattern: sticky stage + scrolling steps

Best balance of “cinematic” feel, mobile usability, and implementation cost.

```text
┌─────────────────────────────────────────────┐
│  Eyebrow: How it works                      │
│  H2: From menu photo to kitchen ticket      │
├──────────────────┬──────────────────────────┤
│  STICKY STAGE    │  SCROLL STEPS (4)        │
│  (one visual)    │  1 Scan menu   ○ active  │
│  swaps per step  │  2 Connect line          │
│                  │  3 AI answers            │
│                  │  4 Ticket lands        │
└──────────────────┴──────────────────────────┘
```

### Desktop (≥900px)

- **Left (~45%):** `position: sticky; top: …` glass **stage** panel—single “scene” that cross-fades or slides between four lightweight visuals.  
- **Right (~55%):** Vertical stack of four **step chips**; Intersection Observer (or CSS `scroll-driven` if acceptable) sets `.is-active` on the step in view → updates stage visual + progress dots.  
- Section height ≈ `max(72vh, 4 × 5.5rem)` so each step gets scroll room without four full screens.

### Mobile (<900px)

- **No sticky** (avoids jitter + keyboard/toolbar issues).  
- **Stacked:** step row (number + title + one line) → compact visual under it → next step.  
- Optional horizontal **progress dots** fixed under section title.  
- Total height ≈ 4 × (copy block + 12rem visual)—still scannable, not a movie.

### Reduced motion

- Disable cross-fade / parallax.  
- Render **2×2 grid** or vertical list: all four steps + four small static thumbnails visible at once (reuse final frame per beat).

---

## Beat spec (copy + visual)

| # | `id` | Title (owner-facing) | One-line body | Visual (illustrative) |
|---|------|----------------------|---------------|------------------------|
| 1 | `scan-menu` | Scan your menu | Snap your printed menu—we turn it into items you can edit. | Menu scan preview card (reuse `build-menu-scan-preview` or static illustration) |
| 2 | `connect-line` | Connect your line | Forward calls—or use a dedicated line—when the dining room is slammed. | Phone → ROAL line diagram (simple SVG, no carrier logos) |
| 3 | `ai-answers` | AI answers the call | A natural voice takes the order from your **live** menu—not a generic script. | Compact conversation waveform / 2-line transcript chip (demo-safe sample from `lib/landing/agent-conversation-demo` or static) |
| 4 | `ticket-lands` | Ticket hits the kitchen | Name, phone, and items show on your KDS—same as a staff-entered order. | Kitchen ticket preview (reuse `build-kitchen-ticket-preview` or `getLandingPreview` snapshot) |

**Section header (proposed)**

- Eyebrow: `How it works` (unchanged)  
- H2: `From menu photo to kitchen ticket`  
- Lead (optional, one line): `Four steps most pilots complete before taking live guest calls.`

---

## Motion design (step 19 preview)

| Effect | Allowed | Avoid |
|--------|---------|--------|
| Stage cross-fade | `opacity` 200–320ms | Layout-thrashing height animations |
| Step enter | `opacity` + `translateY(8px)` on active | Scroll-jacking full page |
| Ticket beat | Subtle `translateY` on ticket card once when step 4 active | Infinite loops |
| Progress | Dot scale / fill | Auto-scroll user without consent |

**Libraries:** Prefer **CSS + Intersection Observer** in a small client component (`HomeHowFlow.tsx`). No GSAP for v1 unless bundle/perf review says otherwise.

---

## Data & reuse (no new backend)

| Beat | Source in repo |
|------|----------------|
| Scan menu | `lib/landing/build-menu-scan-preview.ts`, `components/landing/preview/menu-scanner-preview.tsx` (simplify for stage) |
| Connect line | New minimal SVG in `components/landing/home/how-flow/` |
| AI answers | `lib/landing/agent-conversation-demo.ts` — trim to 2 turns; or static text only |
| Ticket lands | `lib/landing/build-kitchen-ticket-preview.ts`, `lib/get-landing-preview.ts` (optional server snapshot—only if homepage already async; else static) |

**Rule:** All visuals are **labeled illustrative** where data is sample/demo.

---

## Planned file layout (steps 18–19)

```text
lib/landing/home-how-flow-copy.ts       # beats, titles, bodies
components/landing/home/how-flow/
  home-how-flow.tsx                     # client: observer + stage
  how-flow-stage.tsx                    # swaps visual by activeBeat
  how-flow-scan-visual.tsx
  how-flow-line-visual.tsx
  how-flow-call-visual.tsx
  how-flow-ticket-visual.tsx
components/landing/home/sections/
  home-how-it-works.tsx                 # thin wrapper → <HomeHowFlow />
app/landing-home.css                    # .home-how-flow*, sticky, reduced-motion
```

Remove or deprecate inline `STEPS` array in `home-how-it-works.tsx`.

---

## Accessibility

- Section `aria-labelledby="how-heading"` preserved.  
- Each step: `aria-current="step"` on active item; list semantics (`<ol>`).  
- Stage: `aria-live="polite"` when beat changes (short announcement: “Step 3: AI answers the call”).  
- Keyboard: steps are not focus traps; visuals decorative (`aria-hidden` on stage if redundant text exists).  
- Focus order: title → steps (if links) → optional “See demo” link to `/demo`.

---

## SEO / page weight

- No change to `#how` URL.  
- Copy stays in HTML (not canvas-only).  
- Client JS limited to one section island; homepage remains mostly static.  
- Do not add scroll-linked URL hash per step (keeps nav simple).

---

## What we are not doing

- Full-screen pinned storytelling per beat  
- Video in the stage (hero already has video)  
- Replacing homepage shell or nav  
- Dashboard/KDS live data in the scroll flow  
- Auto-playing voice audio

---

## Implementation checklist (for steps 18–19)

### Step 18 — Build

- [ ] Add `home-how-flow-copy.ts` with four beats  
- [ ] Implement `HomeHowFlow` sticky + step list (desktop) / stacked (mobile)  
- [ ] Wire four visuals (reuse preview builders where possible)  
- [ ] Replace card grid in `HomeHowItWorks`  
- [ ] CSS: glass stage, active step styles, section height budget  

### Step 19 — Motion

- [ ] Intersection Observer → `activeBeat` state  
- [ ] Stage transition (opacity)  
- [ ] Ticket micro-settle on beat 4  
- [ ] `prefers-reduced-motion` static layout  
- [ ] Quick pass: 375px width, no overflow, reduced-motion screenshot  

---

## Success criteria

1. Owner understands **menu → line → call → ticket** without reading dashboard docs.  
2. Section feels **premium** (glass stage, calm motion) and matches hero/footer.  
3. Mobile scroll is **obvious**; no sticky bugs.  
4. Reduced-motion users see **all four steps** without hunting.  
5. Page length grows by **≤ ~1 mobile screen** vs current three cards.

---

## Related docs

- `docs/PUBLIC_LAUNCH_PLAN.md` — homepage section audit  
- `docs/launch-ready-site-100-prompts.md` — prompts 17–19  
- `docs/LANDING_STORY_BLUEPRINT.md` — historical; do not revive full chapter scroll
