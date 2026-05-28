# Restaurant Workspace UI Correction Audit (Prompt 01)

Scope audited:
- Authenticated product UX only.
- `/dashboard`, restaurant routes, menu setup, live orders/KDS, live agent components, analytics, billing links.
- No product code edits in this prompt.

## Current authenticated route map

Global dashboard shell/routes:
- `/dashboard` -> overview page with shortcut cards and full workspace link list.
- `/dashboard/restaurants` -> Supabase-backed location list with realtime updates.
- `/dashboard/analytics` -> organization analytics dashboard.
- `/dashboard/billing` -> organization billing dashboard.
- `/dashboard/settings` and `/dashboard/settings/notifications` -> account/org settings + notification delivery logs.
- `/dashboard/admin` -> platform-only ops route.

Restaurant-scoped routes:
- `/dashboard/restaurants/[id]` -> Live orders/KDS workspace.
- `/dashboard/restaurants/[id]/menu` -> guided menu setup workspace.
- `/dashboard/restaurants/[id]/agent` -> Live Agent workspace (`VoiceAgentPanel` embedded).
- `/dashboard/restaurants/[id]/analytics` and `/dashboard/restaurants/[id]/billing` -> restaurant-scoped views.

Primary nav behavior today:
- Global `AppShell` left nav includes `Overview`, `Locations`, `Analytics`, `Settings`, `Billing` (+ `Platform` for platform admins).
- Restaurant pages also render local crumbs/buttons (`Locations`, `Live orders`, `Menu & agent`) inside page content.

## Real persisted/runtime data sources in audited UX

Auth and tenancy guards:
- Dashboard shell uses `getAuthContext`; unauthenticated users redirected to login.
- Restaurant pages use `getRestaurantAccessForPage(restaurantId)` for membership/org checks; unauthorized users are blocked.

Restaurants list (`/dashboard/restaurants`):
- Reads `public.restaurants` via browser Supabase client.
- Realtime subscription: `postgres_changes` on `restaurants`.
- UI states driven by real query status: loading/error/empty/list.

Restaurant KDS (`/dashboard/restaurants/[id]` + `LiveOrdersPanel`):
- Server preloads `draft_orders` + `phone_order_receipts` filtered by `restaurant_id`.
- Client `LiveOrdersPanel` re-fetches and subscribes realtime to:
  - `draft_orders` filtered by restaurant.
  - `phone_order_receipts` filtered by restaurant.
- Includes degraded/connecting/live realtime state and retry/refresh behavior based on runtime connection state.

Menu setup (`/dashboard/restaurants/[id]/menu`):
- Server loads `loadRestaurantMenuSetupPageData`:
  - Billing gate verdicts.
  - `loadRestaurantMenu` snapshot (categories/items/modifiers).
  - restaurant profile + hours bundle.
  - voice-agent control center snapshot (real backend state).
- `LiveMenuSidebar` subscribes realtime to menu tables (categories/items/modifiers).
- `MenuSetupCallIndicator` reads/subscribes `draft_orders` for live call status; no timer-only badge.
- Menu import scanner/actions use real API endpoints and persisted restaurant menu data.

Live agent components (currently embedded in menu route):
- `VoiceAgentPanel` uses real control-center snapshot + server actions:
  - `getVoiceAgentControlCenterAction`
  - `connectVoiceAgentAction`
  - `resyncVoiceAgentAction`
- `VoiceAgentTestHarness` present within menu setup flow.
- ElevenLabs connect/resync flows are wired to existing server actions; no simulated success-only path in audited code.

Analytics (`/dashboard/analytics`):
- Loads `loadOrganizationAnalytics` by authenticated primary membership `organization_id`.
- Uses persisted usage/order/menu scan aggregates; no seeded fake rows found in this page.

Billing (`/dashboard/billing`):
- Loads `loadOrganizationBilling` by authenticated primary membership `organization_id`.
- Uses real billing snapshot, gates, plan/status/usage checks.
- Contains non-runtime placeholder copy in some sections (future tiers, invoices placeholders), but not fake per-restaurant operational data.

## Duplicate/misplaced UI found

1) Competing post-login entry points
- `/dashboard` overview competes with `/dashboard/restaurants` as the primary first action after login.
- Overview quick cards and workspace links duplicate navigation intent already provided in global sidebar.

2) Missing restaurant-scoped workspace nav model
- No reusable selected-location rail/header for restaurant pages.
- Navigation context is split between:
  - global sidebar (organization-level destinations),
  - per-page crumbs/buttons,
  - card-level CTA buttons on locations page.

3) Menu route currently overloaded
- `/dashboard/restaurants/[id]/menu` mixes multiple jobs:
  - menu scan/import,
  - live menu sidebar/editor,
  - full live agent control center,
  - test harness,
  - restaurant profile/hours,
  - import history.
- This is likely the main source of workflow ambiguity.

4) Live agent is not route-addressable as a first-class destination
- Owner-level agent operations exist only as a section inside Menu setup.
- No clean destination for “Live Agent” in restaurant workspace nav.

