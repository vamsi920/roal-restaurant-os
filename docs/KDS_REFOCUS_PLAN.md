# KDS / Menu setup refocus

**Status:** Prompts **01–38/80** functional + **68–79/80** UI polish (shell, public trim, theme, KDS/menu states, lint, tests, build). **80/80** = final review only.  
**Sequential refocus series:** `docs/kds-functional-and-ui-80-prompts.md`

---

## Owner mental model

| Job | Where to go | What you do |
|-----|-------------|-------------|
| **Run the line** | **Live orders** — `/dashboard/restaurants/[id]` | Watch phone pickup tickets; accept → start → ready → complete. Keep this screen open during rush. |
| **Build what the agent says** | **Menu & agent setup** — `/dashboard/restaurants/[id]/menu` | Scan menu photo, watch live menu build, edit items, test call, set location basics. |
| **Pick a store** | **Locations** — `/dashboard/restaurants` | Open **Live orders** or **Menu & agent setup** from each card. |

**Not on the owner path:** `/dashboard/admin` (ROAL platform support only; hidden unless `PLATFORM_ADMIN_EMAIL`).

---

## Final routes

| Path | Browser title | Page role |
|------|---------------|-----------|
| `/dashboard/restaurants` | (dashboard shell) | Location list; CTAs to Live orders + Menu & agent setup |
| `/dashboard/restaurants/[id]` | **Live orders — ROAL** | KDS: `LiveOrdersPanel` only |
| `/dashboard/restaurants/[id]/menu` | **Menu & agent setup — ROAL** | Menu hub: scanner, live menu, imports, manual editor (embedded), test call, restaurant basics |

**Unchanged URLs:** Scanner APIs, ElevenLabs routes, order APIs, auth `next=` paths. No `/setup` route — menu hub uses existing **`/menu`** (editor is embedded, not a separate top-level step).

### Auth redirects (guest)

| Route | Login redirect |
|-------|----------------|
| Live orders | `/login?next=/dashboard/restaurants/{id}` |
| Menu setup | `/login?next=/dashboard/restaurants/{id}/menu` |

Access: `getRestaurantAccessForPage` + `notFound()` when signed in but unauthorized.

---

## Display labels (`lib/dashboard-restaurant-labels.ts`)

| Constant | Copy | Used for |
|----------|------|----------|
| `RESTAURANT_LIST_NAV_LABEL` | Locations | Nav, breadcrumbs |
| `RESTAURANT_LIVE_ORDERS_LABEL` | Live orders | KDS h1, tab title, CTAs |
| `RESTAURANT_MENU_AGENT_LABEL` | Menu & agent | Breadcrumb segment, KDS → setup link |
| `RESTAURANT_MENU_SETUP_TITLE` | Menu & agent setup | Menu page h1, tab title |

Mobile shell titles match workspace paths (Live orders / Menu & agent setup).  
Sidebar **Locations** description: “Pick a location — Live orders or Menu & agent setup”.

Removed from owner UI: “KDS Console”, mixed workspace hero, “Admin / Ops” nav for tenants, staff-management framing on dashboard admin.

---

## What moved (composition)

### Off KDS → menu setup (`MenuSetupWorkspace` via `menu/page.tsx`)

| Component | Section on menu setup |
|-----------|------------------------|
| `MenuScanner` | Upload menu photo (`#menu-scan`) |
| `LiveMenuSidebar` | Live menu being built |
| `MenuImportHistory` | Recent menu imports |
| `MenuEditor` | Manual menu editor (`embedded`) |
| `VoiceAgentTestHarness` | Collapsed **Test call** (`variant="test-call"`) |
| `RestaurantProfileSettings` + `RestaurantHoursSettings` | Collapsed **Restaurant basics** |

**Loader:** `lib/restaurant-menu-setup/load-page-data.ts` — menu, billing gates, profile, hours, voice control center snapshot.

### Stays on KDS (`page.tsx`)

| Piece | Notes |
|-------|--------|
| `LiveOrdersPanel` | Tabs New / In progress / Done; `CallStatusStrip`; realtime + poll |
| Menu fetch | `loadRestaurantMenu` — items/modifiers for line display + pricing only |
| Profile | `ensureRestaurantProfile` → `orderPricingFromProfile` |
| CTA | Link to `/menu` (Menu & agent) |

### Removed from KDS (not deleted as components)

`MenuScanner`, `LiveMenuSidebar`, `MenuImportHistory`, `VoiceAgentPanel`, `VoiceAgentTestHarness`, profile/hours panels, two-column menu+orders grids.

### Phone agent on menu setup

| Item | State |
|------|--------|
| **`VoiceAgentPanel`** | Rendered on `/menu` step **Phone agent** (prompt 24). Connect/Re-sync use existing actions; loader supplies `voiceAgentCenter`. |

---

## Key files

