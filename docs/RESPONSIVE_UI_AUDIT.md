# Responsive UI Audit (Prompt 01)

**Date:** 2026-05-27  
**Scope:** All user-facing routes and primary UI shells/components across phone (320–479px), large phone (390–767px), tablet/iPad (768–1023px), laptop (1024–1439px), and desktop (1440px+).  
**Constraints:** Audit only — no product code changes in this prompt. Preserve auth, tenant isolation, Supabase realtime, menu import, ElevenLabs, billing, and analytics behavior.  
**Follow-on:** Prompts 02–40 in `docs/responsive-ui-qa-40-prompts.md`.

---

## Methodology

- Mapped App Router `page.tsx` files and traced layout shells (`public-theme`, `landing-home`, `auth-page`, `dashboard-theme`, `kds-workspace`).
- Reviewed responsive CSS (`@media`, `clamp`, `min-w-0`, `overflow-x`, `safe-area`, `touch-action`, `prefers-reduced-motion`) in global and feature stylesheets.
- Cross-checked existing QA tests (`mobile-visual-qa`, `desktop-visual-qa`, `dashboard-mobile`, `real-data-discipline-qa`, `kds-workspace-qa`, `public-accessibility-qa`) for enforced patterns vs. gaps.
- Flagged risks where **layout**, **touch targets**, **sticky/fixed stacking**, **horizontal scroll**, **typography density**, or **real-data discipline** may fail on target viewports.

**Severity key:** P0 = blocks use on phone; P1 = significant friction; P2 = polish / tablet-desktop only.

---

## Responsive QA checklist (Prompt 04)

Use this section for prompts **05–38** (spot-check after each area) and **39–40** (full rendered pass). Test in a real browser or Cursor browser tools. Record **Pass**, **Fail**, or **N/A** per row; note viewport and route on failures.

### Required viewports

| Profile | Size (CSS px) | Represents | Priority |
|---------|---------------|------------|----------|
| Small phone | **320 × 700** | iPhone SE / narrow Android | P0 |
| Large phone | **390 × 844** | iPhone 14 / common portrait | P0 |
| Tablet portrait | **768 × 1024** | iPad portrait | P1 |
| Tablet landscape / small laptop | **1024 × 768** | iPad landscape, small window | P1 |
| Desktop | **1440 × 900** | Laptop / external monitor | P2 |

Also spot-check **479px** and **639px** widths when debugging breakpoints tied to `public-mobile-pages.css`, `auth-page.css`, or `kds-workspace.css`.

**Environment:** `prefers-reduced-motion: reduce` on one public page and one dashboard page. Safari iOS safe-area (notch) on at least one authenticated restaurant route.

### Pages to inspect

**Public (unauthenticated)**

| Page | Route | Focus |
|------|-------|--------|
| Home | `/` | Hero video + glass surface, nav drawer, how-it-works, FAQ, footer |
| Pricing | `/pricing` | Primary card, order explainer, FAQ, CTAs |
| About | `/about` | Narrative scan length, CTAs |
| Blog index | `/blog` | Cards, filters, featured post |
| Blog article | `/blog/[slug]` | Title wrap, prose, code blocks, related posts |
| Demo | `/demo` | Video placeholder, demo proof (labeled demo data only) |
| Contact | `/contact` | Form/mailto, hero, two-column stack |
| Legal | `/privacy`, `/terms`, `/security` | Readable measure, sticky nav vs anchors |
| Auth | `/login`, `/signup`, `/reset-password` | Form-first on phone, errors, focus |

**Authenticated (real tenant data only — no fabricated orders/restaurants)**

| Page | Route | Focus |
|------|-------|--------|
| Locations | `/dashboard/restaurants` | Card grid, empty/error, create modal |
| Live orders / KDS | `/dashboard/restaurants/[id]` | Tabs, cards, realtime banner, order modal |
| Menu setup | `/dashboard/restaurants/[id]/menu` | Scanner, live menu, editor, import history |
| Live agent | `/dashboard/restaurants/[id]/agent` | Status, connect/resync, diagnostics collapsed on phone |
| Analytics | `/dashboard/analytics`, `…/analytics` | Stat cards, chart scroll, by-location table/cards |
| Billing | `/dashboard/billing`, `…/billing` | Plan panel, usage meters, tables |
| Onboarding | `/dashboard/onboarding` | Wizard steps, forms |
| Settings | `/dashboard/settings`, `…/notifications` | Forms, delivery log |
| Support | `/dashboard/support` | Support cards |
| Admin | `/dashboard/admin` | Ops tables (platform admin only) |

### Interactions to test

**Global**

- [ ] No horizontal page scroll (`overflow-x`) on body at any viewport
- [ ] Primary buttons and nav controls ≥ 44px tap height where interactive
- [ ] `:focus-visible` ring visible on Tab through links, buttons, inputs
- [ ] Skip link reaches main content (dashboard + auth)

**Public**

- [ ] Marketing nav: open/close mobile drawer; backdrop dismiss; no trapped scroll
- [ ] Hero CTAs and pricing pill tappable; headline readable on video/gradient
- [ ] FAQ accordions expand without layout jump breaking neighbors
- [ ] Footer links and CTAs usable on 320px

**Auth**

- [ ] Login/signup: submit, validation error, forgot-password flow
- [ ] Reset password: new password fields and success state
- [ ] Virtual keyboard does not permanently hide primary submit (scroll into view)

**Dashboard shell**

- [ ] Mobile sidebar open/close; main content `inert` when open; sign out works
- [ ] Sticky header does not cover focused inputs or modal tops

**Restaurant workspace**

- [ ] Bottom rail (phone): all five destinations, active state, safe-area inset
- [ ] Back to locations from orders and menu
- [ ] KDS: status tabs scroll if needed; order card actions; open/close order detail modal
- [ ] Menu: upload/review flow; category/item edit without sideways page scroll
- [ ] Agent: connect/resync disabled states; expand diagnostics only if needed
- [ ] Realtime: degraded/reconnect copy shows when applicable (not fake “live” badges)