5) Location card actions are split/conflicting
- Each location card offers both “Live orders” and “Menu & agent”.
- For a location-selection-first UX, this creates competing actions before the workspace context is established.

6) Analytics/Billing discoverability is organization-level only
- Current nav sends users to org-level analytics/billing regardless of selected restaurant.
- No restaurant-scoped entry points for analytics/billing from restaurant context.

## Minimal route/layout changes required (no data model rewrite)

Priority A (lowest-risk routing flow fix):
1. Make post-login dashboard handoff location-first:
   - Redirect `/dashboard` -> `/dashboard/restaurants`, or reduce `/dashboard` to a minimal pass-through.
2. Keep `/dashboard/restaurants` as the canonical location chooser with existing realtime behavior.

Priority B (selected-location workspace consistency):
3. Introduce a reusable restaurant workspace navigation model for routes under `/dashboard/restaurants/[id]` with:
   - `Orders` -> `/dashboard/restaurants/[id]`
   - `Menu` -> `/dashboard/restaurants/[id]/menu`
   - `Live Agent` -> new `/dashboard/restaurants/[id]/agent`
   - `Analytics` -> restaurant-scoped target (new route or scoped query mode)
   - `Billing` -> restaurant-scoped target when supported, else clearly labeled org billing
4. Keep global shell nav focused on `Locations` + account/settings (+ platform-only controls for authorized platform users).

Priority C (separate responsibilities by route):
5. Add dedicated Live Agent route:
   - `/dashboard/restaurants/[id]/agent`
   - Reuse existing restaurant access checks and `VoiceAgentPanel` data-loading/actions.
6. Remove full `VoiceAgentPanel` and test harness from menu setup default flow after dedicated route is active.
   - Keep only a compact link/indicator to Live Agent from menu page.
7. Keep menu route focused on:
   - photo upload/import,
   - resulting live menu state/edit,
   - real call-sync indicator where runtime data exists.

Priority D (scope clarity):
8. Add/adjust restaurant-scoped analytics navigation:
   - either `/dashboard/restaurants/[id]/analytics`,
   - or scoped `/dashboard/analytics` view using selected restaurant context.
9. Add/adjust billing entry from restaurant context:
   - route may stay org-level if billing is org-scoped, but label must be explicit to avoid scope confusion.

## Guardrails to preserve during subsequent prompts

- Keep current auth + tenant isolation checks (`getAuthContext`, `getRestaurantAccessForPage`, role guards).
- Preserve Supabase realtime subscriptions for restaurants, orders, receipts, and menu tables.
- Preserve ElevenLabs connect/resync behavior via existing server actions.
- Preserve menu import/scanner real backend flows and history.
- Authenticated screens must continue to render only persisted/runtime data (no sample records or invented live counters).

## Prompt 37 — Real-data discipline audit (completed)

Reviewed post-login surfaces: locations list, KDS, menu setup, live agent, restaurant analytics/billing. No seeded order rows or fabricated agent connection defaults were found in workspace routes.

Fixes applied:

1. **Call status strip** — live count badge only when `liveCount > 0`; “Updated …” only when a real `lastUpdatedAt` exists (from `draft_orders`).
2. **App shell** — removed org-level “Realtime” pulse badge (was not tied to Supabase subscription state).
3. **Live menu sidebar** — menu sync badge uses `connecting` → `live` (after `SUBSCRIBED`) → `degraded` (on channel error); no pulse while connecting.

Guardrails preserved: public landing illustrative copy unchanged; `MenuSetupCallIndicator` and `LiveOrdersPanel` still read `draft_orders` / receipts via Supabase realtime (or poll fallback when degraded).

Tests: `tests/unit/real-data-discipline-qa.test.ts`.

## Prompt 38 — Desktop visual verification (completed)

**Viewport:** 1440×900 via browser tooling on `http://localhost:3020`.

**Landing (`/`):** pass — hero `hero-bg.mp4` present and playing (`readyState` 4, not paused); frosted `home-hero__surface` (~40rem max-width); marketing nav + CTAs render; no horizontal overflow (`scrollWidth` 1430 @ 1440px); `#how` sticky stage column `display: block` with two-column grid at ≥900px.

**Auth gate:** `/dashboard/restaurants` → `/login?next=…` — login split layout renders at desktop.

**Authenticated KDS / Live Agent / Menu:** not signed in locally (`E2E_EMAIL` / `E2E_PASSWORD` unset). Code fix applied from layout audit:

- Live Agent route: `VoiceAgentPanel` `embedded` hides duplicate panel header/status; page header remains single source of truth; `kds-workspace--agent` max-width for compact desktop column.

Tests: `tests/unit/desktop-visual-qa.test.ts`.

**Blocker for full signed-in desktop pass:** set `E2E_EMAIL` + `E2E_PASSWORD` in `.env.local` and re-run browser check on `/dashboard/restaurants/{id}`, `/menu`, `/agent`.

## Prompt 39 — Mobile visual verification (completed)

