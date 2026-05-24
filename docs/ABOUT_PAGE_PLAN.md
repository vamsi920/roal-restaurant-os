# About Page Plan (`/about`)

**Prompt 46** — plan only. **Implementation:** prompts **47–50** in [`launch-ready-site-100-prompts.md`](./launch-ready-site-100-prompts.md).  
**Do not build** until prompt 47 unless explicitly requested.

---

## Goal

Ship `/about` as the canonical **“Who is ROAL?”** page for owners, press, and answer engines—without inventing a team roster or stock founder photos.

The page should explain:

1. **Mission** — help independents never lose pickup demand to a silent phone line.  
2. **Problem** — why restaurants miss calls (rush-hour collision, not bad staff).  
3. **Why ROAL exists** — voice + live menu + KDS + success-based pricing in one loop.  
4. **Values** — answer every guest, staff stay in control, charge only for successful orders.  
5. **Product promise** — what we do and do not claim.  
6. **CTA** — hear demo + book demo (mailto/contact).

Align with homepage glass/lavender theme (`public-theme`), shared nav/footer, and existing blog/pricing AEO language.

---

## Current state

| Item | Status |
|------|--------|
| Route `app/about/page.tsx` | **Missing** (404) |
| Nav | `PUBLIC_NAV_LINKS` includes **About** → `/about` |
| Footer | Company column links **About** → `/about` |
| Sitemap | **Not listed** — add in prompt 47 |
| Metadata / JSON-LD | **None** |

**Risk today:** dead nav/footer link hurts trust and crawl paths.

---

## Audience & tone

| Audience | Need from About |
|----------|-----------------|
| Independent owner | “Is this built for my size of restaurant?” |
| GM / ops lead | “Will my kitchen trust phone tickets?” |
| Answer engines | Entity: who ROAL is, what problem, what promise |
| Press / partner | One paragraph mission + contact path |

**Tone:** direct, operational, warm—not startup hype. No “family of brands,” no fake HQ map, no AI-slop superlatives.

**Hard rule:** **No fake team photos**, no invented founders, no LinkedIn headshots from stock. Visuals = typography, abstract motifs, product UI hints (KDS ticket, phone waveform), or optional logo/mark only.

---

## Page architecture (top → bottom)

| # | Section ID | Purpose | Visual |
|---|------------|---------|--------|
| 1 | `hero` | Mission one-liner + who we serve | Glass hero band, lavender wash (match `/pricing`, `/blog`) |
| 2 | `problem` | Why restaurants miss calls | Short prose + 3 bullets (rush, finite attention, pickup leaks) |
| 3 | `why-roal` | Why ROAL exists (gap in market) | 4-step loop: answer → live menu → ticket → success billing |
| 4 | `built-for` | “Built for independent restaurants” (prompt 48) | No personal bios; principles not people |
| 5 | `values` | 3 values (prompt 49) | 3 glass cards, icon or numeral—no faces |
| 6 | `promise` | Product promise + honest limits | Do / do-not two columns |
| 7 | `proof-links` | Link to blog + pricing (internal SEO) | Text links only |
| 8 | `cta` | Book demo + hear demo (prompt 50) | Glass CTA band, black pill + ghost |

**Length target:** ~600–900 words visible prose (scannable); not a long manifesto.

---

## Copy outline (draft for `lib/landing/about-page-copy.ts`)

### Hero

| Field | Draft |
|-------|--------|
| eyebrow | `About` |
| title | `We built ROAL so the phone line stops losing pickup orders.` |
| description | `ROAL is phone ordering for independent restaurants: answer every rush-hour ring with your live menu, ticket the kitchen while the guest is still on the line, and pay only when the order hits your pass—not per minute or per ring.` |

### Mission (can merge with hero or stand alone)

> **Mission:** Give every guest who calls the same clarity they would get from a trained host—without pulling your team off the floor during peak service.

### Why restaurants miss calls (`problem`)

**Thesis:** Missed calls are a **timing** problem, not a people problem.

Bullets:

- Call volume spikes when hosts, expo, and managers are already underwater.  
- Voicemail and “call back after rush” do not place tonight’s order.  
- Pickup callers move on fast—margin and loyalty leak to whoever answered.

