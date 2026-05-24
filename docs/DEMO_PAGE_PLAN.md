# Demo Page Plan (`/demo`)

**Prompt 51** — audit + target design. **Implementation:** prompts **52–56** in [`launch-ready-site-100-prompts.md`](./launch-ready-site-100-prompts.md).  
**Do not build** until prompt 52+ unless requested.

---

## Goal

Make `/demo` the canonical **“hear / see the agent”** page for cold traffic from home, blog, and about—structured as **one focused scroll** (not a mini-site of poster chapters).

Target experience:

1. **Video placeholder** up top (future recording slot).  
2. **3-step call flow** + **sample transcript** + **sample kitchen ticket**.  
3. **Bottom CTA:** **Book a demo call** (`mailto:hello@getroal.com`) then **Sign up** immediately after.

Align with **glass / lavender `public-theme`** (like `/pricing`, `/about`, `/blog`)—retire yellow/lime poster beat cards on this route.

---

## Current state audit

### Route & shell

| Item | Today |
|------|--------|
| Route | `app/demo/page.tsx` |
| Shell | `MarketingShell` + `landing-poster-flow` wrapper |
| Data | `getLandingPreview()` → menu scan + KDS (live or sample) |
| Hero CTA | `LandingCta` → primary `/demo` (self-loop), secondary `/signup` |

### Metadata

```text
title: Demo — ROAL
description: Sample call flow, conversation, menu and kitchen preview…
```

| Gap | Note |
|-----|------|
| No “AI phone demo” keywords | Weak for SEO/AEO |
| No canonical / OG / Twitter | Same gap as other marketing pages before `build*Metadata` pattern |
| No FAQ / answer block | Optional in prompt 56 |

### Page sections (top → bottom today)

| # | Section | Component | Theme / notes |
|---|---------|-----------|----------------|
| 0 | Hero | `MarketingPageHero` + `LandingCta` | Generic; **primary links to self** |
| 1 | Call flow | `DemoCallSimulation` | 3 steps — **poster** `landing-beat-card--yellow/lime/cream` |
| 2 | Conversation | `DemoConversationSection` | Sample transcript |
| 3 | Menu + KDS | `MenuScanVisual` + `KdsVisual` | Two-column; useful but **long** for “one-page demo” |
| 4 | Success pricing | `PayInvoiceVisual` | Duplicates `/pricing` story |
| 5 | Close | `LandingPosterReveal` + `LandingCta` | Sign up framing; **no mailto book demo** |

### Reusable assets (keep / trim)

| Asset | Path | Recommendation |
|-------|------|----------------|
| 3-step steps | `demo-call-simulation.tsx` | **Keep** — restyle to glass cards |
| Transcript | `demo-conversation-section.tsx` | **Keep** — move below video |
| KDS ticket | `KdsVisual` + `getLandingPreview()` | **Keep** — hero ticket; drop or shrink menu scan column |
| Menu scan | `MenuScanVisual` | **Optional** — link to `/signup` or one line in copy |
| Pay invoice | `PayInvoiceVisual` | **Remove from demo** — link to `/pricing` in footer CTA copy only |
| Poster reveal | `LandingPosterReveal` | **Replace** with `DemoCtaBand` (mailto + signup) |

### Gaps vs launch prompts (51–56)

| Requirement | Status |
|-------------|--------|
| Video placeholder | **Missing** |
| One-page narrative (video → flow → transcript → ticket → CTA) | **Partial** — 5 sections + pricing detour |
| Bottom mailto **Book a demo call** + **Sign up** | **Missing** — uses generic `LandingCta` |
| Glass/lavender theme | **Gap** — `landing-poster-flow`, beat cards |
| SEO for “restaurant AI phone demo” | **Weak** |

### Relationship to `/contact`

| Page | Role |
|------|------|
| `/demo` | Self-serve **see** the product (video, transcript, ticket) |
| `/contact` | **Talk to us** (form preview, pilot details) |