**Viewport:** 390×844 (and CDP checks at 390px width) on `http://localhost:3020`.

**Landing:** pass — hero surface full width; CTAs ≥44px; sub-viewport hero height; `#how` steps render; no doc overflow.

**Login / locations gate:** pass — single-column auth stack at mobile; forgot-password control given 44px tap height.

**Authenticated workspace (code + CSS):** signed-in browser pass blocked without `E2E_*`. Fixes from mobile audit:

- Bottom rail short labels (`Orders`, `Menu`, `Agent`, …) so five tabs don’t truncate `Menu & agent`.
- Nav copy: `Menu` / `Menu setup` (agent is its own route).
- `kds-workspace.css` `@media (max-width: 639px)`: bottom-nav touch targets, agent header/CTA stack, KDS tab + refresh hit areas, menu-setup min-width guards.

Tests: `tests/unit/mobile-visual-qa.test.ts`, `tests/unit/home-hero-mobile.test.ts`.

## Prompt 40 — Lint, type, build, and focused tests (completed)

**Commands run (repo root):**

| Check | Result |
|-------|--------|
| `npm run lint` | pass (after fixes below) |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass (51 routes) |
| Focused Vitest (43 files, 204 tests) | pass |

**Fixes introduced in this pass:**

1. `app/dashboard/restaurants/[id]/billing/page.tsx` — removed unused `membership` destructure (ESLint).
2. `components/dashboard/app-shell.tsx` — removed unused `inRestaurantWorkspace` / `isRestaurantWorkspacePath` import (ESLint).
3. `tests/unit/dashboard-owner-cta.test.ts` — overview now redirects to `/dashboard/restaurants`; locations cards use `Open location` (no label constants on list page).
4. `tests/unit/dashboard-shell-qa.test.ts` — header fake-badge guard uses `restaurantWorkspaceMobileTitle` instead of removed `isRestaurantWorkspacePath`.

**40-prompt series status:** complete (prompts 01–40 in `docs/restaurant-workspace-and-landing-correction-40-prompts.md`). No commit/push performed.

**Honest external blockers (unchanged):**

- Signed-in desktop/mobile browser QA for KDS, Menu, and Live Agent requires `E2E_EMAIL` and `E2E_PASSWORD` in `.env.local` (redirects to login without them).
- Public landing “how it works” and pricing sections still use illustrative demo copy by design; authenticated workspace surfaces remain Supabase/runtime-backed only.

**Dev servers:** stopped before handoff (port 3020 clear).

## Prompt 11 audit: Live Agent UI scope

Scope reviewed:
- `app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx`
- `app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx`
- `app/dashboard/restaurants/[id]/agent/page.tsx`

### Owner-essential controls (keep in default view)

1) Core status summary
- Connection status badge (`Not connected` / `Connected` / `Needs sync` / `API error`).
- Agent display name (when present).
- Last sync timestamp (when present).
- Last sync error banner (when present).

2) Primary actions
- `Connect & sync` (primary action).
- `Re-sync` (secondary action when agent exists).
- `Refresh status`.
- Billing/plan gating notice (`PlanLimitNotice`) when voice ordering is blocked.

3) Minimal setup input
- Agent ID input field.
- Linked agent ID readout after connect.

4) User-facing outcome feedback
- Success and error banners with clear next action.

### Developer/diagnostic-heavy UI currently in default view

These are useful but too technical/noisy for owner-first default:
- Full Setup checklist item list with implementation-level detail.
- Environment secrets panel and restart instructions.
- Profile variables table (`expected` vs `actual` placeholder matching).
- Full webhook/tool URL list and copy actions.
- Test harness request/response inspector, manual tool execution, and validation dumps.

### Recommended collapsed Advanced area contents

Move these under a single `Advanced diagnostics` expandable section on the Live Agent page:
- Setup checklist
- Environment secrets status
- Profile variables table
- Webhook/tool URLs
- Any troubleshooting copy about placeholders, headers, or restart requirements

For test harness:
- Keep it on Live Agent page only as optional testing.
- Default collapsed.
- Keep scenario runner visible first; keep manual tool-step JSON editor and raw response payloads in nested advanced disclosure.

### Oversized/verbose content to reduce in default viewport

- `Connect agent` explanatory paragraph is implementation-heavy (placeholders, webhook details, Twilio specifics).
- Success/error helper text currently references technical operations (copy URLs, restart dev server, etc.).
- Test harness copy is QA/developer-oriented by default.

### Data and integration safety notes

- Current Live Agent UI reads real backend snapshot data (`voiceAgentCenter`) and uses existing actions:
  - `getVoiceAgentControlCenterAction`
  - `connectVoiceAgentAction`
  - `resyncVoiceAgentAction`
- Dedicated route `/dashboard/restaurants/[id]/agent` already uses existing tenant checks (`getRestaurantAccessForPage`) and existing setup data loader (`loadRestaurantMenuSetupPageData`).
- No fake status values are required for the compact owner-first redesign in later prompts.