**Internal link:** [Why restaurants miss calls during rush](/blog/why-restaurants-miss-calls-dinner-rush).

**Compliance:** No fabricated industry loss stats on About; point to blog worksheet for illustrative math.

### Why ROAL exists (`why-roal`)

**Thesis:** Owners need **coverage + menu truth + kitchen alignment + fair billing** in one product—not another phone tree or a chatbot trained on last year’s PDF.

| Step | Headline | Body (one line each) |
|------|----------|----------------------|
| 1 | Answer the line | First ring, natural conversation—not press 1. |
| 2 | Live menu | Same items, modifiers, and 86s the pass uses. |
| 3 | Ticket the pass | Name, phone, cart on the KDS before hang-up. |
| 4 | Bill for success | $0.90 per successful pickup (pilots)—not talk time. |

**Internal links:** [AI phone ordering](/blog/ai-phone-ordering-small-restaurants), [live menu](/blog/phone-agent-must-know-live-menu), [pricing](/pricing).

### Built for independents (`built-for`) — prompt 48

**No invented founder story.** Use company positioning:

- One or two locations, real modifiers, Friday rush that matters.  
- ROAL is not a call-center replacement for your brand—it is coverage when the dining room wins attention.  
- Product principles: **accuracy on the pass**, **honest automation**, **staff handoff when judgment beats AI**.

Optional single line: *“ROAL is built in the open with restaurant operators—we share menu scans and rush-hour metrics, not staged team photos.”*

### Values (`values`) — prompt 49

Three cards (fixed order):

| Value | Title | Body |
|-------|-------|------|
| 1 | Answer every guest | Pickup callers get a clear voice, live items, and confirmation—not hold music or voicemail roulette. |
| 2 | Keep staff in control | AI builds the routine cart; your team handles allergies, complaints, and exceptions with context on the KDS. |
| 3 | Charge only for success | You pay when a real guest confirms and the ticket finalizes—hang-ups and wrong numbers are not the unit on the bill. |

**Internal link:** [Paying only for successful orders](/blog/pay-only-successful-orders).

### Product promise (`promise`)

**We promise:**

- Answers grounded in your **live menu** and kitchen tickets you can cook.  
- **Disclosure** that the line is automated, with warm **handoff** to staff.  
- **Success-based** pilot terms in writing before live guest traffic.

**We do not promise:**

- Replacing in-person hospitality or every catering negotiation.  
- Zero mistakes without menu upkeep and test calls.  
- Fabricated ROI or national “average loss per restaurant” figures.

### CTA (`cta`) — prompt 50

| Action | Target | Label |
|--------|--------|-------|
| Primary | `/demo` | Hear a demo call |
| Secondary | `mailto:hello@getroal.com?subject=Book a ROAL demo` | Book a demo |
| Tertiary (ghost) | `/contact` | Contact & pilots |

Reuse `CONTACT_PILOT_EMAIL` from `contact-page-copy.ts`. Match `PRICING_CTA` / homepage patterns.

---

## Visual & layout spec

### Shell

| Choice | Recommendation |
|--------|----------------|
| Shell | `MarketingShell` + `public-theme` (same as `/pricing`, `/blog`, `/security`) |
| CSS | `app/public-theme.css` + optional `app/about-page.css` if needed (minimal) |
| Hero | `MarketingPageHero` or new `AboutPageHero` with glass band—not poster yellow |

### Imagery policy

| Allowed | Not allowed |
|---------|-------------|
| ROAL wordmark / abstract ring motif | Stock “founder” portraits |
| Small UI snippets (ticket card, waveform) | Fake team grid |
| Category icons (phone, KDS, checkmark) | “Our leadership” section |
| Lavender gradient washes | Map pin “headquarters” fiction |

### Layout patterns (reuse)

- `LandingSection` + `LandingHeader` for section titles  
- `glass-card` grids for values (3-col → 1-col mobile)  
- `public-btn-primary` / `public-btn-ghost` for CTA  
- Optional: single column “loop” diagram (CSS flex, no heavy illustration)

---

## SEO & AEO

### Metadata (`buildAboutPageMetadata()` — new in prompt 47)