Do not duplicate long forms on `/demo`. One line: “Prefer a form? [Contact](/contact).”

---

## Target information architecture (one page)

Single scroll, ~4 content blocks + hero + footer CTA band:

```text
┌─────────────────────────────────────┐
│ Hero (short)                         │
├─────────────────────────────────────┤
│ VIDEO PLACEHOLDER (16:9, glass)      │  ← prompt 52
├─────────────────────────────────────┤
│ 3-step: Ring → Answer → Ticket       │  ← prompt 53 (existing data)
├─────────────────────────────────────┤
│ Sample transcript (compact)          │
├─────────────────────────────────────┤
│ Sample kitchen ticket (KDS)          │
├─────────────────────────────────────┤
│ CTA band: mailto Book demo → Sign up │  ← prompt 54
└─────────────────────────────────────┘
```

**Remove from `/demo` v1:** dedicated success-pricing section (link `/pricing` instead).

**Hero CTA change:** Do not primary-link to `/demo`. Use **scroll to video** (`#demo-video`) or **Sign up** secondary only.

---

## Video placeholder spec (prompt 52)

| Property | Spec |
|----------|------|
| Placement | First major block below hero (or hero adjacent on desktop) |
| Aspect | `16 / 9`, max-width ~960px, centered |
| Label | `Demo video coming soon` (subtitle: future recording of a real pickup call) |
| State | Non-interactive; no fake play button that 404s |
| a11y | `role="img"` or `aria-label="Demo video placeholder"` |
| Visual | Glass frame, lavender border, subtle grid or waveform motif—**not** black box |
| Future | Swap `<div placeholder>` for `<video>` or embed without layout shift |

Optional: poster image slot `public/demo-poster.jpg` later—v1 text-only is fine.

---

## Copy outline (`lib/landing/demo-page-copy.ts` — extend)

### Hero (revised)

| Field | Draft |
|-------|--------|
| eyebrow | `Demo` |
| title | `See a rush-hour pickup call` |
| description | `Watch the flow we are recording for this page—then read the sample transcript and the ticket that hits your kitchen display.` |

### Video (`video`)

| Field | Draft |
|-------|--------|
| titleId | `demo-video-heading` |
| eyebrow | `Video` |
| title | `Demo recording` |
| placeholderTitle | `Demo video coming soon` |
| placeholderDetail | `We are filming a real pickup call with menu modifiers and a live ticket on the pass. This space will hold that recording.` |

### Call flow (keep, tighten)

Reuse `callSimulation` copy; steps unchanged in meaning.

### Transcript (keep)

Reuse `conversation` block.

### Kitchen ticket (`ticket` — rename from menuKds)

| Field | Draft |
|-------|--------|
| title | `Sample kitchen ticket` |
| description | `Same cart the agent built—what expo sees on the KDS.` |
| liveNote / sampleNote | Keep current preview logic |

### Bottom CTA (`close` + `DEMO_CTA`)

```ts
export const DEMO_CTA = {
  bookDemo: {
    href: `mailto:${CONTACT_PILOT_EMAIL}?subject=Book a ROAL demo call&body=...`,
    label: "Book a demo call",
  },
  signup: { href: "/signup", label: "Sign up" },
} as const;
```

| Field | Draft |
|-------|--------|
| title | `Ready to try it on your menu?` |
| description | `Book a walkthrough or start setup—scan your menu and place a test call before your next rush.` |
| order | **Book demo (mailto) first**, **Sign up** second (prompt 54) |

---

## Visual & theme (prompt 55)

| Choice | Action |
|--------|--------|
| Remove | `landing-poster-flow` wrapper on `/demo` |
| Remove | `landing-beat-card--yellow/lime/cream` on demo steps |
| Add | `app/demo-page.css` or `public-theme` `.public-demo-*` rules |
| Reuse | `glass-card`, `MarketingPageHero`, `landing-cta-band` ink close |
| Components | `DemoVideoPlaceholder`, `DemoCtaBand` (mirror `AboutCtaBand`) |