| Area | Files |
|------|--------|
| KDS page | `app/dashboard/restaurants/[id]/page.tsx` |
| Menu setup | `app/dashboard/restaurants/[id]/menu/page.tsx`, `menu/MenuSetupWorkspace.tsx` |
| Styles | `app/dashboard/restaurants/[id]/kds-workspace.css` — shared panels; orders scoped `:not(.menu-setup)`; live menu scoped `.menu-setup` |
| Labels | `lib/dashboard-restaurant-labels.ts` |
| Nav | `lib/dashboard-nav.ts`, `components/dashboard/app-shell.tsx` |
| Platform admin | `app/dashboard/admin/page.tsx` — `hasOrgAdminAccess` (platform email only) |
| Dashboard CTAs | `app/dashboard/page.tsx`, `app/dashboard/restaurants/page.tsx` |

---

## UI pass summary (prompts 68–79/80)

| Prompt | Area | Shipped (high level) |
|--------|------|----------------------|
| **68** | Dashboard shell | Nav trimmed to 5 owner items (Overview, Locations, Analytics, Settings, Billing); calm DM Sans ops typography; “Pickup ops” subbrand; `dashboard-theme.css` |
| **69** | Locations list | Card CTAs **Live orders** + **Menu & agent**; mobile-friendly cards |
| **70** | Onboarding | Short step copy: restaurant → menu upload → agent → live orders; roadmap UI |
| **71** | Settings / billing / support | Shared `.dashboard-page` / `.dashboard-panel`; billing semantic tokens |
| **72** | Public copy | Homepage metrics strip removed; FAQ shortened (home/pricing/security); trimmed demo/about/contact/legal |
| **73** | Color | Dashboard accent lavender/ink; public washes violet-only; billing drops raw `amber-500` / `emerald-500` |
| **74** | Focus / a11y | `--focus-ring` on dashboard + public; FAQ accordions; unified `var(--public-focus-ring)` |
| **75** | KDS + menu setup states | `components/dashboard/kds-workspace-states.tsx`; designed empty/loading/banners on `LiveOrdersPanel`, `LiveMenuSidebar`, `MenuImportHistory` |
| **76** | Lint | `MenuScanner.tsx` — `notifyImportsChanged` + `abandonImport` memoized; **0** ESLint warnings |
| **77** | Unit tests | **33** focused public/dashboard files, **162** tests — fixed `public-cta` home CTA title after copy trim |
| **78** | Build | `typography.css` — removed orphan `@layer components` (imported outside `globals.css`); **`npm run build` pass** |
| **79** | Docs | This file + `FINAL_LAUNCH_READINESS.md` |

**Key UI files:** `components/dashboard/kds-workspace-states.tsx`, `app/dashboard/restaurants/[id]/kds-workspace.css`, `app/dashboard-theme.css`, `app/public-theme.css`, `app/globals.css`, `components/dashboard/app-shell.tsx`, `lib/dashboard-nav.ts`, `lib/landing/*`, `components/landing/home/sections/*`.

**Preserved:** All auth, Supabase, Gemini scan APIs, ElevenLabs, realtime orders/menu, billing gates — behavior unchanged.

---

## Mobile status (UI pass)

| Surface | Status | Notes |
|---------|--------|--------|
| Dashboard shell | **Good** | Drawer nav; **44×44** tap targets; scoped Realtime badge on restaurant routes |
| Locations list | **Good** | Stacked cards; full-width CTAs; `dashboard-mobile.test.ts` |
| Live orders (KDS) | **Good** | Sticky tabs/toolbar; horizontal tab scroll; `kds-thumb-btn` min-height; designed empty states |
| Menu setup | **Acceptable** | Guided steps + collapsed test call / basics; long scroll on small phones — mitigated, not eliminated |
| Public marketing | **Good** | Prior responsive sweep **33/33**; prompt 72 copy trim; home FAQ reveal fixed (launch 28) |
| Signed-in browser QA | **Open** | Full mobile matrix still needs `E2E_EMAIL` / `E2E_PASSWORD` or `bootstrap-e2e-smoke-user.mjs` |

---

## Tests run (refocus verification)

Targeted Vitest — functional (31–38) + UI pass (77):

```bash
npm test -- --run \
  tests/unit/kds-workspace-qa.test.ts \
  tests/unit/menu-setup-route.test.ts \
  tests/unit/dashboard-nav.test.ts \
  tests/unit/dashboard-restaurant-labels.test.ts \
  tests/unit/dashboard-owner-cta.test.ts \
  tests/unit/dashboard-import-audit.test.ts \
  tests/unit/dashboard-page-metadata.test.ts \
  tests/unit/dashboard-shell-qa.test.ts \
  tests/unit/dashboard-mobile.test.ts \
  tests/unit/onboarding-ux-qa.test.ts \
  tests/unit/onboarding-nav.test.ts \
  tests/unit/onboarding-wizard.test.ts \
  tests/unit/order-action-labels.test.ts \
  tests/unit/call-status-strip.test.ts \
  tests/unit/error-states-qa.test.ts \
  tests/unit/phone-order-kds-qa.test.ts \
  tests/unit/voice-agent-ui-audit.test.ts \
  tests/unit/scanner-ux-qa.test.ts \
  tests/unit/menu-editor-ux-qa.test.ts \
  tests/unit/visual-consistency.test.ts \
  tests/unit/typography-qa.test.ts \
  tests/unit/auth-ui-qa.test.ts \
  tests/unit/public-accessibility-qa.test.ts \
  tests/unit/public-cta.test.ts \
  tests/unit/launch-faq.test.ts \
  tests/unit/pricing-faq-qa.test.ts \
  tests/unit/pricing-page-qa.test.ts \
  tests/unit/about-page-qa.test.ts \
  tests/unit/demo-page-qa.test.ts \
  tests/unit/home-hero-density.test.ts \
  tests/unit/home-how-flow-qa.test.ts \
  tests/unit/home-pricing-teaser.test.ts \
  tests/unit/metrics-safety.test.ts \
  tests/unit/cross-link-qa.test.ts \
  tests/unit/visual-consistency-public-pages.test.ts \
  tests/unit/auth-route-qa.test.ts \
  tests/unit/apply-order-status.test.ts \
  tests/unit/merge-fetched-orders.test.ts \
  tests/unit/admin-ops.test.ts
```