### Pass/fail criteria

**Pass** when all of the following hold on the tested viewport(s):

1. **Layout** — No unintended horizontal scroll; no overlapping sticky headers, bottom rail, or modals; long names/URLs wrap or truncate without breaking grids.
2. **Typography** — Body and headings use token scale (`typography.css`); no clipped or unreadable text; hero/pricing copy scannable on 320px.
3. **Touch** — Primary actions reachable with thumb; adequate spacing between destructive and primary actions on order cards.
4. **Accessibility** — Visible focus; dialogs have dismiss; status/errors announced (`role="alert"` / `aria-live` where implemented).
5. **Real data** — Authenticated views show empty/loading/error from real APIs, or real rows from Supabase; no demo transcript/menu data in dashboard; public demo pages clearly labeled.
6. **Motion** — With `prefers-reduced-motion: reduce`, no essential information hidden; video/animations respect reduced motion on home.

**Fail** if any P0 viewport blocks task completion (e.g. cannot submit auth form, cannot read order card, cannot reach menu save). **Fail** also for fake operational data in dashboard, tenant leakage, or broken realtime/status misrepresentation.

**Defer (P2)** — Minor whitespace on desktop-only, non-blocking chart micro-scroll, copy length on ultra-wide screens.

### Recording results (prompts 39–40)

At end of **39** (public) and **40** (authenticated), append a subsection below:

```markdown
### Rendered QA — [date]
- Viewports run: …
- Public: Pass | Fail (notes)
- Authenticated: Pass | Fail (notes)
- Blockers: …
```

---

## Route inventory

| Route | Entry / shell | Primary components |
|-------|---------------|-------------------|
| `/` | `app/page.tsx` → `LandingPage` | `LandingHomeShell`, `LandingHomeHero`, `HomeProductIntro`, `HomeCapabilitiesStrip`, `HomeHowItWorks`, `HomePay`, `HomeFaq`, `HomeCtaBand`, `PublicFooter` |
| `/pricing` | `app/pricing/page.tsx` | `PricingPageContent`, `PricingPrimaryCard`, `PricingOrderExplainer`, `PublicMarketingNav` |
| `/about` | `app/about/page.tsx` | `AboutPageContent` |
| `/blog` | `app/blog/page.tsx` | Blog index hero, cards, filters (`blog-theme.css`) |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | `BlogArticleLayout`, FAQ, related posts, CTA |
| `/demo` | `app/demo/page.tsx` | `DemoPageContent`, `DemoProofSection` (demo transcript data) |
| `/contact` | `app/contact/page.tsx` | `ContactPageContent`, `ContactPilotForm` (`contact-page.css`) |
| `/privacy`, `/terms`, `/security` | legal pages | `LegalPageContent` / `SecurityPageContent` |
| `/login`, `/signup` | `(auth)/layout.tsx` | `LoginPageEntry` / signup entry, `AuthForm`, value asides |
| `/reset-password` | `(auth)/reset-password/page.tsx` | `ResetPasswordForm` |
| `/dashboard` | redirects → restaurants | — |
| `/dashboard/restaurants` | list | `restaurants/page.tsx`, realtime cards, `CreateRestaurantButton` modal |
| `/dashboard/restaurants/[id]` | KDS | `RestaurantWorkspaceRail`, `LiveOrdersPanel`, `KitchenOrderCard`, `OrderDetailModal`, `CallStatusStrip` |
| `/dashboard/restaurants/[id]/menu` | menu setup | `MenuSetupWorkspace`, `MenuScanner`, `LiveMenuSidebar`, `MenuEditor`, import history |
| `/dashboard/restaurants/[id]/agent` | live agent | `VoiceAgentPanel` (embedded), `VoiceAgentTestHarness` |
| `/dashboard/restaurants/[id]/analytics` | scoped analytics | `AnalyticsDashboard` |
| `/dashboard/restaurants/[id]/billing` | scoped billing | `BillingDashboard` |
| `/dashboard/analytics` | org analytics | `AnalyticsDashboard` |
| `/dashboard/billing` | org billing | `BillingDashboard` |
| `/dashboard/onboarding` | wizard | `OnboardingWizard` |
| `/dashboard/settings` | account | settings forms |
| `/dashboard/settings/notifications` | delivery log | `NotificationSettingsForm`, `NotificationDeliveryLog` |
| `/dashboard/support` | support hub | `SupportHub` |
| `/dashboard/admin` | platform ops | `AdminOpsDashboard` |

**Layouts:** `app/layout.tsx` (global), `app/(auth)/layout.tsx`, `app/dashboard/layout.tsx` (`AppShell`).

---

## Breakpoint baseline (current)

| Token / file | Typical breakpoints |
|--------------|---------------------|
| `app/globals.css` | `overflow-x: clip` on root |
| `app/public-theme.css` | 380, 479, 520, 639, 768, 900, 960px |
| `app/landing-home.css` | 479, 767, 900px+ desktop how-flow |
| `app/public-mobile-pages.css` | 479, 767px public page overrides |
| `app/auth-page.css` | 479px auth stack |
| `app/dashboard-theme.css` | 767px card tables, touch targets in main |
| `app/dashboard/.../kds-workspace.css` | 639 mobile workspace, 640/1024 KDS |
| Tailwind in components | `sm` 640, `lg` 1024 common |

**Gap:** No single documented viewport checklist in-repo before this audit (added in Prompt 04).

---

## Real-data discipline