| Field | Draft |
|-------|--------|
| title | `About ROAL — AI Phone Orders for Independent Restaurants` |
| description | `ROAL helps restaurants answer rush-hour pickup calls with a live-menu voice agent, kitchen tickets, and $0.90 per successful order—built for independents, not call centers.` |
| canonical | `/about` |
| OG type | `website` |

### Answer block (optional AEO strip below hero)

**Question:** What is ROAL?  
**Answer:** ROAL is a restaurant phone ordering product that answers pickup calls using your live menu, sends tickets to your kitchen display, and charges around successful orders—not per minute or per ring.

Mirror homepage FAQ entity style if JSON-LD added later (prompt 336).

### Sitemap & robots

- Add `{ url: origin + '/about', priority: 0.7, changeFrequency: 'monthly' }` to `app/sitemap.ts`.  
- `robots.ts` already allows `/` — no change needed.

### Internal links (outbound from About)

| Target | Anchor text idea |
|--------|------------------|
| `/blog/why-restaurants-miss-calls-dinner-rush` | Why calls go unanswered at rush |
| `/blog/pay-only-successful-orders` | Success-based pricing |
| `/pricing` | $0.90 per successful order |
| `/demo` | Hear a sample call |
| `/security` | Security & data handling |

---

## File map (implementation prompt 47)

| File | Action |
|------|--------|
| `app/about/page.tsx` | New route, `metadata`, `MarketingShell` |
| `lib/landing/about-page-copy.ts` | All strings + `ABOUT_VALUES`, `ABOUT_PROMISE`, SEO |
| `lib/landing/about-metadata.ts` or extend `metadata` pattern | `buildAboutPageMetadata()` |
| `components/landing/about/about-page-content.tsx` | Section assembly |
| `components/landing/about/about-values.tsx` | 3 value cards |
| `components/landing/about/about-cta.tsx` | CTA band (or reuse `PricingCta` pattern) |
| `app/sitemap.ts` | Add `/about` |
| `docs/PUBLIC_LAUNCH_PLAN.md` | Mark `/about` planned → shipped when done |

**Do not add** `team.tsx`, headshots, or `founder` copy modules.

---

## Acceptance criteria (prompt 47–50)

- [ ] `/about` returns 200; nav/footer link no longer 404  
- [ ] All six narrative blocks present (mission, missed calls, why ROAL, values, promise, CTA)  
- [ ] Three values exactly as specified (prompt 49)  
- [ ] No team photos or invented people  
- [ ] CTAs: `/demo` + mailto book demo + optional `/contact`  
- [ ] Theme matches glass public pages (not legacy poster-only)  
- [ ] Sitemap includes `/about`  
- [ ] Metadata title/description include entity + $0.90 + independents (honest pilot framing)  
- [ ] At least 2 internal links to blog/pricing  

---

## Prompt sequence

| Prompt | Work |
|--------|------|
| **46** (this doc) | Plan |
| **47** | Build page + copy module + sitemap |
| **48** | Company story section (built for independents—no personal details) |
| **49** | Values trio |
| **50** | CTA band + mailto book demo |

Prompts 48–50 can ship in one PR with 47 if copy module is structured upfront.

---

## Open decisions (defaults chosen)

| Question | Default for v1 |
|----------|----------------|
| Founder narrative? | **No** — product principles only |
| Org chart / team size? | **Omit** |
| Customer logos? | **Omit** unless real pilots approve |
| JSON-LD `Organization`? | Optional follow-up; include `url`, `description`, `contactPoint` email |
| Same shell as homepage? | **MarketingShell** until full-site shell merge per `PUBLIC_LAUNCH_PLAN` |

---

## Reference copy sources (keep consistent)

| Source | Use for |
|--------|---------|
| `HOME_HERO`, `HOME_PRICING_PILL` | Mission + $0.90 |
| `LANDING_FOOTER.tagline` | Entity one-liner |
| Blog #1, #6, #2 | Missed calls, pricing, AI ordering |
| `SECURITY_PAGE_COPY` | Tone for honesty / limits |
| `CONTACT_PILOT_EMAIL` | Mailto CTA |