**Result (2026-05-23, prompt 77):** **33** files, **162/162** pass.

**Lint (prompt 76):** `npm run lint` — **pass**, no warnings.

**Build (prompt 78):** `npm run build` — **pass** (Next.js 14.2.35; **51** routes after menu/auth expansion).

**Coverage highlights:**

- KDS: orders-only page; `KdsEmptyStatePanel` / `KdsStatusBanner`; no scanner on `/[id]`.
- Menu setup: `KdsLoadingPanel` on import history; live menu empty state; shared `kds-workspace-states`.
- Nav: 5-item owner nav; platform admin gated.
- Public: trimmed FAQ/metrics; focus rings; `HOME_CTA_BAND` copy aligned with `home-cta-band-copy.ts`.
- CSS: `kds-workspace-state__*` banners; dashboard lavender `--accent`.

**Not in automated suite:** Full browser scan → voice connect → live call → ticket on KDS (human or `npm run qa:phone-order-kds` with env).

---

## Preserved behavior

| Area | Notes |
|------|--------|
| Auth / RLS | `getRestaurantAccessForPage`, org membership unchanged |
| Gemini scan | `/api/scanner/*`, `MenuScanner` on menu setup only |
| Menu merge | `merge_menu` RPC via commit path |
| Realtime | Orders on KDS; menu tables on `LiveMenuSidebar` + editor events |
| ElevenLabs | Actions unchanged; panel UI placement pending on menu setup |
| Billing | `menu_scan` / `voice_order` gates on scanner + future voice panel |
| Stuck orders | `notifyStuckOrdersForOrganization` still on KDS load |

---

## Remaining issues (post UI pass)

| ID | Severity | Item |
|----|----------|------|
| **KDS-REF-01** | — | **Closed (recovery)** — `VoiceAgentPanel` on menu setup step **Phone agent** (prompt 24) |
| **KDS-REF-02** | P2 UX | Menu setup **long scroll** on small phones; collapsed optional blocks help but page is still dense |
| **KDS-REF-03** | P2 QA | Signed-in **browser** matrix (scan UI, KDS buttons, mobile drawer) — needs `E2E_*` or bootstrap script |
| **LB-01** | **P0** ops | Prod DNS / live Twilio — unchanged ([`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md)) |
| **80/80** | — | Final review summary only — no further UI scope in series |

**Closed in UI pass:** Generic KDS/menu empty panels; stale `public-cta` test; `MenuScanner` hook lint warning; production build blocked by `typography.css` `@layer components`.

**Optional follow-ups (not blockers):** Signed-in browser E2E; prod **LB-01**.

---

## Prompt queue audit (80/80)

| Range | Status | Notes |
|-------|--------|--------|
| **01–40** functional | **Done** | KDS/menu split, tests, build, `KDS_REFOCUS_PLAN` |
| **41–67** UI (public + early dashboard) | **Done** (prior launch polish + this series) | Typography, footer, pricing/about/demo/auth, cards, hero, FAQ — see `typography.css`, `public-footer`, `lib/landing/*` |
| **68–79** UI (dashboard + gates) | **Done** | Shell, states, lint, tests, build, docs |
| **80** final review | **Done** | Architecture summary in chat + this doc |

**Recovery pass (safety prompt):** Explicit gaps closed:

| Prompt | Fix |
|--------|-----|
| **19** | `MenuSetupCallIndicator` — “Call in progress” / “No active call” on menu setup (draft realtime) |
| **20** | `menu-setup-menu-changed` banner on `LiveMenuSidebar` when rows flash |
| **24** | `VoiceAgentPanel` on menu setup step 3 **Phone agent** |
| **59** | `HomeMetricsStrip` restored on landing (pilot-metrics copy; prompt 72 removed strip from page only) |

---

## Historical note (prompt 01 plan vs shipped)

Early plan proposed `/dashboard/restaurants/[id]/setup`. **Shipped:** menu hub on **`/menu`** with embedded `MenuEditor` to avoid a third route and reuse the existing menu URL. KDS remains **`/[id]`** with owner label **Live orders**, not “KDS” in primary headings.