| Surface | Data source | Responsive audit note |
|---------|-------------|------------------------|
| Restaurants list | Supabase `restaurants` + realtime | Empty/error/loading states exist; no seeded arrays in page |
| KDS / orders | `draft_orders`, `phone_order_receipts` + realtime | Cards/modal use live rows; degraded realtime UI |
| Menu / sidebar | `loadRestaurantMenu` + menu table realtime | Scanner uses real APIs |
| Live agent | `VoiceAgentControlCenterSnapshot` | Status from server; harness creates test drafts (labeled) |
| Analytics / billing | `loadOrganizationAnalytics` / `loadOrganizationBilling` | Empty states when no activity; org table uses `dashboard-table` |
| Public `/demo` | `landing-demo-data` / transcript previews | **Intentional demo** — must stay off dashboard imports |
| Marketing previews | `menu-scanner-preview`, `demo-proof-section` | Labeled demo; not authenticated data |

**Rule for later prompts:** Do not add fake restaurants, orders, calls, or analytics in authenticated UI. Public demo copy is acceptable when labeled.

---

## Cross-cutting foundations

| Area | Current state | Risk | Planned fix (prompt) |
|------|---------------|------|----------------------|
| Root overflow | `globals.css` + public/dashboard clip; **Prompt 02** added `body` clip + canvas `min-width: 0` | Residual `100vw` / negative margin bleed on some marketing grids | **05+** — page-level grids |
| Touch targets | **Prompt 02** `--tap-target-min` on globals + public nav/buttons ≤1023px; dashboard/KDS unchanged | Dense harness controls on phone | **35** |
| Focus visibility | **Prompt 02** select/textarea/summary focus in globals + dashboard; auth submit/forgot | Dashboard stacked table focus order | **19** |
| Reduced motion | **Prompt 02** globals animations off; public + auth + shell sidebar | How-flow desktop stage; video opacity | **07**, **09** |
| Safe area | **Prompt 02** auth main + dashboard main padding-bottom; existing header/rail | Double sticky headers on restaurant mobile | **22** |
| `dashboard-table` | Card layout ≤767px in `dashboard-theme.css` | Tables with `lg:min-w-[640px]` still force scroll if wrapper escapes card rules (analytics by-location) | **36** |
| Mobile nav focus trap | Public drawer: backdrop + dialog; app shell: `inert` on main | Public drawer: no explicit focus trap (backdrop `tabIndex={-1}` only) | **05**, **19** |
| Typography tokens | **Prompt 03** `caption`/`micro`/`eyebrow` tokens; hero `clamp()` scale | Hero pricing pill crowding on 320px | **06** |

---

## Public marketing

### `/` (landing home)

**Files:** `landing-page.tsx`, `landing-home.css`, `landing-home-hero.tsx`, `home-how-flow.tsx`, `landing-video-bg.tsx`, `public-marketing-nav.tsx`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Hero surface vs video on 320px | P1 | Frosted surface + pricing pill + dual CTAs can crowd first viewport; rules exist at 479/767 but pill line-wrap untested at 320 | **06** |
| Video readability | P1 | Fixed video layer + wash; short landscape phones (`max-height: 540px`) have separate rules — contrast on busy frames may wash headline | **07** |
| How-it-works complexity | P1 | `HomeHowFlow` uses scroll-linked beats + sticky stage ≥900px; mobile vertical story is long; connect visual adds width | **08**, **09** |
| Section count / scan length | P2 | Product intro + capabilities + how + pay + FAQ + CTA — heavy scroll on phone | **08** |
| Nav link count | P2 | Home nav + drawer: multiple links + login + signup — risk of drawer height &gt; viewport on small phones | **05** |
| Metrics/capabilities strip | P2 | `PublicMetricsStrip` multi-column; may wrap awkwardly at 390px | **08** |

### `/pricing`, `/about`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Pricing card + explainer width | P1 | `pricing-primary-card`, `pricing-order-explainer` — long “pay per completed order” copy | **10** |
| About narrative blocks | P1 | Pain-point sections may be wall-of-text on 320px | **11** |
| Success/pricing visual grid | P2 | `success-pricing-visual` 12-col grid — relies on `min-w-0` at lg | **10** |

### `/blog`, `/blog/[slug]`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Featured + category filters | P2 | Horizontal filter chips may scroll without visible affordance | **12** |
| Article long titles / code blocks | P1 | `overflow-wrap` on prose; code/pre overflow needs per-article check | **12** |
| Article CTA | P2 | `BLOG_CTA_DEMO` — demo CTA only on public article (OK) | — |

### `/demo`, `/contact`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Demo proof two-column grid | P1 | Transcript + ticket columns stack at sm; preview uses `text-micro` (marketing only) | **13** |
| Demo video placeholder aspect | P2 | Placeholder band height on tablet | **13** |
| Contact two-column grid | P1 | `lg:grid-cols-[1fr_0.95fr]` — form below fold on phone OK; field touch targets depend on `public-form-field` | **13** |
| Contact page 479px rules | P2 | `contact-page.css` — verify CTA band padding | **13** |

### Legal (`/privacy`, `/terms`, `/security`)

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Readable line length | P2 | `--public-readable-max` tokens exist; anchor TOC vs sticky nav overlap unverified | **14** |
| Security tech grid | P2 | `sm:grid-cols-2` cards — OK; hero CTA band on narrow phones | **14** |

### Public footer

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Footer grid stacking | P2 | Brand + dual CTAs + link list — `public-footer` CSS at 520/768; link overload risk | **15** |
| Essential links only | P2 | Copy-driven; ensure no horizontal link row on 320px | **15** |

---

## Authentication

**Files:** `auth-page.css`, `public-theme.css` (signup grid), `login-page-entry.tsx`, `signup-page-entry.tsx`, `auth-form.tsx`, `reset-password-form.tsx`, `public-auth-header.tsx`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Form vs aside order | P1 | Grid places aside before form in DOM on login/signup — CSS reorders on desktop; must confirm phone shows **form first** (`public-signup-entry__grid` @479) | **16**, **17** |
| Keyboard viewport | P1 | iOS Safari: fixed header + scrollable form — bottom fields may hide behind keyboard; no `visualViewport` handling | **16** |
| Reset password page | P2 | New route — same auth shell; confirm touch targets match login | **16** |
| URL/error message layout shift | P2 | Long Supabase errors in `AuthForm` | **18** |
| Public auth header mobile menu | P2 | Mirrors marketing nav — drawer focus trap | **16** |