### 3-step cards (glass)

- Three equal cards in a row (1 col mobile).  
- Icon: phone → wave → ticket (simple SVG, no poster glyphs).  
- Times optional (6:44 PM) in mono muted text.

---

## SEO & metadata (prompt 56)

### `buildDemoPageMetadata()`

| Field | Draft |
|-------|--------|
| title | `Restaurant AI Phone Demo — Sample Call & KDS Ticket | ROAL` |
| description | `See how ROAL answers a rush-hour pickup call: demo video (coming soon), 3-step flow, sample transcript, and kitchen ticket preview.` |
| canonical | `/demo` |

### Optional AEO block

**Q:** How can I hear ROAL’s restaurant phone agent?  
**A:** Visit `/demo` for the sample call flow and transcript; book a live walkthrough via email or sign up to run a test call on your menu.

### Sitemap

- Already lists `/demo` — no change.

---

## File map (implementation)

| File | Action |
|------|--------|
| `app/demo/page.tsx` | Drop `landing-poster-flow`; add metadata builder; optional `#demo-video` hero link |
| `lib/landing/demo-page-copy.ts` | Add `video`, `DEMO_CTA`, revise `close` |
| `lib/landing/demo-metadata.ts` | New |
| `components/landing/demo/demo-video-placeholder.tsx` | **New** |
| `components/landing/demo/demo-page-content.tsx` | Reorder sections; remove pricing section |
| `components/landing/demo/demo-call-simulation.tsx` | Glass step cards |
| `components/landing/demo/demo-cta-band.tsx` | **New** — mailto + signup |
| `app/public-theme.css` or `app/demo-page.css` | Demo-specific styles |

---

## Acceptance criteria

- [ ] One clear video placeholder labeled “coming soon”  
- [ ] 3-step flow visible without scrolling past unrelated pricing chapter  
- [ ] Sample transcript + KDS ticket still present  
- [ ] Bottom: **Book a demo call** (mailto) then **Sign up** (adjacent, same band)  
- [ ] No yellow/lime poster beat cards on `/demo`  
- [ ] Hero does not CTA-loop to `/demo`  
- [ ] Metadata + canonical (+ OG when `NEXT_PUBLIC_APP_URL` set)  
- [ ] Mobile: no horizontal overflow; video box scales down  

---

## Prompt mapping

| Prompt | Deliverable |
|--------|-------------|
| **51** | This plan |
| **52** | `DemoVideoPlaceholder` component |
| **53** | Refactor `DemoPageContent` IA (one-page order) |
| **54** | `DemoCtaBand` mailto + signup |
| **55** | Glass theme CSS |
| **56** | `buildDemoPageMetadata()` + optional AEO |

Prompts 52–56 can ship in one PR.

---

## Open decisions (defaults)

| Question | Default |
|----------|---------|
| Embed YouTube later? | Placeholder only v1; same 16:9 container |
| Audio-only demo? | Video slot can host `<audio>` later—same frame |
| Live preview required? | Keep `getLandingPreview()` for KDS; fallback sample data OK |
| Keep menu scan visual? | **No** on demo page v1—reduces scroll; mention in signup CTA |
| Primary conversion | **Sign up** for self-serve; **mailto** for high-touch pilots |

---

## Reference links (internal)

| From `/demo` | To |
|--------------|-----|
| CTA secondary context | `/pricing` (one line in close copy) |
| Pilot form | `/contact` |
| Blog | `/blog/ai-phone-ordering-small-restaurants` |

---

## Current vs target (summary)

| | Today | Target |
|--|--------|--------|
| Sections | 5 + hero | 4 + hero + video |
| Video | None | Placeholder |
| Bottom CTA | LandingCta (demo + signup) | mailto book + signup |
| Theme | Poster beats | Public glass |
| Pricing on page | Full section | Link only |