---

## Dashboard shell

**Files:** `app-shell.tsx`, `dashboard-theme.css`, `dashboard/layout.tsx`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Sidebar width `min(100vw-3rem,16rem)` | P2 | OK on phone; verify backdrop click target | **19** |
| `inert` on main when drawer open | P2 | Good pattern; screen reader should still announce sidebar | **19** |
| Header title truncation | P2 | Long org names truncate — OK | — |
| Overview redirect | — | `/dashboard` → restaurants; no duplicate overview UI | — |
| Card table conversion | P1 | Works for `.dashboard-table`; components using raw `<table>` without wrapper need audit (analytics by-location has `dashboard-table` + `lg:min-w-[640px]`) | **36** |
| `overflow-x-auto` neutralized ≤767 in main | P1 | Chart (`OrdersTrendChart`) and menu crumbs rely on intentional horizontal scroll — theme rule excludes `.dashboard-table *` only | **02**, **36** |

---

## Restaurants list

**Files:** `dashboard/restaurants/page.tsx`, `CreateRestaurantButton.tsx`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Card tap targets | P2 | Grid 1 → 2 → 3 cols; action buttons in card footer | **20** |
| Long restaurant names | P1 | Truncation in cards — verify 2-line clamp vs truncate | **20** |
| Create modal | P1 | `fixed inset-0 overflow-y-auto` — small phone full-screen behavior | **20** |
| Skeleton grid | P2 | `loading.tsx` 3-col skeleton on mobile | **20** |

---

## Restaurant workspace rail

**Files:** `RestaurantWorkspaceRail.tsx`, `lib/restaurant-workspace-nav.ts`, `kds-workspace.css`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Five-column bottom nav | P1 | `grid-cols-5` + micro labels — tight on 320px; labels truncated (“Agent”, “Menu”) | **21** |
| Sticky location bar `top-14` | P1 | Stacks under app shell header; CSS adjusts with safe-area at ≤639px — **verify** overlap with `kds-panel-sticky-head` inside orders | **22** |
| Content `pb-20` vs bottom rail | P2 | Padding for fixed nav; modals may extend under rail | **22** |
| Desktop left rail hidden &lt; sm | P2 | OK; sm+ shows 48–56px rail | **21** |
| Duplicate crumbs | P2 | Mobile sticky bar + menu setup breadcrumb both show “Locations” | **27** |

---

## KDS / live orders

**Files:** `LiveOrdersPanel.tsx`, `KitchenOrderCard.tsx`, `OrderDetailModal.tsx`, `CallStatusStrip.tsx`, `kds-workspace.css`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Order tabs horizontal scroll | P2 | Intentional `overflow-x: auto` on tabs — OK with thin scrollbar | **23** |
| Tab selected hides count span | P2 | `span:last-child { display: none }` when selected — may confuse counts on phone | **24** |
| Order card density | P1 | Padding generous; action row + cancel on narrow widths — verify thumb reach | **24** |
| Order detail modal | P1 | Bottom sheet on phone (`items-end`), max-height 92dvh — **safe area bottom** under workspace rail not accounted in modal z-index (z-60 vs rail z-40) | **26**, **22** |
| Realtime banners | P2 | Sync alert + disconnected stack in sticky head — vertical growth on small screens | **23** |
| iPad multi-column | P2 | List stays single column — tablet may underuse width | **25** |
| Print affordance in modal | P2 | Print button in header — hidden on very narrow? | **26** |

---

## Menu setup

**Files:** `MenuSetupWorkspace.tsx`, `MenuScanner.tsx`, `MenuEditor.tsx`, `LiveMenuSidebar.tsx`, `MenuImportHistory.tsx`, `menu/ModifierGroupEditor.tsx`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Two-column `lg:grid-cols-2` | P1 | Scanner + live menu stack until lg — long phone scroll | **27** |
| Menu scanner review `lg:grid-cols-[1.1fr_1fr]` | P1 | Side-by-side only lg; preview image + review controls on phone | **28** |
| `MenuEditor` 12-col layout | P1 | Category sidebar + items — phone single column; horizontal crumb scroll | **29** |
| Live menu sidebar max-height | P2 | `max-height: min(56svh, 420px)` ≥640px — phone uncapped scroll in panel | **29** |
| Import history table | P1 | Uses `dashboard-table` — OK on mobile; long filenames need `overflow-wrap` | **30** |
| `text-[10px]` in import review | P1 | Below readable minimum for labels | **28**, **30** |
| Modifier editor `grid-cols-2` | P2 | Price/qty fields tight on 320px | **29** |
| Hours settings rows | P2 | `sm:grid-cols-[120px_1fr_auto_auto]` — complex on phone | **27** |
| Call indicator in header tools | P2 | Competes with scanner CTA width | **27** |

---

## Live agent

**Files:** `agent/page.tsx`, `VoiceAgentPanel.tsx`, `VoiceAgentTestHarness.tsx`

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Page header stats `dl` 2-col on mobile | P2 | CSS sets 2-col grid ≤639px — OK | **31** |
| Connect/resync full-width buttons | P2 | Mobile rules in kds-workspace.css | **33** |
| Advanced diagnostics / tool URLs | P1 | `dashboard-table` + long monospace strings — wrap/scroll containment | **34** |
| Test harness dominates menu flow | P1 | Large panel with scenarios, JSON editors — collapsible variants exist but still heavy on phone | **35** |
| Embedded panel duplicate chrome | P2 | `embedded` prop hides duplicate header — OK on agent route | **31** |
| ElevenLabs placeholder table | P2 | Profile variables card — table on narrow screens | **34** |

---

## Analytics

**Files:** `AnalyticsDashboard.tsx`, `OrdersTrendChart.tsx`, org + restaurant routes

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Range picker + header wrap | P2 | `flex-col` → `sm:flex-row` | **36** |
| Stat card grids | P2 | 1 → 2 → 4 cols — OK | **36** |
| Trend chart horizontal scroll | P1 | `overflow-x-auto` on bars — excluded from dashboard overflow reset; verify 320px | **36** |
| By-location table | P1 | Wrapped in `dashboard-table` but `lg:min-w-[640px]` on table — confirm card mode at 767 | **36** |
| Empty state CTA | — | Links to real routes — OK | — |

---

## Billing

**Files:** `BillingDashboard.tsx`, `PlanLimitNotice.tsx`, restaurant + org routes

| Issue | Sev | Detail | Fix prompt |
|-------|-----|--------|------------|
| Two-column plan panel `lg:grid-cols-[1.2fr_1fr]` | P1 | Stacks below lg — long usage meters on phone | **37** |
| Entitlement / invoice table | P1 | `dashboard-table` + bordered container — verify stacked cells | **37** |
| Pilot/dev mode banner | P2 | Multi-line posture copy | **37** |
| Placeholder invoice copy | — | Launch posture placeholders, not fake usage rows — OK | — |

---

## Onboarding, settings, notifications, support, admin

| Surface | Issue | Sev | Fix prompt |
|---------|-------|-----|------------|
| Onboarding wizard | Roadmap `grid-cols-2` → `sm:grid-cols-4`; sidebar + body `lg:grid` | P1 | **38** |
| Settings forms | Standard `input-base` min-height in dashboard theme | P2 | **38** |
| Notification delivery log | Scrollable list `max-h-[28rem]` — OK | P2 | **38** |
| Support hub | `sm:grid-cols-2` cards | P2 | **38** |
| Admin ops | Multi stat grids + `dashboard-table` | P1 | **38** |

---

## Accessibility notes (audit)

| Check | Status |
|-------|--------|
| Skip links (app shell, auth) | Present |
| `aria-current` on nav | Public + dashboard + workspace rail |
| Modal dialogs | Headless UI `Dialog` on orders; public nav `role="dialog"` |
| Focus trap on mobile drawers | Partial — backdrop only; recommend roving focus in **05**, **19** |
| Color/contrast on glass surfaces | Marketing glass + muted text — verify WCAG on video hero |
| Touch target 44px | Enforced in several CSS files; gaps on 10px text controls |

---

## Planned work map (prompts 02–40)

| Prompts | Theme |
|---------|--------|
| 02–04 | Global foundations, typography, QA checklist (**04**) |
| 05–15 | Public nav, hero, video, sections, pricing, about, blog, demo/contact, legal, footer |
| 16–18 | Auth layouts and form states |
| 19–22 | Dashboard shell, restaurants list, workspace rail, safe-area stacking |
| 23–26 | KDS audit fixes, cards, tablet layout, order modal |
| 27–30 | Menu setup, scanner, editor, import history |
| 31–35 | Live agent layout, controls, diagnostics, harness |
| 36–38 | Analytics, billing, onboarding/settings/support/admin |
| 39–40 | Rendered browser QA + final pass/fail update to this doc |

---

## Prompt 01 completion

- [x] Route and component inventory documented  
- [x] Concrete responsive risks with severity and mapped fix prompts  
- [x] Real-data discipline boundaries noted  
- [x] No product code changes  
- [x] QA checklist section — **Prompt 04**  
- [ ] Rendered pass/fail — **Prompts 39–40**

## Prompt 02 completion

- [x] `globals.css` — safe-area tokens, `body` overflow clip, tap targets ≤1023px, reduced-motion for decorative animations, `pre` scroll, select/textarea focus  
- [x] `public-theme.css` — `--public-tap-min`, auth safe-area, readable `overflow-wrap`, public/marketing button tap targets  
- [x] `landing.css` / `landing-home.css` — canvas overflow clip, scroll-padding for sticky nav, section text wrap  
- [x] `auth-page.css` — overflow clip on main, focus rings on submit/forgot, reduced-motion on panels  
- [x] `dashboard-theme.css` — `min-width: 0` on main children, `pre` scroll, summary/select/textarea focus, safe-area main padding, sidebar transition off when reduced motion  
- [x] `tests/unit/responsive-foundations-qa.test.ts`

## Prompt 03 completion

- [x] `typography.css` — responsive `clamp()` scale, `--text-caption-size` / `--text-micro-size`, `.type-caption` / `.type-micro` / `.type-eyebrow`
- [x] `tailwind.config.ts` — `text-caption`, `text-micro`, `text-label` font sizes from tokens
- [x] Replaced `text-[10px]` / `text-[11px]` across dashboard + public TSX with token utilities
- [x] `kds-workspace.css` — workspace rail labels use `--text-micro-size` (≥11px)
- [x] `landing-home.css` — hero title `min(18ch, 100%)`, 479px type aliases
- [x] `dashboard-theme.css` — page eyebrow uses `--text-label-size`
- [x] `public-mobile-pages.css` — shared 479px type tokens for home + marketing
- [x] `tests/unit/typography-qa.test.ts` — prompt 03 assertions

## Prompt 04 completion

- [x] `docs/RESPONSIVE_UI_AUDIT.md` — Responsive QA checklist: viewports, pages, interactions, pass/fail, recording template for 39–40
- [x] `tests/unit/responsive-audit-checklist-qa.test.ts` — doc structure guards

## Prompt 05 completion

- [x] Unified desktop nav breakpoint at **900px** (marketing + auth) — avoids cramped inline nav on iPad portrait
- [x] `PublicNavDrawerPanel` — shared drawer with close control, scrollable links, focus trap via existing hook
- [x] `public-nav--open` raises header chrome above drawer; tablet sheet layout 520–899px
- [x] Tap targets on nav links, login, CTA, drawer rows (≥ `--public-tap-min`)
- [x] Footer links stack on ≤519px with comfortable tap height
- [x] `tests/unit/public-nav-responsive-qa.test.ts`, updated `mobile-nav.test.ts`

## Prompt 06 completion

- [x] `landing-home.css` — hero surface `box-sizing` + child `max-width: 100%`; pill full-width in stack
- [x] ≤479px + short landscape — tighter gaps, clamp type, pill `hyphens` / overflow clip
- [x] Tablet 768–1023px — centered hero, generous frosted padding, readable title measure
- [x] Desktop ≥1024px — wider surface cap, increased vertical rhythm and CTA gap
- [x] Background video unchanged (prompt 07 owns video tuning)
- [x] `tests/unit/home-hero-responsive-qa.test.ts`

## Prompt 07 completion

- [x] `landing-home.css` — cover + min dimensions, breakpoint opacity/object-position, top-weighted wash for hero copy, luminous `--public-bg-wash-hero` gradient-only fallback, reduced-motion full gradient
- [x] `landing-video-bg.tsx` — save-data/reduced-motion skip, mp4 error → gradient, tab visibility pause/resume, `data-public-hero-bg`
- [x] `lib/landing/public-background.ts` — documents gradient fallback when no poster
- [x] `tests/unit/home-hero-video-layer-qa.test.ts`

## Prompt 08 completion

- [x] Shorter layman copy: `home-product-intro-copy`, `home-capabilities-copy`, `home-how-flow-copy`, `launch-faq` HOME_FAQ lead, `home-cta-band-copy`
- [x] `home-capabilities-strip` — `titleVisuallyHidden` (eyebrow-only scan)
- [x] `landing-home.css` — lower-section overflow clip, tablet 2+1 capability grid, phone story chips scroll, pay/CTA full-width CTAs, tighter type
- [x] `public-metrics-strip`, `public-cta-band` — `min-w-0` / panel overflow guards
- [x] `tests/unit/landing-home-lower-sections-qa.test.ts`

## Prompt 09 completion

- [x] `home-how-flow-copy` — menu / phone line / ROAL answers / kitchen wording
- [x] `home-how-flow.tsx` — `--compact` (≤767) vertical timeline, `--tablet` (768–899) two-column steps, story chrome only on tablet
- [x] `landing-home.css` — mobile shows all step bodies; tablet card grid; removed phone accordion collapse
- [x] `tests/unit/home-how-flow-qa.test.ts`, `home-how-flow-responsive-qa.test.ts`; updated `landing-home-lower-sections-qa.test.ts`

## Prompt 10 completion

- [x] Removed mobile `display: none` on pricing explainer, pilot, and close band
- [x] `pricing-core` / `pricing-page-copy` — shorter explainer; close band uses success headline
- [x] `pricing-order-explainer` — `__grid` pay/no-pay layout; `pricing-page-content` overflow guard
- [x] `public-theme.css` — phone/tablet pricing responsive rules (CTAs, FAQ tap, explainer grid)
- [x] `public-mobile-pages.css` — no longer hides pricing sections
- [x] `tests/unit/pricing-page-responsive-qa.test.ts`; updated `pricing-page-qa.test.ts`, `mobile-page-layout.test.ts`

## Prompt 11 completion

- [x] `about-page-copy` — rush pain + ROAL answers hero; sharper pillars (missed → ROAL → ticket → price); short lead
- [x] `about-page-content.tsx` — pain pillar accent, section lead, tighter spacing, no unused values/story blocks
- [x] `app/about/page.tsx` — `public-about-page` overflow guard
- [x] `public-theme.css` — mobile hero/pillar/CTA responsive rules; pain pillar styling
- [x] `tests/unit/about-page-responsive-qa.test.ts`; updated `about-page-qa.test.ts`

## Prompt 12 completion

- [x] `blog-theme.css` — mobile filter chip scroll, meta wrap, long title/code/pre overflow, featured 2-col tablet, related 1-col phone
- [x] `blog/page.tsx`, `blog-index-content.tsx`, `blog-article-layout.tsx` — `min-w-0` / `overflow-x-clip`
- [x] Real-data: roster `publishedAt` YYYY-MM-DD, authors stay `ROAL Team`
- [x] `tests/unit/blog-responsive-qa.test.ts`

## Prompt 13 completion

- [x] `demo-page.css` — phone video aspect min-height, proof/CTA stack, full-width buttons
- [x] `contact-page.css` — phone hero/form/close CTAs, tap-sized inputs, status/error wrap
- [x] `app/demo/page.tsx`, `demo-page-content.tsx`, `contact-page-content.tsx` — `overflow-x-clip`
- [x] `public-theme.css` — demo video detail wrap
- [x] `tests/unit/demo-contact-responsive-qa.test.ts`

## Prompt 14 completion

- [x] `app/legal-pages.css` — readable max width, jump-link chips, scroll-margin under sticky nav, phone paragraph spacing, security grid/CTA stack
- [x] `components/landing/legal/legal-page-content.tsx` — overflow clip, policy/contact anchors + jump nav
- [x] `components/landing/security/security-page-content.tsx` — overflow clip, section jump nav
- [x] `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/security/page.tsx` — import legal-pages CSS
- [x] `tests/unit/legal-pages-responsive-qa.test.ts`

## Prompt 15 completion

- [x] `app/footer-pages.css` — phone full-width CTAs, 2-col essential links, tablet/desktop grid stacking
- [x] `lib/landing/footer-copy.ts` — drop duplicate Contact from link row (contact stays on CTA)
- [x] `components/landing/public-footer.tsx` — overflow clip, CTA region label, import footer CSS
- [x] `tests/unit/footer-responsive-qa.test.ts`; updated `footer-qa.test.ts`

## Prompt 16 completion

- [x] `components/auth/auth-viewport-assist.tsx` — visualViewport keyboard inset + focus scroll-into-view
- [x] `app/(auth)/layout.tsx` — viewport assist, `min-w-0` on main inner
- [x] `app/auth-page.css` — form-first ≤959px, error wrap, tap targets, keyboard padding
- [x] `components/auth/auth-form.tsx` — forgot-password sent focus; `reset-password-form.tsx` — success focus
- [x] Login/signup/reset entries — overflow clip; aside hooks for grid order
- [x] `tests/unit/auth-responsive-qa.test.ts`

## Prompt 17 completion

- [x] `app/auth-page.css` — phone: form-only full width, aside hidden; tablet+ (768px): two-column value panel + form
- [x] `app/(auth)/layout.tsx` — import order so auth-page overrides public-theme grid breakpoint
- [x] `login-page-entry.tsx`, `signup-page-entry.tsx` — full-width grid/form; skeleton aside uses layout hooks
- [x] `tests/unit/auth-layout-responsive-qa.test.ts`

## Prompt 18 completion

- [x] `components/auth/auth-form-status.tsx` — reserved alert slot (`data-empty`) to limit layout shift
- [x] `components/auth/auth-form.tsx`, `reset-password-form.tsx` — busy/disabled classes, `AuthFormStatus`, loading guards on footer actions
- [x] `lib/auth/format-auth-error.ts` — shorter copy for expired/invalid links and long messages
- [x] `app/auth-page.css` — error clamp, loading/disabled/focus/success panel rhythm
- [x] `tests/unit/auth-form-states-responsive-qa.test.ts`

## Prompt 19 completion

- [x] `lib/dashboard/use-app-shell-nav.ts` — scroll lock, Escape, Tab focus trap, desktop breakpoint close
- [x] `components/dashboard/app-shell.tsx` — drawer dialog semantics, backdrop, inert main, route-close, safe-area footer
- [x] `app/dashboard-theme.css` — shell overflow, backdrop tap, safe-area padding, mobile sidebar shadow
- [x] `tests/unit/dashboard-shell-responsive-qa.test.ts`

## Prompt 20 completion

- [x] `app/dashboard/restaurants/page.tsx` — card-as-link tap target, truncated titles, formatted errors, responsive grid, aligned skeletons/states
- [x] `app/dashboard-theme.css` — locations list phone/tablet/desktop rules, error wrap, card focus
- [x] `tests/unit/restaurants-list-responsive-qa.test.ts`

## Prompt 21 completion

- [x] `lib/restaurant-workspace-nav.ts` — `isRestaurantWorkspaceNavActive`, shorter mobile labels (Stats/Plan)
- [x] `RestaurantWorkspaceRail.tsx` — compact desktop rail, icon+label bottom nav, back/title a11y, shared active logic
- [x] `kds-workspace.css` — safe-area bottom padding, active tab styling, ≤359px icon-only rail
- [x] `tests/unit/workspace-rail-responsive-qa.test.ts`

## Prompt 22 completion

- [x] `kds-workspace.css` — chrome offset tokens, KDS sticky head stacks under location bar, modal safe-area/max-height, `kds-modal-layer` z-index
- [x] `OrderDetailModal.tsx` — bottom sheet safe-area classes, footer padding above home indicator
- [x] `MenuScanner.tsx` — workspace modal z-index
- [x] `tests/unit/workspace-safe-area-responsive-qa.test.ts`

## Prompt 23 completion

- [x] `kds-workspace.css` — phone: orders head wrap, stacked sync/disconnect alerts, scroll-snap tabs, visible tab counts
- [x] `LiveOrdersPanel.tsx` — tab `aria-label` with counts, truncated panel title
- [x] `CallStatusStrip.tsx` — compact updated line truncates on narrow widths
- [x] `tests/unit/kds-orders-responsive-qa.test.ts`

## Prompt 24 completion

- [x] `order-card-parts.tsx` — named regions, trunc/wrap on customer/items/notes, tappable details link
- [x] `KitchenOrderCard.tsx` — action/total/error regions with alert semantics
- [x] `kds-workspace.css` — phone padding, calmer fills, readable type, 2.75rem action targets
- [x] `tests/unit/kds-order-card-responsive-qa.test.ts`

## Prompt 25 completion

- [x] `kds-workspace.css` — tablet (768–1023): 2-col order grids, segmented tabs (no tab scroll), taller order body, compact call strip row
- [x] `LiveOrdersPanel.tsx` — tab min-width only at `lg+` to avoid forced horizontal scroll
- [x] `page.tsx` — orders workspace `min-w-0 w-full`
- [x] `tests/unit/kds-tablet-responsive-qa.test.ts`

## Prompt 26 completion

- [x] `OrderDetailModal.tsx` — phone bottom sheet (grabber, full-width), footer status actions, close focus, a11y labels
- [x] `kds-workspace.css` — sheet sizing, sticky footer shadow, phone tap targets
- [x] `tests/unit/kds-order-detail-modal-responsive-qa.test.ts`

## Prompt 27 completion

- [x] `MenuSetupWorkspace.tsx` — progress steps, step labels, tablet 2-col grid, hide duplicate crumb on phone, live-menu anchor
- [x] `kds-workspace.css` — menu setup phone/tablet rules, live menu cap, optional-section tap targets, hours stack
- [x] `MenuImportHistory.tsx` — filename wrap in setup context
- [x] `tests/unit/menu-setup-responsive-qa.test.ts`

## Prompt 28 completion

- [x] `MenuScanner.tsx` — phone upload/actions, collapsible import help, full-width errors/discard, clear-dialog stack
- [x] `MenuImportReview.tsx` — sticky commit/discard, 44px controls, single-col modifiers on phone
- [x] `kds-workspace.css` — scanner/review phone tap targets and sticky actions above bottom rail
- [x] `tests/unit/menu-scanner-responsive-qa.test.ts`

## Prompt 29 completion

- [x] `MenuEditor.tsx` — md 2-pane (categories + items/detail), lg 3-col; scroll containment; full-width save actions on phone
- [x] `LiveMenuSidebar.tsx` — wrap/truncate labels, overflow clip
- [x] `ModifierGroupEditor.tsx` — single-col numeric fields on phone
- [x] `kds-workspace.css` — editor sticky categories on tablet, live menu wrap rules
- [x] `tests/unit/menu-editor-responsive-qa.test.ts`

## Prompt 30 completion

- [x] `MenuImportHistory.tsx` — card table on phone, wrap errors/filenames/timestamps, xl table min-width, tappable refresh/view
- [x] `MenuImportReview.tsx` — readable hint list, wrapping stats chips
- [x] `kds-workspace.css` — import history card cells + tablet table overflow
- [x] `tests/unit/menu-import-responsive-qa.test.ts`

## Prompt 31 completion

- [x] `agent/page.tsx` — header/stats/meta wrap, full-width primary CTA on phone
- [x] `VoiceAgentPanel.tsx` — panel regions, collapsible advanced block, profile table min-width, tappable copy
- [x] `VoiceAgentTestHarness.tsx` — flexible harness layout, collapsed optional testing on agent route
- [x] `kds-workspace.css` — agent/harness phone tap targets + profile table cards
- [x] `tests/unit/live-agent-responsive-qa.test.ts`

## Prompt 32 completion

- [x] `agent/page.tsx` — phone hero: agent + menu sync chips, short line, primary CTA; stats/meta tucked away on small screens
- [x] `VoiceAgentPanel.tsx` — embedded connect-first block; less dev copy on phone
- [x] `kds-workspace.css` — compact agent header/panel spacing on phone
- [x] `tests/unit/live-agent-hero-responsive-qa.test.ts`

## Prompt 33 completion

- [x] `VoiceAgentPanel.tsx` — labeled agent ID field, stacked actions on phone, 2-col on tablet, inline on desktop; feedback + refresh regions
- [x] `kds-workspace.css` — connect control layout + disabled button affordance
- [x] `tests/unit/live-agent-controls-responsive-qa.test.ts`

## Prompt 34 completion

- [x] `VoiceAgentPanel.tsx` — advanced `<details>` body regions, URL/profile scroll areas, wrapping long IDs, full-width copy on phone
- [x] `kds-workspace.css` — diagnostics overflow + collapsed body guard
- [x] `tests/unit/live-agent-diagnostics-responsive-qa.test.ts`

## Prompt 35 completion

- [x] `VoiceAgentTestHarness.tsx` — optional collapsed shell, dry-run notice, stacked controls/logs on phone, harness session discipline
- [x] `kds-workspace.css` — agent-page test-call summary + compact harness on mobile
- [x] `tests/unit/live-agent-harness-responsive-qa.test.ts`

## Prompt 36 completion

- [x] `AnalyticsDashboard.tsx` — stat/chart/popular/menu/location regions, card rows, wrapping hints
- [x] `AnalyticsRangePicker.tsx` — full-width segmented control on phone
- [x] `OrdersTrendChart.tsx` — horizontal scroll chart lane with a11y labels
- [x] `dashboard-theme.css` — chart scroll override + analytics layout
- [x] `tests/unit/analytics-responsive-qa.test.ts`

## Prompt 37 completion

- [x] `BillingDashboard.tsx` — billing regions, stacked meta/meters, invoice card table, pilot notice links
- [x] `BillingCheckoutButtons.tsx` — full-width checkout/portal actions on phone
- [x] `dashboard-theme.css` — billing layout for phone/tablet
- [x] `tests/unit/billing-responsive-qa.test.ts`

## Prompt 38 completion

- [x] `onboarding-wizard.tsx` — roadmap/nav touch targets, overflow guard, phone roadmap grid
- [x] `support-hub.tsx` — runbook cards + wrapping steps
- [x] `NotificationSettingsForm.tsx` / `NotificationDeliveryLog.tsx` — form controls, delivery log scroll/wrap
- [x] `AdminOpsDashboard.tsx` — stat grids, card tables, error list
- [x] `settings/page.tsx`, `settings/notifications/page.tsx` — page overflow guards
- [x] `dashboard-theme.css` — shared ops layout rules
- [x] `tests/unit/dashboard-ops-responsive-qa.test.ts`

## Prompt 39 completion

- [x] `scripts/qa-public-responsive-sweep.mjs` — Playwright pass at 320×700, 390×844, 768×1024, 1024×768, 1440×900 across 12 public routes (incl. blog article, privacy, terms, auth)
- [x] `package.json` — `qa:public-responsive-sweep`
- [x] `app/public-theme.css`, `app/landing-home.css`, `app/typography.css` — nav logo/menu + pricing pill tap height; label/micro + main text floor on phone
- [x] `tests/unit/public-rendered-responsive-qa.test.ts`
- **Rendered QA:** **60/60** clean — no horizontal overflow on public surfaces; primary CTAs meet tap targets after prompt 39 CSS fixes

## Prompt 40 completion

- [x] `scripts/qa-dashboard-responsive-sweep.mjs` — Playwright authenticated pass at 320×700, 390×844, 768×1024, 1440×900 across 13 dashboard routes (restaurants list, KDS, menu, agent, scoped/org analytics & billing, onboarding, settings, notifications, support, admin)
- [x] `package.json` — `qa:dashboard-responsive-sweep`
- [x] `LiveOrdersPanel.tsx`, `kds-workspace.css` — KDS refresh icon ≥44×44px at all breakpoints (prompt 40)
- [x] `tests/unit/dashboard-rendered-responsive-qa.test.ts`

### Rendered QA — 2026-05-27

- **Viewports run:** 320×700, 390×844, 768×1024, 1440×900 (public sweep also used 1024×768)
- **Public (Prompt 39):** **Pass** — 60/60 clean; no horizontal overflow; primary tap targets and readable main text after CSS fixes
- **Authenticated (Prompt 40):** **Pass** — 52/52 clean; no horizontal overflow; scoped tap-target checks on `#app-main-content`; fake-data pattern scan clean on rendered copy
- **Blockers:** none
