# Final launch readiness snapshot

**Date:** 2026-05-30 (updated pass **39/40**)  
**Prompt:** Launch finalization **40/40** (commit; push withheld)  
**Sources:** [`FLOW_QA_REPORT.md`](./FLOW_QA_REPORT.md) · [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md) · [`FEATURE_READINESS_AUDIT.md`](./FEATURE_READINESS_AUDIT.md) · git working tree · Cursor QA sessions (feature-flow 60 + launch passes 27–39)

---

## Verdict

| Layer | Status |
|-------|--------|
| **Code / CI** | **Ready** — `lint` **pass**, `npm run build` **pass** (pass 34), focused voice/tenant suites green (passes 33, 38, 39) |
| **Supabase** | **Ready** — project `mnkabwcbdxruefzuvuuv`, **27/27** migrations (`001`–`027` via `supabase db push`; no operator SQL required) |
| **Product flows (automated)** | **Pass** — create → dedicated agent clone → menu sync → Edge draft/finalize → KDS ticket (pass 38); conversation-init fail-closed when agent unlinked (pass 38) |
| **Product readiness (pass 39)** | **Pass** — no fake dashboard metrics; dedicated-agent guard; mobile core pages verified (see below) |
| **Production launch** | **Blocked (P0)** — **LB-01** open: `getroal.com` unreachable; live Twilio sign-off pending. **LB-04** open (same root cause). **LB-03 closed**; **LB-02 downgraded** |

**Certification (39/40):** **Ready for staged pilot onboarding** (signup → menu → KDS → test order on a deployed host with env). **Not ready for production day-one with live forwarded guest calls** until **LB-01** closes — ops must deploy DNS, re-sync ElevenLabs, and confirm one live Twilio call.

---

## Pass 39 — Final product readiness sweep (2026-05-30)

Four launch criteria verified with code review + automated evidence. See also [`FEATURE_READINESS_AUDIT.md`](./FEATURE_READINESS_AUDIT.md).

### 1. No fake dashboard data

| Check | Evidence |
|-------|----------|
| Analytics / command center source | `lib/analytics/load-analytics.ts`, `lib/command-center/load-command-center.ts` — aggregates from `draft_orders`, `phone_order_receipts`, `usage_events`, `menu_import_audits` only |
| No hardcoded KPI arrays in dashboard UI | Grep on `app/dashboard` + `components/analytics` + `components/command-center` — no mock revenue/seed charts |
| Static QA guards | Vitest: `analytics-responsive-qa`, `dashboard-ops-responsive-qa`, `billing-responsive-qa`, `live-agent-responsive-qa`, `command-center-loader` — **22/22** pass (pass 39) |
| Playwright copy scan | `scripts/qa-dashboard-responsive-sweep.mjs` — `FAKE_DATA_PATTERNS` (lorem, fake metrics, demo revenue, placeholder agent) on `#app-main-content` |
| Org overview blockers | `lib/org-overview/launch-blockers.ts` — derived from real profile/menu/hours/voice state, not demo tenants |

**Note:** Marketing/landing demos (`components/landing/*`) use illustrative transcripts by design — out of scope for dashboard readiness.

### 2. No shared global ElevenLabs agent for new restaurants

| Check | Evidence |
|-------|----------|
| Auto-provision on create | `POST /api/restaurants` → `tryProvisionVoiceAgentForNewRestaurant` → `provisionRestaurantConvaiAgent` **duplicates** from `ELEVENLABS_AGENT_ID` template, persists **new** `elevenlabs_agent_id` on profile (`lib/elevenlabs/agent-provision.ts`) |
| Unit proof | `tests/unit/restaurant-auto-provision-elevenlabs.test.ts` — `runSync` receives **cloned** id, never template id |
| Manual connect guard (pass 39) | `connectVoiceAgentAction` rejects when pasted id equals env template (`tests/unit/voice-agent-dedicated-connect.test.ts` **2/2**) |
| Inbound call binding | `conversation-init` returns **404** `restaurant_not_linked` if agent not on profile (pass 38) — no empty `restaurant_id` success |
| Template env in UI | `VoiceAgentPanel` does not prefill template id unless profile-linked; env default shows explicit “use server default” hint only |

Skipped when `ELEVENLABS_AGENT_ID` unset — provision returns `skipped: true` (manual connect still required); documented in API response + onboarding copy.

### 3. No user-required Supabase SQL step

| Check | Evidence |
|-------|----------|
| Operator path | `README.md` + [`DEPLOYMENT.md`](./DEPLOYMENT.md) — **`supabase db push`** only for schema; no “run this SQL in dashboard” in app/onboarding UI |
| Migrations | **27** files in `supabase/migrations/` including **025** (voice lifecycle), **026** (`agent_call_events`), **027** (handoff rules) — applied on remote pass 31 |
| Realtime | `alter publication supabase_realtime` in **`001`**, **`003`**, **`007`** — not a manual onboarding step |
| Optional ops SQL | [`RLS.md`](./RLS.md) / [`DEPLOYMENT.md`](./DEPLOYMENT.md) § Realtime — **eng-only** fallback if publication drift detected on an old fork; not required for greenfield `db push` |

Tenant isolation verification uses `scripts/sql/tenant-isolation-probe.sql` via **MCP/CI**, not restaurant owners.

### 4. Mobile core dashboard pages

| Check | Evidence |
|-------|----------|
| Playwright sweep (390×844 + 1440×900) | `node --env-file=.env --env-file=.env.local scripts/qa-dashboard-pass36-inspect.mjs http://localhost:3020` — **14/14** clean (pass 36): locations, create modal, workspace, menu, agent, location + org analytics |
| Layout fix retained | `RestaurantWorkspaceRail` — bottom nav `gridTemplateColumns: repeat(nav.length)` (6 tabs); **Calls** icon added (pass 36) — fixes wrapped “Plan” row breaking mobile nav |
| Broader responsive script | `npm run qa:dashboard-responsive-sweep` — authenticated multi-viewport + overflow/tap-target audit (`scripts/qa-dashboard-responsive-sweep.mjs`) |
| Unit guards | `workspace-rail-responsive-qa`, `dashboard-rendered-responsive-qa` — rail + sweep script present |

**Core routes covered:** `/dashboard/restaurants`, create modal, `/dashboard/restaurants/[id]` (orders), `/menu`, `/agent`, `/analytics`, `/dashboard/analytics`.

---

## Pass 38 — Critical phone-order chain (2026-05-30)

| Fix | Detail |
|-----|--------|
| `conversation-init` | **404** when restaurant not linked to agent (was **200** with empty `restaurant_id`) |
| QA hours helper | `scripts/lib/qa-ensure-ordering-open.mjs` for closed-hours Edge QA only |

| Command | Result |
|---------|--------|
| `npm test -- tests/integration/api-elevenlabs-conversation-init.test.ts` | **11/11** |
| `npm run qa:phone-order-kds` | **5/5** |
| `npm run qa:draft-finalize-elevenlabs` | **11/11** |

---

## What passed (prior QA)

### Feature-flow QA (prompts 01–60)

- **Inventory & env:** Flow map (01); env audit + `.env.example` alignment (02).
- **Infra:** Supabase MCP identity matches local URL (03); migrations 001–024 remote parity (04); Edge deploy `verify_jwt=false`, three functions ACTIVE (05).
- **CI gates:** Lint, **452** Vitest tests, production build (06, 58, 60).
- **Public / auth:** 11/11 public routes smoke (07); dashboard guest redirect (08); login/signup UI (09); callback/signout (10); auth context API (11); org bootstrap + `024` RLS (12); roles (13).
- **Dashboard:** Shell nav (14 **fixed**); restaurants list/create (15); onboarding wizard (16 **fixed** nav guard).
- **Restaurant ops:** Profile (17); hours (18 **fixed**); scanner extract (19); import commit (21); discard/history (22 **fixed**); menu editor (23); modifiers (24 **fixed**); live menu sidebar (25 **fixed**); compute-totals (26 **fixed**); orders PATCH (27); KDS panel (28).
- **Phone / ElevenLabs:** `get-menu` / `sync-draft-order` / `finalize-order` curl matrices (29–31); tool auth UUID fix + redeploy (32 **fixed**); agent route (34); tool sync API (35); baked tools config (36); conversation-init (37); **phone menu chain** root-caused + re-sync (38 **pass**); voice panel (39 **fixed**); test harness (40); prompt/KB (41); Twilio personalization (42).
- **Billing / ops:** Dev gates unblocked (43); usage events (44 **fixed**); billing UI honest when Stripe off (45 **fixed**); notifications (46 **fixed**); event APIs (47); analytics (48 **fixed**); admin ops (49 **fixed**); settings/support (50).
- **Security / deploy:** Tenant isolation MCP + Vitest (51); API auth matrix 17 routes (52 **fixed**); Realtime publication (53); health/request-id (54 **fixed**); deploy scripts macOS fix (55 **fixed**); focused Vitest gaps (56); Playwright scripts present (57).
- **Sign-off:** `LAUNCH_BLOCKERS.md` (59); final certification table (60).

### Public marketing QA (queue 85–99, 2026-05-22)

Documented in [`PUBLIC_LAUNCH_PLAN.md`](./PUBLIC_LAUNCH_PLAN.md): routes, theme, CTAs, mobile/desktop/a11y/perf audits, cross-links, lint/build clean at that pass.

---

## What was fixed (high-signal, during 60-prompt QA)

| Area | Fix (summary) |
|------|----------------|
| Env / example | `.env.example` + `lib/env.*` — signing secret documented; app URL hints |
| Edge | Redeployed functions; agent-tool auth UUID case mismatch |
| Dashboard | Notifications header copy; onboarding nav-ahead guard |
| Menu | Import discard on new file; modifier reorder; live menu degraded state |
| Orders | `compute-totals` validation; invalid JSON → 400 on several APIs |
| Voice | VoiceAgentPanel success banner; egg mania re-sync path for menu tools |
| Billing / notifications | Checkout hidden when Stripe off; dev_console save not wiping webhook |
| Analytics / admin | Per-location revenue flag; sanitized admin health messages |
| Deploy | `deploy-production.sh` portable `y/N` on macOS bash 3.2 |
| Tests / build | Mock hoisting; `tsconfig` zod path + exclude `tests/**` for Edge shared types |
| UI (06) | `home-how-flow` `aria-hidden` for lint |

**Phone menu (38):** Not an Edge defect — dynamic/unbaked ElevenLabs tools + missing init scope; mitigated by KDS re-sync (`restaurant_tools_baked: true`).

---

## What remains open

### Launch blockers ([`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md)) — decision **38/40**

| ID | Severity | Status | Owner | Action |
|----|----------|--------|-------|--------|
| **LB-01** | **P0** | **open** | ops + human | Deploy prod host; DNS `getroal.com`; `ensure:signing-parity` + `resync:elevenlabs-all`; one Twilio call → `get_menu_items` **200** in EL logs |
| **LB-04** | P1 | **open** | ops + eng | After deploy: `SMOKE_BASE_URL=https://getroal.com npm run smoke` **6/6**; `qa:deploy-smoke` **8/8** |
| **LB-03** | P1 | **closed** | — | Signing secret parity verified 2026-05-23 |
| **LB-02** | P2 | **downgraded** | product | Manual pilot billing OK; not required for launch |

**P0 impact:** Restaurants cannot forward live rush-hour pickup lines to production until LB-01 closes. Code, Edge, and local phone-stack QA are pass.

### Needs human (non-blockers)

- Signed-in browser matrix (dashboard, onboarding, menu scanner review/commit UI, KDS Realtime, notification save) — set `E2E_EMAIL` / `E2E_PASSWORD` for full `e2e-smoke`.
- Demo MP4 / contact form persistence (cosmetic).

### Working tree (not yet committed)

**205 paths** in `git status` (37 modified tracked + **168** untracked after triage). Committed `HEAD` is a **minimal MVP** (~55 files); almost all launch surface is **uncommitted**. **Do not deploy from `HEAD` alone** — commit the full triaged tree first.

---

## Diff triage (prompt 02/40)

**Baseline:** `git ls-tree HEAD` ≈ dashboard KDS stub, ElevenLabs APIs, migrations **001–007**, four ElevenLabs scripts. Everything else in status is net-new or evolved since last commit.

### Summary by classification

| Class | Count (approx) | Launch risk | Action |
|-------|----------------|-------------|--------|
| **Product — app** | ~90 paths | **High** if omitted from deploy | **Ship** — public site, auth, dashboard, APIs, middleware, CSS |
| **Product — lib** | ~25 dirs/files | **High** | **Ship** — auth, tenant, menu, orders, billing, notifications, landing, env |
| **Product — Supabase** | 17 migrations + `_shared` + Edge | **High** on fresh DB | **Ship** — 008–024 already applied on remote `mnkabwcbdxruefzuvuuv` |
| **Product — components** | ~130 files | **High** | **Ship** |
| **Product — public** | `public/landing/hero-bg.mp4` (~700 KiB) | **Low** | **Ship** — canonical hero video |
| **Tests / scripts** | 94 tests + 10 scripts + `vitest.config.ts` | **Medium** — CI/deploy gates | **Ship** — required for `npm test`, smoke, deploy |
| **Config / deps** | 37 modified incl. `package.json`, lock, tsconfig, next/tailwind | **Medium** | **Ship** — lockfile must commit with deps |
| **Docs** | ~57 markdown files | **Low** | **Ship** — runbooks + QA audits; internal prompt queues OK in repo |
| **Env template** | `.env.example` (modified) | **Low** | **Ship** — no secrets; `.env` / `.env.local` gitignored ✓ |
| **Generated / ignored** | `node_modules/`, `.next/`, `.env*` | **None** | Already in `.gitignore` — do not commit |
| **Accidental junk** | 1 root MP4 duplicate | **Low** (bloat / confusion) | **Removed** — see below |

**Secrets check:** No `.env`, `.env.local`, or credential files in `git status`. Grep of tracked diff shows env **names** only in `lib/env.*` / docs — no literal keys staged.

### Product (ship)

| Area | Paths | Notes |
|------|-------|-------|
| Public marketing | `app/page.tsx`, `app/pricing`, `app/blog`, `app/about`, `app/demo`, `app/contact`, `app/security`, `app/privacy`, `app/terms`, `app/not-found.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/*-theme.css`, `app/landing*.css` | QA pass 07 + public queue 85–99 |
| Auth | `app/(auth)/*`, `app/auth/*`, `app/api/auth/*`, `middleware.ts`, `lib/auth/*`, `lib/supabase/middleware.ts` | Middleware + callback required for dashboard |
| Dashboard | `app/dashboard/**` (modified + new admin, analytics, billing, onboarding, settings, menu editor, KDS components) | Core operator surface |
| APIs | `app/api/billing`, `health`, `notifications`, `scanner/{extract,commit,discard}`, `restaurants/.../orders`, `menu-imports`, `conversation-init` | Match FLOW_QA 17-route matrix |
| Lib domains | `lib/admin`, `agent-tools`, `analytics`, `billing`, `blog`, `landing`, `menu-editor`, `notifications`, `observability`, `onboarding`, `orders`, `scanner`, `voice-agent`, `env.*`, etc. | Tenant + voice + menu stack |
| Edge | `supabase/functions/_shared/**`, modified `get-menu` / `sync-draft-order` / `finalize-order` | Redeploy with app cutover |

### Tests & scripts (ship)

| Path | Role |
|------|------|
| `tests/**` (94 files), `vitest.config.ts` | **452** Vitest cases — CI gate |
| `scripts/auth-smoke.mjs`, `e2e-smoke.mjs`, `playwright-smoke-lib.mjs`, `public-route-smoke.mjs` | Playwright smokes (LB-04) |
| `scripts/deploy-*.sh`, `smoke-test-production.sh`, `qa-finalize-order-edge.mjs` | Deploy + prod smoke |
| `scripts/connect-elevenlabs-restaurant.ts`, `inspect-roal-tools.ts`, `list-elevenlabs-restaurants.ts` | Ops helpers (existing pattern) |

### Docs (ship — low deploy risk)

| Subclass | Examples | Notes |
|----------|----------|-------|
| **Runbooks** | `AUTH.md`, `DEPLOYMENT.md`, `TESTING.md`, `E2E_SMOKE.md`, `ONBOARDING.md`, `RLS.md`, `TENANT_SCHEMA.md`, `AGENT_TOOL_SECURITY.md` | Operator-facing |
| **QA / launch** | `FLOW_QA_REPORT.md`, `LAUNCH_BLOCKERS.md`, `FINAL_LAUNCH_READINESS.md`, `PUBLIC_LAUNCH_PLAN.md`, `*_QA.md`, `*_AUDIT.md` | Evidence for sign-off |
| **Internal prompts** | `feature-flow-qa-60-prompts.md`, `launch-finalization-40-prompts.md`, `launch-ready-site-100-prompts.md`, `enterprise-build-prompts.md`, `cursor-qa-prompts.md`, `*-PLAN.md` | Safe in repo; not runtime |

### Modified tracked only (37) — all **ship**

Evolution of committed baseline: `.env.example`, `README.md`, core dashboard + ElevenLabs + scanner APIs, `lib/elevenlabs*`, `lib/gemini.ts`, `lib/supabase/*`, `lib/types.ts`, Edge sources, `package.json` / lock, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `docs/ELEVENLABS.md`.

### Junk removed (prompt 02)

| File | Issue | Resolution |
|------|-------|------------|
| `341ea41f409e49a6bf6fa01283cf8936.mp4` (repo root) | **Byte-identical** duplicate of `public/landing/hero-bg.mp4`; not referenced in code | **Deleted** |
| — | Prevent recurrence | `.gitignore` adds `/*.mp4` and `/*.mov` (canonical media under `public/` only) |

### Launch risk verdict (post-triage)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Deploy partial tree (HEAD only) | **P0** | Single commit: product + migrations + tests + scripts + `public/` + config |
| Migrations 008–024 missing on target DB | **P1** | Already on QA project; run `supabase db push` on new env before cutover |
| Uncommitted lock vs install | **P1** | Commit `package-lock.json` with `package.json` |
| Hero video missing | **P2** | Include `public/landing/hero-bg.mp4` in commit (not root duplicate) |
| Internal docs in repo | **None** | Optional trim later; not a runtime blocker |

**No other files deleted.** All remaining untracked paths are intentional launch work.

---

## Public visual audit (03/40)

**Completed 2026-05-23** without restarting a dev server (ports 3020/3001 cleared).

| Method | Result |
|--------|--------|
| Prior browser | `/` desktop only (original run aborted) |
| Static Vitest (this pass) | **45/45** — a11y, nav, mobile/desktop layout, visual consistency, cross-links, pricing/demo/auth/home |
| Live browser | **Optional** — `public-route-smoke.mjs` + `qa:responsive-sweep` when server up |

**Routes:** `/`, `/pricing`, `/blog`, `/blog/ai-phone-ordering-small-restaurants`, `/about`, `/demo`, `/contact`, `/security`, `/login`, `/signup`.

**Findings:** No UI fixes needed from static pass. Home = `landing-home.css`; marketing = `public-theme`.

---

## Homepage polish (prompt 04/40)

Hero, metrics, how-it-works, FAQ, CTA, footer tightened; pricing pill in content stack. **Re-verified 2026-05-23** — `home-how-flow-qa` + `home-pricing-teaser` pass; 6-section `landing-page.tsx` unchanged.

---

## Pricing polish (prompt 05/40)

| Area | Change |
|------|--------|
| Hero card | H1 “Only pay for successful orders”; **$0.90** rate; billable vs never-billed lists |
| Pilot setup | 3-step numbered block + month-to-month note |
| FAQ | “Quick answers” (5 items) |
| Close CTA | Conversion headline + demo/signup |
| Removed | `pricing-what-counts.tsx` duplicate prose |

**452/452** tests; browser desktop + mobile on `/pricing`.

---

## Blog polish (prompt 06/40)

| Area | Change |
|------|--------|
| CSS cascade | `blog-theme.css` imported in `public-page-shell.tsx` **after** `landing.css` so glass/lavender rules beat poster yellow chips and offset shadows |
| Cards | Removed duplicate `glass-card` on `blog-card__surface` and article CTA; added `blog-card--compact` for grid + related posts |
| Filters | Centered chip row spacing; `!important` guard on active chip (ink/lavender, not yellow) |
| Legacy | Suppress `blog-index--decorated` / `blog-article--decorated` yellow washes |

Article copy unchanged; SEO/AEO (JSON-LD, short answer, FAQ schema) preserved.

**452/452** tests; browser mobile `/blog` + article slug verified on `:3020`.

---

## Auth polish (prompt 07/40)

| Area | Change |
|------|--------|
| Login layout | Split grid + glass value aside (live menu, KDS, pay-per-pickup) — parity with signup |
| Signup default `next` | `/dashboard/onboarding` when no query; email confirm + middleware unchanged |
| Cross-links | Login → signup uses onboarding default; deep `?next=` preserved both ways |
| Errors | Server/callback errors use `role="alert"` only — fields no longer `aria-invalid` for wrong password / expired link |
| Header | Hide redundant Log in / Sign up on the page you are already on |
| Theme | `public-theme-canvas` wash + glass panels; mobile form-first column order |

Auth logic (Supabase sign-in/sign-up, callback, `safeNextPath`) unchanged.

**457/457** tests; browser `/login`, `/signup`, error query on login verified.

---

## Demo / about / contact / legal polish (prompt 08/40)

| Page | Change |
|------|--------|
| `/demo` | Hero CTA: **Book a demo call** (mailto) + **Sign up**; scroll link to video; call steps use progressive times (6:44→6:45); tighter copy; centered close band |
| `/about` | Shorter hero + story; removed duplicate mission band |
| `/contact` | Sidebar uses public-theme typography classes (expect / demo / self-serve) |
| `/privacy`, `/terms` | Legal hero + panel typography aligned with marketing glass theme; readable paragraph spacing |

Transcript footer + ticket proof unchanged structurally; theme tokens on transcript footnote.

**460/460** targeted unit tests pass; browser spot-check `/demo`, `/about`, `/contact`, `/privacy` on `:3020`.

---

## Dashboard shell UX (prompt 09/40)

| Area | Change |
|------|--------|
| Shell | Skip link, `#app-main-content` landmark, `aria-current="page"` on nav, active left accent, mobile drawer shadow |
| Header | **Realtime** badge only on `/dashboard/restaurants/*` (removed misleading global “Live”) |
| Loading | `app/dashboard/loading.tsx` skeleton for RSC navigations; restaurants list `role="status"` + `aria-busy` |
| Restaurants | Removed hardcoded `#000000` / gradient title; clearer empty + loading copy |
| Theme | `app/dashboard-theme.css` (teal ops palette unchanged) |

**Browser:** Guest `/dashboard` → `/login?next=…` **pass** on `:3020`. Signed-in nav/empty/loading states **need** `E2E_EMAIL` / `E2E_PASSWORD` (not in local env this pass).

**464/464** unit tests (+ `dashboard-shell-qa`); occasional unrelated flake in `voice-agent-harness.test.ts`.

---

## KDS workspace UX (prompt 10/40) — superseded

Pre-split ops layout (menu + voice + orders on one page). **Replaced** by functional refocus **01–40/80** below. Source of truth for IA: [`KDS_REFOCUS_PLAN.md`](./KDS_REFOCUS_PLAN.md).

---

## KDS / Menu split — functional + UI refocus (01–40 + 68–79/80)

**Series:** [`kds-functional-and-ui-80-prompts.md`](./kds-functional-and-ui-80-prompts.md) · IA source: [`KDS_REFOCUS_PLAN.md`](./KDS_REFOCUS_PLAN.md).  
**Verdict:** **Functional + UI pass (68–79)** — route split unchanged; dashboard/public polish, KDS/menu designed states, theme/focus consistency, **lint clean**, **build pass**, **162** focused Vitest. **80/80** = final review only.

### Split status

| Route | Role | Renders |
|-------|------|---------|
| `/dashboard/restaurants/[id]` | **Live orders** | `LiveOrdersPanel` only — draft/receipt queue, tabs, `CallStatusStrip`, link to menu setup |
| `/dashboard/restaurants/[id]/menu` | **Menu & agent setup** | `MenuScanner`, `LiveMenuSidebar`, `MenuImportHistory`, embedded `MenuEditor`, collapsed **Test call** harness, collapsed **Restaurant basics** |
| `/dashboard/restaurants` | **Locations** | Per-card CTAs: Live orders + Menu & agent setup |

**Preserved:** Auth (`getRestaurantAccessForPage`, guest `next=` paths), Gemini scan APIs, menu realtime, order realtime/poll, billing gates on scanner, `loadVoiceAgentControlCenter` in menu loader (data only).

**Removed from KDS page:** `MenuScanner`, `LiveMenuSidebar`, `MenuImportHistory`, `VoiceAgentPanel`, `VoiceAgentTestHarness`, profile/hours panels, mixed two-column grids.

### UI pass summary (prompts 68–79)

| Area | Change |
|------|--------|
| Dashboard shell | 5-item nav; calm ops typography; lavender accent; shared page/panel patterns |
| Locations / onboarding | **Live orders** + **Menu & agent** CTAs; short onboarding roadmap |
| Public | Copy trim; metrics strip removed; shorter FAQs; violet-only washes |
| Theme / a11y | Focus rings dashboard + public; billing semantic colors |
| KDS / menu setup | `kds-workspace-states` — empty, loading, sync banners (not blank/spinner-only) |
| Quality gates | Lint **0** warnings (`MenuScanner` hooks fixed); build (`typography.css` no orphan `@layer`) |

### Mobile status (UI pass)

| Surface | Status |
|---------|--------|
| Dashboard shell + locations | **Good** — drawer, 44px targets, `dashboard-mobile` tests |
| Live orders KDS | **Good** — sticky head, tab scroll, thumb buttons, designed empties |
| Menu setup | **Acceptable** — step flow + collapsed optional blocks; still long on small phones |
| Public | **Good** — prior `qa:responsive-sweep` **33/33**; copy trim in 72 |
| Signed-in browser | **Open** — needs `E2E_EMAIL` / `E2E_PASSWORD` |

### Tests run (functional + UI, 2026-05-23)

| Gate | Result |
|------|--------|
| Focused Vitest (prompt **77**) | **33** files, **162/162** pass |
| `npm run lint` (prompt **76**) | **pass** — 0 warnings |
| `npm run build` (prompt **78**) | **pass** — 51 app routes |

Includes: `kds-workspace-qa` (14), `menu-setup-route`, `dashboard-nav`, `dashboard-owner-cta`, `dashboard-shell-qa`, `dashboard-mobile`, `onboarding-*`, `error-states-qa`, `public-accessibility-qa`, `visual-consistency*`, `launch-faq`, `pricing-*`, `home-*`, `metrics-safety`, `public-cta`, `auth-ui-qa`, `typography-qa`, voice/scanner/menu editor audits.

**Regression fixed (77):** `public-cta.test.ts` — `HOME_CTA_BAND.title` → `"Stop losing rush-hour calls."` (matches `lib/landing/home-cta-band-copy.ts` after prompt 72).

### Unresolved blockers (functional + UI refocus)

| ID | Severity | Item |
|----|----------|------|
| **KDS-REF-01** | — | **Closed** — `VoiceAgentPanel` on menu setup **Phone agent** step (recovery pass, prompt 24) |
| **KDS-REF-02** | P2 UX | Menu setup **long scroll** on mobile; optional blocks collapsed but page still dense |
| **KDS-REF-03** | P2 QA | Signed-in browser matrix (scan → ticket on Live orders) still **needs** `E2E_EMAIL` / `E2E_PASSWORD` |
| **LB-01** | **P0** ops | Unchanged — prod DNS / live Twilio (see [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md)) |

**Closed in UI pass (68–79) + recovery:** Undesigned KDS/menu empties; `VoiceAgentPanel` on `/menu`; call/menu-changed indicators on menu setup; homepage pilot metrics strip; `public-cta` test; `MenuScanner` lint; `typography.css` build fix.

**Not blockers for staged pilot on dev/preview:** Split itself; Edge phone tools; local menu scan + KDS ticket path (prior QA still valid).

**Owner journey script note:** `qa:owner-journey` step “KDS workspace (orders + scanner)” predates split — treat **Live orders** and **`/menu`** as separate steps when re-running manually.

---

## Onboarding UX (prompt 11/40)

| Area | Change |
|------|--------|
| Copy | Step descriptions no longer imply hours in wizard; hours → kitchen workspace |
| Menu | **Skip for now** (persisted `skipped`); **Continue** only when categories exist |
| Voice / test call | Clearer skip/connect copy; test call **Skip for now** + always show KDS link |
| Nav | Resume-aware sidebar — cannot jump ahead of incomplete steps |
| Account | **Continue to restaurant setup** when org already provisioned |

**Browser:** Guest `/dashboard/onboarding` → `/login?next=…` **pass** (`:3020`). Full signed-in wizard (org create, `?restaurant=`, voice skip, resume) **needs** `E2E_EMAIL` / `E2E_PASSWORD`.

**475/475** unit tests (+ `onboarding-nav`, `onboarding-ux-qa`).

---

## Menu scanner live pass (prompt 12/40)

| Area | Change |
|------|--------|
| Fixture | `tests/fixtures/sample-menu.png` — realistic lunch menu (Lupa Trattoria QA art) |
| Live extract | **pass** — `RUN_LIVE_SCANNER=1` + Gemini on fixture (~5s); ≥2 categories, ≥2 known items |
| Automated | extract/commit/discard/history integration tests **pass**; `scanner-user-messages`, `scanner-ux-qa` |
| UX | Owner-facing API errors (`formatScannerApiError`); alert + retry copy; **Discard failed import** on extract error |
| E2E helper | Playwright smoke uses fixture PNG when present (extract still mocked without Gemini) |

**Browser:** Signed-in scanner upload/review/commit UI **needs** `E2E_EMAIL` / `E2E_PASSWORD` (mock path in `e2e-smoke` unchanged).

**482/482** unit+integration (+ **1 skipped** live flag doc test when `RUN_LIVE_SCANNER` unset).

---

## Menu editor live pass (prompt 13/40)

| Area | Change |
|------|--------|
| CRUD | Categories, items (price/availability), modifier groups — existing actions + validation **pass** (unit/integration) |
| Live sync | `notifyMenuChanged` + `router.refresh()` after editor saves; scanner commit also notifies |
| KDS sidebar | Listens for `roal:menu-changed` → `loadRestaurantMenu` resync (alongside Realtime) |
| Edge parity | `buildGetMenuHarnessResponse` test — same `loadRestaurantMenu` loader as Edge `get-menu` |
| UX | Editor error/success alerts; saving indicator; empty states for categories/items/modifiers |

**Browser:** Guest `/dashboard/restaurants/{id}/menu` → login **pass**. Signed-in CRUD UI **needs** `E2E_EMAIL` / `E2E_PASSWORD`.

**487/487** pass (+ **1 skipped** live scanner opt-in).

---

## Phone order / KDS live pass (prompt 14/40)

| Area | Result |
|------|--------|
| Edge flow | `scripts/qa-phone-order-kds-flow.mjs` — **5/5 pass**: get-menu → sync draft (create) → DB `draft`/live tab → sync qty update → finalize → DB `new`/queue tab |
| Finalize QA | `scripts/qa-finalize-order-edge.mjs` — **7/7 pass** (idempotency) |
| KDS bucketing | `draft` → live carts; `new`+ → kitchen queue (`lib/order-status.ts`) |
| Status PATCH | accept → start → mark_ready → complete + cancel — integration **pass** |
| Poll fallback | `LiveOrdersPanel`: Realtime + 28s live / 6s degraded poll + **`visibilitychange` refetch** |
| Harness fix | Dry-run finalize clears in-memory cart (fixes flaky `empty_cart_finalize` under parallel vitest) |

**Browser:** Signed-in KDS accept/start/complete buttons **needs** `E2E_EMAIL` / `E2E_PASSWORD`.

**494/494** pass (+ **1 skipped** live scanner opt-in).

---

## Voice agent panel (prompt 15/40)

| Area | Result |
|------|--------|
| Connect / Re-sync | `npm run qa:voice-agent-panel` — **8/8 pass**: sync tools → profile PATCH → DB persist → resync → first_message literal |
| Persistence | `elevenlabs_agent_id`, `elevenlabs_last_sync_at`, `elevenlabs_last_sync_summary.restaurant_tools_baked: true` on QA restaurant |
| Safe errors | `connectVoiceAgentAction` throws **sanitized** message to UI; snapshot errors redacted via `sanitizeVoiceAgentDisplayError` |
| UX | Env-not-ready gate copy; `role="alert"` on errors; success next steps → checklist + voice test harness |
| Actions | `connectVoiceAgentAction` / `resyncVoiceAgentAction` (legacy `elevenlabs-actions` delegates connect only) |

**Browser:** Signed-in Connect/Re-sync button click **needs** `E2E_EMAIL` / `E2E_PASSWORD` (automated path uses same libs as KDS actions).

**498/498** pass (+ **1 skipped** live scanner opt-in).

---

## LB-01 production phone stack (prompt 16/40)

| Layer | Result |
|------|--------|
| QA script | `npm run qa:lb01-phone-stack` — **11/13 pass** (2 prod DNS/HTTP expected fail until hosting live) |
| Baked tools | 3/3 on agent; `x-roal-restaurant-id` + baked `get-menu` URL for QA restaurant |
| `get_menu_items` | ElevenLabs-synced URL + headers → **HTTP 200**, 7 categories (simulates Twilio tool call) |
| Personalization | Webhook **enabled** on agent; URL matches `NEXT_PUBLIC_APP_URL` + conversation-init path |
| conversation-init | **HTTP 200** on local dev with correct `restaurant_id` (prod blocked: `getroal.com` DNS NXDOMAIN) |

**LB-01 status:** **shrunk** — code/tool stack certified; **close** after DNS live + one Twilio call with `get_menu_items` **200** in ElevenLabs logs.

**500/500** pass (+ **1 skipped** live scanner opt-in).

---

## ElevenLabs batch re-sync (prompt 17/40)

| Area | Result |
|------|--------|
| Inventory | `npm run list:elevenlabs-restaurants` — **1 configured** (egg mania); 2 others without saved agent id |
| Batch re-sync | `npm run resync:elevenlabs-all` — **1/1 verified** |
| Per restaurant | Tools baked; `apikey` + `Authorization` + `x-roal-restaurant-id` present; Supabase ref match; on agent prompt |
| Profile / prompt | `first_message_ok`; conversation-init webhook enabled (path match; secret redacted in logs) |
| Skipped | Restaurants without `elevenlabs_agent_id` — connect via KDS first |

**502/502** pass (+ **1 skipped** live scanner opt-in).

---

## get_menu_items as ElevenLabs calls it (prompt 18/40)

| Check | Result |
|-------|--------|
| QA script | `npm run qa:get-menu-elevenlabs` — **6/6 pass** |
| Invocation | Synced ElevenLabs tool URL + headers (GET, no body) — same as Twilio session |
| Response | **HTTP 200**; **7 categories**, **39 items**; `restaurant.name` = egg mania; `operations.ordering_allowed` present |
| Baked | `restaurant_id` in URL + `x-roal-restaurant-id` header match QA restaurant |

Shared helper: `lib/elevenlabs/fetch-synced-tool.ts` (`fetchSyncedRoalTool`, `invokeSyncedRoalTool`).

**504/504** pass (+ **1 skipped** live scanner opt-in).

---

## Draft/finalize as ElevenLabs calls them (prompt 19/40)

| Check | Result |
|-------|--------|
| QA script | `npm run qa:draft-finalize-elevenlabs` — **11/11 pass** |
| sync_draft_order | Synced tool URL + headers → **HTTP 200**; KDS `draft` row; `voice_order` usage event |
| finalize_order | Synced tool → **HTTP 200**; KDS `new`; receipt row; `order_completed` usage event |
| Idempotency | Second finalize with same `x-roal-idempotency-key` → `replay=true` |
| Validation | Empty customer → **400** `validation_failed`; placeholder (John Doe / 555-000-0000) → **400** `customer_validation_failed` |

Bodies use **baked** shape (no `restaurant_id` in JSON — scoped via headers).

**506/506** pass (+ **1 skipped** live scanner opt-in).

---

## LB-03 signing secret parity (prompt 20/40)

| Step | Result |
|------|--------|
| Local | Generated `AGENT_TOOL_SIGNING_SECRET` in `.env.local` (legacy `AGENT_TOOL_SECRET` unchanged) |
| Edge | `supabase secrets set AGENT_TOOL_SIGNING_SECRET=…` — listed in `supabase secrets list` |
| Re-sync | `npm run resync:elevenlabs-all` — **1/1** (new signed tokens baked on agent) |
| Verify | `npm run qa:lb03-signing-parity` — **5/5**; `roal1.*` mint → get-menu **HTTP 200** |

**LB-03:** **closed** for QA project. Other deploy targets: `npm run ensure:signing-parity`.

**507/507** pass (+ **1 skipped** live scanner opt-in).

---

## Billing launch posture (prompt 21/40)

| Area | Result |
|------|--------|
| Self-serve checkout | **off** — `STRIPE_CHECKOUT_ENABLED=false`; no checkout/portal buttons in UI |
| Pilot model | Success-based **$0.90 / successful order** (matches `/pricing`) |
| Dashboard | `BillingDashboard` pilot banner; future SaaS tiers labeled “not active”; contact sales for billing |
| Onboarding | **No Stripe gate** — dev mode relaxed limits |
| Provider stubs | Honest messages (no fake redirect to Stripe) |
| LB-02 | **Downgraded** — not a pilot launch blocker |

**511/511** pass (+ **1 skipped** live scanner opt-in).

---

## Notifications live pass (prompt 22/40)

| Area | Result |
|------|--------|
| Settings save | **pass** — dev_console preserves webhook/recipients; admin round-trip on `qa-role-separation` org |
| Event API | **pass** — unauthenticated → **401**; integration matrix 11/11 |
| Stuck check | **pass** — unauthenticated → **401**; `notifyStuckOrdersForOrganization` runs |
| Delivery log | **pass** — dispatch → `dev_console/sent` row; payload omitted client-side |
| Redaction | **pass** — member viewer hides secrets; URLs stripped from errors |
| Email / SMS | **human-only** — production mode records recipients but providers return **skipped** (SendGrid/Resend, Twilio not wired) |
| Permissions | **pass** — server action + UI admin-only save; MCP RLS member UPDATE **0 rows**; member read-only banner |
| Live script | `npm run qa:notifications-live` — **11/11** |

**Human-only:** signed-in settings save UI + delivery log browser matrix (`E2E_EMAIL` / `E2E_PASSWORD`); email/SMS provider wiring.

**516/516** pass (+ **1 skipped** live scanner opt-in).

---

## Analytics live pass (prompt 23/40)

| Area | Result |
|------|--------|
| Data source | **Legacy POC** org (`egg mania`) — real QA usage/orders; **QA Role Separation** per-location row; **QA P12** zero-restaurant empty snapshot |
| KPIs | **pass** — voice/completed match `usage_events` (30d: **10** / **7**); conversion **70%**; revenue **$6** (menu-priced, complete) |
| Ranges | **pass** — `7d` / `30d` / `90d` picker; invalid → **30d** default; chart buckets = day series length |
| Chart | **pass** — daily voice/completed/canceled bars; voice sum equals summary |
| Empty state | **pass** — zero-restaurant org returns zeros + dashed empty UI path |
| Metrics scope | **supported only** — voice, conversion, revenue est., prep, finalized, canceled, menu scans, popular items (no invented marketing metrics) |
| Auth | Guest `/dashboard/analytics` → **307** login |
| Live script | `npm run qa:analytics-live` — **17/17** |

**Human-only:** signed-in range picker + chart layout browser (`E2E_*`).

**522/522** pass (+ **1 skipped** live scanner opt-in).

---

## Admin ops live pass (prompt 24/40)

| Area | Result |
|------|--------|
| Access — owner/admin | **pass** — `isOrgAdmin` + `hasOrgAdminAccess`; page loads snapshot for admin orgs |
| Access — member | **pass** — gate redirects to `/dashboard`; nav link hidden via `adminOnly` + `showAdminNav` |
| Access — guest | **pass** — `/dashboard/admin` → **307** login with `next=/dashboard/admin` |
| Health API | **pass** — `/api/health` **200** healthy; booleans only in `details`; no `supabase_url` |
| Sanitization | **pass** — `sanitizeHealthReportForPublic` + `sanitizeOpsErrorDetail`; sync errors truncated; agent id **suffix only** (`···tws1n3`) |
| Secret scan | **pass** — live health + admin snapshot JSON: no `sk-`, JWT, `roal1.*`, raw URLs |
| Env flags | **pass** — `getEnvStatus()` boolean flags only (Stripe **off** in dev) |
| Live script | `npm run qa:admin-ops-live` — **31/31** |

**Human-only:** signed-in browser matrix — member blocked from `/dashboard/admin`, owner/admin see console (`E2E_*` or set passwords on `qa-role-*@example.invalid` fixtures).

**527/527** pass (+ **1 skipped** live scanner opt-in).

---

## Tenant isolation final confirmation (prompt 25/40)

| Layer | Result |
|-------|--------|
| RLS JWT probe | **pass** — Org A user (`a0000001-…`) → Org B (`rls-qa-isolated`) + Legacy POC: **0** SELECT; writes **0** rows / INSERT denied |
| Positive control | **pass** — Org A restaurant + org visible to probe user |
| Surfaces | restaurants, organizations, menu (categories/items), orders, receipts, menu_imports, notifications, usage_events, billing org columns |
| `rls_poc_demo_reads` | **false** |
| Vitest routes | **75/75** — menu, orders, scanner, notifications, billing gates, restaurant POST, compute-totals, tenant helpers |
| App pages | analytics/billing/admin use **session org** only (no query override) |
| Fixes | **none** — no migration; added Org B `notification_settings` fixture row for probe completeness |
| Live script | `npm run qa:tenant-isolation` — **11/11** |
| SQL replay | `scripts/sql/tenant-isolation-probe.sql` via Supabase MCP on each deploy |

**534/534** pass (+ **1 skipped** live scanner opt-in).

---

## Auth/session/security final confirmation (prompt 26/40)

| Area | Result |
|------|--------|
| Login/signup | **pass** — pages **200**; auth UI + middleware matcher |
| Callback | **pass** — no code → login error; `safeNextPath` blocks `//evil` open redirect (Vitest) |
| Signout | **pass** — POST **303** → `/login`; clears Supabase session |
| Protected redirects | **pass** — guest `/dashboard/*` → **307** login with `next=` |
| `next` safety | **pass** — `safeNextPath` unit tests; middleware + callback wired |
| Cookies | **pass** — `@supabase/ssr` cookie bridge on callback/signout/middleware |
| Service-role isolation | **pass** — no `env.server` / service role in `use client` modules |
| Public env | **pass** — `getPublicEnv()` = `NEXT_PUBLIC_*` only; browser client uses anon key |
| API auth | **pass** — unauthenticated **401** on restaurants POST, billing gates, auth context, notifications |
| Health exposure | **pass** — public **200**; no `sk-` / server key values in body |
| Vitest | **43/43** auth suites + **6** static posture tests |
| Live script | `npm run qa:auth-security` — **18/18** |

**Fixes:** **none** — no security bugs found.

**555/555** pass (+ **1 skipped** live scanner opt-in).

---

## Deploy / smoke readiness (27/40)

**Goal:** Verify deploy scripts + safe smokes against local dev; probe production honestly (no fake passes).

### Fix (proven launch bug)

| Issue | Fix |
|-------|-----|
| `/signup` stuck on skeleton — `defaultAuthNextPath` used but not imported in `signup-page-entry.tsx` | Added import from `@/lib/auth/auth-next-url` |

### Local (`http://localhost:3020`) — **pass**

| Check | Result |
|-------|--------|
| `SMOKE_BASE_URL=http://localhost:3020 npm run smoke` | **6/6** — health, request_id, `/`, `/login`, `/pricing`, dashboard auth gate |
| `node scripts/public-route-smoke.mjs http://localhost:3020` | **11/11** public routes **200** |
| `E2E_BASE_URL=http://localhost:3020 npm run auth-smoke` | **9/9** — login + signup render/submit |
| `E2E_BASE_URL=http://localhost:3020 npm run e2e-smoke` | **15/15** — auth UI + protected redirect; signed-in paths **skipped** (no `E2E_*`) |
| `npm run qa:deploy-smoke` | **6/8** — local layers pass; prod probe fails (expected until hosting) |

### Production (`NEXT_PUBLIC_APP_URL=https://getroal.com`) — **blocked**

| Check | Result |
|-------|--------|
| DNS / connect | **fail** — NXDOMAIN / HTTP 000 from QA host |
| `SMOKE_BASE_URL=https://getroal.com npm run smoke` | **0/5** — all endpoints unreachable |
| LB-04 close criteria | Run same smokes after DNS + deploy live |

### Deploy tooling (inspected)

| Asset | Status |
|-------|--------|
| `scripts/deploy-production.sh` | lint → test → build; interactive `db push` + edge deploy |
| `scripts/deploy-edge-functions.sh` | three Edge functions |
| `scripts/smoke-test-production.sh` | curl health + public pages + dashboard gate |
| `npm run deploy:check` | wraps deploy-production (needs human for remote steps) |

**Ops checklist to close LB-04:** (1) Deploy app to host bound to `getroal.com`. (2) `SMOKE_BASE_URL=https://getroal.com npm run smoke` → **6/6**. (3) `E2E_EMAIL`/`E2E_PASSWORD` + `npm run e2e-smoke` on prod/staging. (4) Manual §7 in `docs/DEPLOYMENT.md` (menu scan, Realtime, ElevenLabs, finalize).

---

## Responsive UI sweep (28/40)

**Method:** Playwright screenshots at **390×844** (mobile), **768×1024** (tablet), **1280×900** (desktop) for 11 routes; overflow + tap-target + tiny-text heuristics. `npm run qa:responsive-sweep` → **33/33** clean.

| Route group | Coverage |
|-------------|----------|
| Public | `/`, `/pricing`, `/login`, `/signup`, `/demo`, `/contact`, `/about`, `/blog`, `/security` |
| Dashboard (guest) | `/dashboard/restaurants`, `/dashboard/onboarding` → login gate (no `E2E_*` for signed-in shell) |

### Fixes (proven)

| Issue | Fix |
|-------|-----|
| Homepage FAQ **invisible** below fold — scroll-timeline reveal left `opacity: 0` | Reveal keyframes transform-only; `opacity: 1` on reveal items; removed reveal classes from home FAQ list |
| Mobile menu tap targets **38×38** | Nav/auth menu buttons → **44×44** (`2.75rem`) |
| Auth header nav looked like underlined blog links | `public-auth-header__nav-link` (no underline); tablet **768–899** uses drawer |
| Demo transcript / KDS preview text **9–10px** | Bumped to **11px** in `conversation-transcript`, `phone-orders-preview` |
| Home micro-labels **10px** | `0.625rem` → `0.6875rem`; mobile metrics note → `0.75rem` |
| Dashboard mobile nav button **40×40** | **44×44** in `app-shell` |

**Still needs human:** signed-in dashboard/KDS at mobile with `E2E_EMAIL` / `E2E_PASSWORD`.

---

## Accessibility / performance (29/40)

**Method:** Static Vitest (`public-accessibility-qa.test.ts` **10/10**) + live Playwright `npm run qa:a11y-perf` **13/13** on `:3020`.

| Check | Result |
|-------|--------|
| Skip links + `main` landmark + single `h1` | **pass** — 9 public routes |
| Form labels / `aria-labelledby` / `role="alert"` | **pass** — login, signup, contact (static + live) |
| Focus / keyboard | **pass** — tab moves off body; mobile nav dialog + Escape (static) |
| `prefers-reduced-motion` | **pass** — CSS disables reveal/hover transforms; hero **no video** when reduced motion |
| Hero video fallback | **pass** — `/landing/hero-bg.mp4` **HTTP 200**; gradient wash always present |
| Public route load (dev) | **pass** — all routes **< 1s** to networkidle on QA host |

### Fixes (proven)

| Issue | Fix |
|-------|-----|
| Homepage **hydration mismatch** — demo ticket time used `new Date()` at module load | Static ISO timestamps in `landing-demo-data.ts`; fixed `en-US` + `America/Chicago` formatting |
| Demo **console error** — malformed SVG `path` in transcript phone icon | Replaced with valid Lucide phone path |
| Demo KDS preview time drift | Same static locale/timezone for `phone-orders-preview` finalized label |

**No new launch blockers.** Full WCAG audit / Lighthouse CI not in scope for pilot.

---

## Error / empty states (30/40)

**Method:** Static wiring + `npm run qa:error-states` **9/9**; Vitest **15/15** (`error-states-qa`, `scanner-user-messages`).

| Surface | Empty / error posture |
|---------|------------------------|
| Scanner | `formatScannerApiError`; discard + retry hints; no “Gemini/server” in 503 copy |
| KDS | Tab empty states; sync errors via `formatSupabaseClientError` |
| Voice agent | Sanitized connect/resync/refresh errors; checklist + env gate copy |
| Billing | Pilot banner when Stripe off; plan limit notices |
| Notifications | Admin-only save errors formatted; delivery log status labels |
| Analytics | “No activity in this range” + link to restaurants |
| Admin | Ops errors sanitized (prior pass) |
| Login/signup | `formatAuthError` — no raw Supabase strings |
| Public contact | Client validation + `role="alert"`; mailto handoff |
| Create restaurant | API returns generic 500; UI uses `formatApiRouteError` |

### Fixes (proven)

| Issue | Fix |
|-------|-----|
| Auth showed raw Supabase messages | `formatAuthError` on login/signup + callback query |
| KDS showed Postgres/JWT errors | `formatSupabaseClientError` on Realtime fetch |
| Restaurants API leaked `error.message` | Generic 500 response |
| Menu import “Unknown error” | `formatApiRouteError` + friendly fallback |
| Scanner 503 mentioned Gemini/server | Owner-facing copy only |
| Onboarding/notifications raw DB errors | `formatSupabaseClientError` in actions + wizard |

---

## Operator handoff docs (31/40)

**Goal:** Single source of truth for cutover — no conflicting env/tool instructions.

| Doc | Use when |
|-----|----------|
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Migration order, Edge deploy, env checklist, smoke + §8 QA scripts |
| [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md) | Open items **LB-01**, **LB-04**; closed/downgraded LB-02/LB-03 |
| [`ELEVENLABS.md`](./ELEVENLABS.md) | Tool URLs, `roal1.*` signing, Connect/Re-sync, batch `resync:elevenlabs-all` |
| [`TESTING.md`](./TESTING.md) | Vitest CI gate + launch `qa:*` script matrix |
| This doc | Launch queue status, regression results, changelog |

**Removed / aligned stale guidance:** `AGENT_TOOL_SECRET` no longer documented as required (signing secret preferred); ELEVENLABS example keys dropped; billing smoke no longer implies Stripe required for pilot; ElevenLabs verify steps match KDS Connect flow (not manual tool creation).

**Not operator handoff:** `FLOW_QA_REPORT.md`, theme audits, prompt queues — historical QA only.

---

## Test suite stabilization (32/40)

**Method:** Full `npm test` ×2 + focused suites on launch 27–30 areas; no snapshots in repo; shuffle not used (Vitest 3 CLI).

| Result | Detail |
|--------|--------|
| Full suite | **117** files, **555** pass / **1** skipped — **0 failures**, **0 flaky** on repeat |
| Focused (auth/error/a11y/restaurants) | **48** pass |
| `npm run qa:error-states` | **10/10** (added create-restaurant wiring check) |
| `npm run qa:auth-security` | **18/18** |
| Lint | **pass** — 1 accepted warning: `MenuScanner.tsx` `react-hooks/exhaustive-deps` |

### Regressions added (minimal)

| Area | Test |
|------|------|
| Signup skeleton bug (27) | `auth-flow-smoke` — `defaultAuthNextPath` import on signup entry |
| Restaurants API leak (30) | `api-restaurants-post` — insert failure → generic 500 body |
| Hydration (29) | `public-accessibility-qa` — static demo ISO timestamps + Chicago TZ |
| Create restaurant UI (30) | `error-states-qa` + `role="alert"` on dialog error |

**No flaky tests found.** QA script hardcoded counts (75 tenant, 43 auth) still match live runs.

---

## Full local regression (33/40)

**Run:** `npm run lint` → `npm test` → `npm run build` (sequential, 2026-05-23).

| Gate | Result |
|------|--------|
| `npm run lint` | **pass** (exit 0) — **1 warning** (see below) |
| `npm test` | **pass** — **117** files, **555** pass / **1** skipped (`tests/live/scanner-fixture-extract` opt-in) |
| `npm run build` | **pass** — Next.js **14.2.35**; **50** app routes generated |

### Accepted lint warning (exact)

| Field | Value |
|-------|--------|
| File | `app/dashboard/restaurants/[id]/MenuScanner.tsx` |
| Line | **115**, column **5** |
| Rule | `react-hooks/exhaustive-deps` |
| Message | React Hook `useCallback` has a missing dependency: `'abandonImport'`. Either include it or remove the dependency array. |
| Why accepted | File-picker `onFileSelected` omits `abandonImport` so the callback is not recreated every render; `abandonImport` is defined later and only discards the prior import when a new file is chosen. Safe for pilot; optional follow-up: wrap `abandonImport` in `useCallback` and add to deps. |

`next build` runs the same rule — warning only, **does not fail** the build.

### Build fixes (proven — missing imports / props)

| File | Fix |
|------|-----|
| `LiveOrdersPanel.tsx` | Import `formatSupabaseClientError` |
| `settings/notifications/actions.ts` | Import `createServerSupabase` |
| `MenuImportHistory.tsx` | Import `MenuImportStatus`, `MenuImportListItem` |
| `onboarding-wizard.tsx` | Import `cn`; pass `onGoToRestaurant` → `restaurant_profile` step |

---

## Browser E2E smoke (34/40)

**Dev server:** `PORT=3020 npm run dev` · base `http://localhost:3020`.

| Check | Result |
|-------|--------|
| `node scripts/public-route-smoke.mjs http://localhost:3020` | **11/11** public routes |
| `E2E_BASE_URL=http://localhost:3020 npm run auth-smoke` | **9/9** |
| `E2E_BASE_URL=http://localhost:3020 npm run e2e-smoke` | **15/15** (5 signed-in checks **skipped**) |

**Signed-in path (KDS + scanner mock):** not run — `E2E_EMAIL` / `E2E_PASSWORD` unset in `.env.local`. Not a pilot launch blocker; set creds locally and re-run (see `docs/E2E_SMOKE.md`).

**Helper added:** `scripts/bootstrap-e2e-smoke-user.mjs` — ephemeral Supabase user + org + restaurant, then invokes `e2e-smoke` (credentials never logged). For ops QA only.

---

## Owner customer journey (35/40)

**Script:** `npm run qa:owner-journey` (dev on `:3020`).

| Step | Result |
|------|--------|
| Public marketing (`/`, `/pricing`) | **pass** |
| Login → dashboard (Playwright + ephemeral user) | **pass** |
| KDS workspace (orders + scanner) | **pass** |
| Menu editor | **pass** |
| Billing + analytics | **pass** |
| `get_menu_items` (linked ElevenLabs restaurant) | **pass** |
| `sync_draft_order` + `finalize_order` → KDS ticket | **pass** |

**11/11 passed** (2026-05-23).

### Proven fixes (browser auth blocked journey)

| Issue | Fix |
|-------|-----|
| Client `getPublicEnv()` used dynamic `process.env` → Supabase keys not inlined in browser | `lib/env.public.ts` — explicit `process.env.NEXT_PUBLIC_*` refs |
| Playwright login stuck loading | `auth-form.tsx` — read `FormData` before `setLoading`; `loginWithEnvCredentials` — `networkidle` + client-nav wait |
| Signed-in e2e polluted by fake signup session | `e2e-smoke.mjs` — fresh browser context for authenticated steps |

Menu scan UI + live Gemini + ElevenLabs Connect on **new** bootstrap restaurant remain manual; voice/KDS order path verified via API against linked QA restaurant.

---

## Final product copy pass (36/40)

**Goal:** Plain owner language on public pages — what ROAL does (answers calls, natural voice, live menu, kitchen ticket, pay only for successful orders) without overpromising.

| Check | Result |
|-------|--------|
| `lib/landing/*` customer copy | **updated** — KDS → kitchen screen/pass; “voice agent” → ROAL / pickup line; security FAQ de-jargoned |
| Root metadata (`app/layout.tsx`) | **updated** — live menu + successful-order pricing |
| Blog index (`lib/blog/index-copy.ts`) | **updated** — dropped “AI voice agent” phrasing |
| Signup aside | **updated** — “menu, phone line, test call” |
| `product-language-safety` Vitest | **pass** — no banned absolute claims |
| `launch-faq` Vitest | **pass** — successful-order answer uses kitchen screen |

**Scope:** Landing, pricing, demo, about, contact, legal, security owner sections, FAQ single source. Dashboard/KDS operator labels unchanged. Blog **articles** retain SEO titles; index + landing de-jargoned. Technical RLS/token detail stays on `/security` implementation section only.

**No product behavior changes.**

---

## Final code hygiene pass (37/40)

**Goal:** Safe cleanup — dead imports, stray logs, secret leaks, accidental assets — without refactors.

| Check | Result |
|-------|--------|
| `npm run build` | **pass** — fixed `lib/env.shared.ts` `parseEnv` to accept partial env records (unblocks `lib/env.public.ts` client inlining from prompt 35) |
| `npm run lint` | **pass** — 1 accepted warning (`MenuScanner.tsx` exhaustive-deps) |
| `npm test` | **pass** — **555/555** (+1 skipped) |
| Console noise in `app/` / `components/` | **clean** — no stray `console.log`; server `console.error` limited to message strings; Realtime warn dev-only |
| Client secret leaks | **none found** — existing auth-security Vitest guards pass |
| Accidental large assets | **none** — hero video **704K**; root `/*.mp4` gitignored; `.qa-screenshots/` added to `.gitignore` |
| Dead scripts | **none removed** — all `scripts/*` referenced by npm `qa:*` or docs |
| Duplicate CSS / dead landing | **not touched** — `landing.css` debt documented in PREMIUM_UI plan; out of scope for safe hygiene |

**Fixes shipped:** `parseEnv` typing; restaurants POST catch logs message only (not full error object); `.gitignore` QA screenshots.

---

## Final launch blocker decision (38/40)

Full write-up: [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md).

| Gate | Verdict |
|------|---------|
| Ship code to staging / guided pilot | **Go** — commit triaged tree; deploy with env + signing parity |
| Invite restaurants to forward **live** guest calls on prod domain | **No-go** — **LB-01 (P0)** until `getroal.com` live + Twilio sign-off |
| Self-serve Stripe at signup | **Optional** — LB-02 downgraded; manual billing |

**Verified 2026-05-23:** `https://getroal.com` → HTTP **000** from QA host; `npm test` **555/555**; `npm run build` pass.

---

## Prepare commit (39/40)

**Staged:** **700 files** (~81k insertions / ~1.8k deletions vs `6f43cc7`). All intentional launch-readiness paths; **no** `.env`, `.env.local`, `.qa-screenshots/`, or PEM files.

| Included | Excluded |
|----------|----------|
| App (public, auth, dashboard, APIs) | `.env` / `.env*.local` (gitignored) |
| `components/`, `lib/`, `middleware.ts` | `.qa-screenshots/` |
| Supabase migrations **008–024**, Edge `_shared` + function updates | Real secret values |
| `tests/` (**555** Vitest), `scripts/qa-*`, Playwright smokes | |
| `docs/FINAL_LAUNCH_READINESS.md`, `LAUNCH_BLOCKERS.md`, operator docs | |
| `.env.example` (template only), `.gitignore`, `README.md` | |

**Prepared commit message** (prompt 40 — commit locally; **do not push** until LB-01 closes or ops accepts pilot-only deploy):

```
feat: ship launch-ready product, QA suite, and ops docs

Marketing site (home, pricing, blog, demo, legal), auth/onboarding,
dashboard (KDS, menu editor/scanner, voice agent, billing pilot,
notifications, analytics, admin). Supabase tenant migrations 008–24,
Edge order/menu tools with signing parity, ElevenLabs baked-tool sync.

555 Vitest + Playwright smoke/owner-journey scripts; launch blockers
documented (LB-01 P0 prod DNS/Twilio remains; LB-03 closed; LB-02
downgraded). Public copy de-jargon pass; client env inlining fix.

.env.example updated; secrets stay local-only.
```

**Next (40/40):** ~~`git commit`~~ **done** — push **withheld** (LB-01 P0); see § Commit and push below.

---

## Commit and push (40/40)

| Gate | Result (2026-05-23) |
|------|---------------------|
| `npm run lint` | **pass** (1 accepted `MenuScanner` warning) |
| `npm test` | **pass** — **555/555** (+1 skipped) |
| `npm run build` | **pass** |
| Launch blocker decision | **LB-01 P0 open** — prod DNS + live Twilio |

| Action | Result |
|--------|--------|
| **Commit** | **done** — see `git log -1` on `main` |
| **Push** | **withheld** — P0 **LB-01** remains; pushing would advertise a prod-ready phone stack before `getroal.com` + Twilio sign-off |

### Before push (ops)

1. Deploy Next.js; point **`getroal.com`** DNS (or set `NEXT_PUBLIC_APP_URL` to live origin).
2. `npm run ensure:signing-parity` on prod host + Edge; `npm run resync:elevenlabs-all`.
3. `npm run qa:lb01-phone-stack` → prod layers pass; one live Twilio call → `get_menu_items` **200**.
4. `SMOKE_BASE_URL=https://getroal.com npm run smoke` → **6/6**; then `git push origin main`.

---

## Regression commands (last certified run)

| Command | Result (2026-05-23, prompt 33) |
|---------|-------------------------------|
| `npm run lint` | **pass** (exit 0) — 1 warning: `MenuScanner.tsx:115` `react-hooks/exhaustive-deps` (`abandonImport`; see §33) |
| `npm test` | **pass** — 117 files, **555** pass / **1** skipped |
| `npm run build` | **pass** — Next.js 14.2.35; 50 routes; ~17s local |
| `public-route-smoke` (:3020) | **11/11** (2026-05-23, prompt 34) |
| `auth-smoke` / `e2e-smoke` (:3020) | **9/9** / **15/15** guest; signed-in via `bootstrap-e2e-smoke-user.mjs` **14/15** (scanner mock on empty menu) |
| `npm run qa:owner-journey` | **11/11** (2026-05-23, prompt 35) |
| `npm run qa:notifications-live` | **pass** — **11/11** (2026-05-23) |
| `npm run qa:analytics-live` | **pass** — **17/17** (2026-05-23) |
| `npm run qa:admin-ops-live` | **pass** — **31/31** (2026-05-23) |
| `npm run qa:tenant-isolation` | **pass** — **11/11** + MCP SQL (2026-05-23) |
| `npm run qa:auth-security` | **pass** — **18/18** (2026-05-23) |
| `npm run qa:lb03-signing-parity` | **pass** — 5/5 local + Edge + signed token |
| `npm run ensure:signing-parity` | **pass** — 3/3 (skip-resync when already set) |
| `npm run qa:draft-finalize-elevenlabs` | **pass** — 11/11 (KDS, receipt, usage, idempotency) |
| `npm run qa:get-menu-elevenlabs` | **pass** — 6/6 (200, 7 categories, 39 items) |
| `npm run qa:phone-order-kds` | **pass** — 5/5 Edge + KDS bucket checks |
| `npm run qa:finalize-edge` | **pass** — 7/7 finalize/idempotency |
| `npm run qa:voice-agent-panel` | **pass** — 8/8 connect + resync + DB persist |
| `npm run qa:lb01-phone-stack` | **pass** — 11/13 (automated layers); prod DNS **fail** until hosting |
| `npm run resync:elevenlabs-all` | **pass** — 1/1 configured restaurants verified |
| `npm run list:elevenlabs-restaurants` | **pass** — 1 agent-linked restaurant |
| `npm run build` | **pass** |
| `npm run qa:deploy-smoke` | **6/8** local pass; prod **fail** until `getroal.com` live (2026-05-23) |
| `SMOKE_BASE_URL=http://localhost:3020 npm run smoke` | **pass** — **6/6** (2026-05-23) |
| `auth-smoke` / `e2e-smoke` (local :3020) | **pass** — **9/9** / **15/15**; signed-in skipped without `E2E_*` |
| `SMOKE_BASE_URL=https://getroal.com npm run smoke` | **fail** — **0/5** DNS/connect (2026-05-23) |
| `npm run qa:responsive-sweep` | **pass** — **33/33** mobile/tablet/desktop (2026-05-23) |
| `npm run qa:a11y-perf` | **pass** — **13/13** + static a11y Vitest **10/10** (2026-05-23) |
| `npm run qa:error-states` | **pass** — **10/10** + Vitest **17/17** (2026-05-23) |

---

## Files changed (inventory for launch pass)

### Prior QA sessions (documented; may overlap working tree)

**Docs (Cursor-generated / updated):**  
`docs/FLOW_QA_REPORT.md`, `docs/LAUNCH_BLOCKERS.md`, `docs/E2E_SMOKE.md`, `docs/DEPLOYMENT.md`, `docs/ELEVENLABS.md`, `docs/AGENT_TOOL_SECURITY.md`, `docs/AUTH.md`, `docs/ONBOARDING.md`, `docs/PUBLIC_LAUNCH_PLAN.md`, plus QA audit plans (`AUTH_*`, `BLOG_*`, `MOBILE_*`, `DESKTOP_*`, `VISUAL_*`, `METRICS_*`, `PRODUCT_LANGUAGE_*`, etc.) and prompt queues (`feature-flow-qa-60-prompts.md`, `launch-finalization-40-prompts.md`, `launch-ready-site-100-prompts.md`).

**Tests / config (prompt 56–60):**  
`tests/unit/*`, `tests/integration/api-*.test.ts`, `vitest.config.ts`, `tsconfig.json`.

**Scripts (prompts 07, 31, 55, 57):**  
`scripts/public-route-smoke.mjs`, `scripts/auth-smoke.mjs`, `scripts/e2e-smoke.mjs`, `scripts/playwright-smoke-lib.mjs`, `scripts/qa-finalize-order-edge.mjs`, `scripts/deploy-production.sh`, `scripts/deploy-edge-functions.sh`, `scripts/smoke-test-production.sh`, ElevenLabs helper scripts.

**Product (60-prompt fixes — subset; full list in FLOW_QA changelog):**  
Edge `supabase/functions/*`, `_shared/agent-tool-auth.ts`, dashboard/notifications/billing/analytics/admin components, `MenuScanner`, `LiveMenuSidebar`, `VoiceAgentPanel`, API routes (scanner commit/discard, orders), `lib/env.*`, `.env.example`.

### Git snapshot after triage (2026-05-23)

| Bucket | Count | Notes |
|--------|-------|-------|
| Modified tracked | **37** | ~5.3k insertions / ~1.7k deletions vs HEAD |
| Untracked | **168** | All classified **ship** (see tables above) |
| Removed | **1** | Root MP4 duplicate |
| `.gitignore` | **+2 patterns** | `/*.mp4`, `/*.mov` at repo root |

**Last commits on branch (for context):**  
`6f43cc7` voice menu tool / dietary / upsell · `be9ef17` realtime + prompt hygiene · `ca09bf1` mobile dashboard · `fe8624c` env example · `4326c78` restaurant card UI.

---

## Cursor / agent activity

- **Feature-flow QA:** Parent session [`355b4b18-3f03-4d76-986f-55feedb5824e`](355b4b18-3f03-4d76-986f-55feedb5824e) — prompts 01–60; produced/expanded `FLOW_QA_REPORT.md`, `LAUNCH_BLOCKERS.md`, tests, and targeted product fixes.
- **This pass:** Launch finalization **40/40 complete** — committed locally; **push withheld** (LB-01 P0).

---

## Next steps (finalization queue)

| # | Action |
|---|--------|
| ~~02~~ | ~~Triage working tree~~ — **done** (this doc § Diff triage) |
| ~~03~~ | Public visual audit — **done** (see § Public visual audit); static **45/45**; live browser optional |
| ~~04~~ | Homepage polish — **done** (see § Homepage polish); re-verified static tests this pass |
| ~~05~~ | Pricing polish — **done** (see § Pricing polish) |
| ~~06~~ | Blog index + article template — **done** (see § Blog polish) |
| ~~07~~ | Auth login/signup onboarding polish — **done** (see § Auth polish) |
| ~~08~~ | Demo / about / contact / legal — **done** (see § Demo / about / contact / legal) |
| ~~09~~ | Dashboard shell UX — **done** (see § Dashboard shell); signed-in browser **needs E2E creds** |
| ~~10~~ | KDS workspace UX — **done** (see § KDS workspace); signed-in KDS browser **needs E2E creds** |
| ~~11~~ | Onboarding UX — **done** (see § Onboarding UX); signed-in wizard E2E **needs E2E creds** |
| ~~12~~ | Menu scanner live pass — **done** (see § Menu scanner); signed-in review/commit UI **needs E2E creds** |
| ~~13~~ | Menu editor live pass — **done** (see § Menu editor); signed-in CRUD UI **needs E2E creds** |
| ~~14~~ | Phone order / KDS live pass — **done** (see § Phone order / KDS); signed-in status buttons **needs E2E creds** |
| ~~15~~ | Voice agent panel — **done** (see § Voice agent panel); signed-in Connect/Re-sync UI **needs E2E creds** |
| ~~16~~ | LB-01 phone stack — **shrunk** (see § LB-01); DNS + live Twilio **needs human** |
| ~~17~~ | ElevenLabs batch re-sync — **done** (see § ElevenLabs batch re-sync); connect unlinked restaurants via KDS as needed |
| ~~18~~ | `get_menu_items` ElevenLabs-exact — **done** (see § get_menu_items); `npm run qa:get-menu-elevenlabs` |
| ~~19~~ | Draft/finalize ElevenLabs-exact — **done** (see § Draft/finalize); `npm run qa:draft-finalize-elevenlabs` |
| ~~20~~ | LB-03 signing secret parity — **closed** (see § LB-03 signing); `npm run ensure:signing-parity` |
| ~~21~~ | Billing launch posture — **done** (see § Billing launch); LB-02 **downgraded** |
| ~~22~~ | Notifications live pass — **done** (see § Notifications live); `npm run qa:notifications-live` |
| ~~23~~ | Analytics live pass — **done** (see § Analytics live); `npm run qa:analytics-live` |
| ~~24~~ | Admin ops live pass — **done** (see § Admin ops live); `npm run qa:admin-ops-live` |
| ~~25~~ | Tenant isolation final confirmation — **done** (see § Tenant isolation); `npm run qa:tenant-isolation` |
| ~~26~~ | Auth/session/security — **done** (see § Auth/security); `npm run qa:auth-security` |
| ~~27~~ | Deploy/smoke readiness — **done local** (see § Deploy/smoke); prod blocked (**LB-04**); signup import **fixed** |
| ~~28~~ | Responsive UI sweep — **done** (see § Responsive); FAQ invisible **fixed**; `npm run qa:responsive-sweep` **33/33** |
| ~~29~~ | Accessibility/performance — **done** (see § A11y/perf); hydration + SVG **fixed**; `npm run qa:a11y-perf` **13/13** |
| ~~30~~ | Error/empty states — **done** (see § Error/empty); formatters + `npm run qa:error-states` **9/9** |
| ~~31~~ | Operator doc handoff — **done** (see § Operator handoff); DEPLOYMENT, ELEVENLABS, TESTING, blockers aligned |
| ~~32~~ | Test suite stabilization — **done** (see § Test suite); **555/555**; 4 regression tests + create dialog `role="alert"` |
| ~~33~~ | Full local regression — **done** (see § Full local regression); lint/test/build **pass**; 4 missing-import build fixes |
| ~~34~~ | Browser E2E smoke — **done guest** (see § Browser E2E); **11/11** + **9/9** + **15/15**; signed-in via bootstrap **14/15** |
| ~~35~~ | Owner customer journey — **done** (see § Owner journey); **11/11**; env.public + auth-form fixes |
| ~~36~~ | Final product copy pass — **done** (see § Final product copy); KDS/voice-agent jargon removed from public pages |
| ~~37~~ | Final code hygiene — **done** (see § Final code hygiene); build `parseEnv` fix; `.qa-screenshots/` gitignored |
| ~~38~~ | Launch blocker decision — **done** (see § Final launch blocker decision); LB-01 P0 + LB-04 P1 remain; LB-03 closed; LB-02 downgraded |
| **39** | Prepare commit — **done** (see § Prepare commit); **700 files staged**; message ready |
| ~~40~~ | Commit — **done**; push **withheld** (LB-01 P0) — see § Commit and push |

See [`launch-finalization-40-prompts.md`](./launch-finalization-40-prompts.md).

---

## Changelog

| Date | Prompt | Summary |
|------|--------|---------|
| 2026-05-23 | Launch 01/40 | Initial snapshot from FLOW_QA 60/60 + LAUNCH_BLOCKERS + git status; no product code changes |
| 2026-05-23 | Launch 02/40 | Diff triage: 205 paths classified; deleted root MP4 duplicate; `.gitignore` root video patterns; LAUNCH_BLOCKERS non-blocker note for uncommitted tree |
| 2026-05-23 | Launch 03/40 | Public visual audit **closed** — static QA 45/45 (no dev server); live browser sweep optional |
| 2026-05-23 | Launch 04/40 | Homepage copy + layout polish; pill in hero stack; CTA band description; tests updated; desktop/mobile screenshots |
| 2026-05-23 | Launch 05/40 | Pricing simplified: headline + $0.90 card, billable/free lists, pilot setup, CTA band; removed `pricing-what-counts.tsx` |
| 2026-05-23 | Launch 06/40 | Blog glass theme cascade fix; compact related/grid cards; poster yellow overrides; browser `/blog` + article |
| 2026-05-23 | Launch 07/40 | Auth split login layout; signup default onboarding `next`; header + error a11y; cross-link helpers |
| 2026-05-23 | Launch 08/40 | Demo hero mailto + signup; call-step times; legal/contact/about theme + shorter copy |
| 2026-05-23 | Launch 09/40 | Dashboard shell a11y/nav polish; loading skeleton; restaurants empty/loading; Realtime badge scoped |
| 2026-05-23 | Launch 10/40 | KDS ops-first layout; overflow-safe panels; profile collapsed; voice harness collapsed; empty-state copy |
| 2026-05-23 | Launch 11/40 | Onboarding skip paths (menu/test call); resume-aware nav; hours copy fix; account continue CTA |
| 2026-05-23 | Launch 12/40 | Menu fixture PNG; live Gemini extract pass; scanner error UX; discard-on-fail; history alert |
| 2026-05-23 | Launch 13/40 | Menu editor refresh + menu-changed sync; get-menu parity test; editor a11y alerts |
| 2026-05-23 | Launch 14/40 | Phone order Edge QA script; KDS visibility refetch; tab-bucket tests; dry-run finalize cart clear |
| 2026-05-23 | Launch 15/40 | Voice panel QA script (8/8); sanitized connect errors; env gate + next-step UX |
| 2026-05-23 | Launch 16/40 | LB-01 QA script; ElevenLabs-exact get_menu 200; LB-01 shrunk (DNS + Twilio remain) |
| 2026-05-23 | Launch 17/40 | Batch resync script; 1/1 configured restaurant verified; list-only mode |
| 2026-05-23 | Launch 18/40 | get_menu_items ElevenLabs-exact QA (6/6); fetch-synced-tool helper |
| 2026-05-23 | Launch 19/40 | draft/finalize ElevenLabs-exact QA (11/11); KDS, receipt, usage, idempotency |
| 2026-05-23 | Launch 20/40 | LB-03 closed: signing secret local+Edge; ensure script; qa-lb03 5/5; agent re-sync |
| 2026-05-23 | Launch 21/40 | Billing pilot UI honesty; LB-02 downgraded; launch-posture + billing-launch QA tests |
| 2026-05-23 | Launch 22/40 | Notifications live 11/11; provider-posture UI; MCP RLS member UPDATE blocked; notifications-live QA tests |
| 2026-05-23 | Launch 23/40 | Analytics live 17/17 vs Legacy POC usage; range/empty/chart checks; analytics-live QA tests |
| 2026-05-23 | Launch 24/40 | Admin ops live 31/31; access gates + health sanitization + no secret leakage in snapshot/API |
| 2026-05-23 | Launch 25/40 | Tenant isolation MCP JWT probe + 75 Vitest + qa:tenant-isolation 11/11; no leaks; Org B notification_settings fixture |
| 2026-05-23 | Launch 26/40 | Auth/security 18/18 + 43 Vitest; redirects/callback/signout/API 401; no client secret leaks |
| 2026-05-23 | Launch 27/40 | Deploy smoke local 6/6 + auth/e2e Playwright pass; prod getroal.com 0/5; signup missing import fixed; qa:deploy-smoke 6/8 |
| 2026-05-23 | Launch 28/40 | Responsive sweep 33/33; FAQ scroll-reveal invisible fixed; tap targets + demo text + auth nav polish |
| 2026-05-23 | Launch 29/40 | A11y/perf 13/13; hydration time fix; demo SVG path fix; qa:a11y-perf script |
| 2026-05-23 | Launch 30/40 | Error/empty 9/9; formatAuthError + formatSupabaseClientError; API leak fix; qa:error-states |
| 2026-05-23 | Launch 31/40 | Operator docs: DEPLOYMENT §8 QA, ELEVENLABS signing parity, TESTING launch scripts; stale secret/billing instructions removed |
| 2026-05-23 | Launch 32/40 | Test stabilization 555/555; regressions for signup import, restaurants 500, demo hydration, create dialog alert; qa:error-states 10/10 |
| 2026-05-23 | Launch 33/40 | Full regression lint/test/build pass; fixed KDS/notifications/menu-import/onboarding missing imports; MenuScanner exhaustive-deps documented |
| 2026-05-23 | Launch 34/40 | Browser E2E guest pass 11/11 + 9/9 + 15/15; signed-in skipped (no E2E_*); bootstrap-e2e-smoke-user.mjs added |
| 2026-05-23 | Launch 35/40 | Owner journey 11/11; fixed client env inlining + FormData login; qa:owner-journey script |
| 2026-05-23 | Launch 36/40 | Public copy pass: kitchen screen vs KDS, ROAL vs voice agent, honest pricing FAQ; product-language + launch-faq tests pass |
| 2026-05-23 | Launch 37/40 | Code hygiene: `parseEnv` typing fixes build; restaurants API catch log sanitized; `.qa-screenshots/` gitignored |
| 2026-05-23 | Launch 38/40 | Blocker decision: LB-01 P0 + LB-04 P1 open (prod DNS/hosting); pilot onboarding go / live prod phone no-go; LAUNCH_BLOCKERS restructured |
| 2026-05-23 | Launch 39/40 | Staged 700 launch files; commit message prepared; no secrets staged |
| 2026-05-30 | Launch 27–37 | Launch checklist, onboarding provision, ops notifications, tenant isolation, migrations 025–027, Edge redeploy, live QA, dashboard mobile rail fixes, `FEATURE_READINESS_AUDIT.md` |
| 2026-05-30 | Launch 38/40 | conversation-init fail-closed; QA ordering-open helper; phone-order KDS + ElevenLabs draft/finalize **pass** |
| 2026-05-30 | Launch 39/40 | Readiness sweep: no fake dashboard data; dedicated-agent connect guard; no user SQL path; mobile 14/14 evidence — this section |
| 2026-05-23 | Launch 40/40 | Committed on `main`; push withheld — LB-01 P0 (prod DNS + Twilio) |
| 2026-05-23 | KDS refocus 40/80 | Functional pass: Live orders `/[id]` vs Menu setup `/menu`; 35+ targeted Vitest; build pass; `KDS_REFOCUS_PLAN.md` updated; **VoiceAgentPanel** on menu UI still open (KDS-REF-01); **not committed** |
| 2026-05-23 | KDS/UI 68–71/80 | Dashboard shell nav/typography; locations CTAs; onboarding copy; settings/billing/support theme alignment |
| 2026-05-23 | KDS/UI 72–74/80 | Public copy trim + FAQ shorten; lavender/ink color pass; focus rings public + dashboard |
| 2026-05-23 | KDS/UI 75/80 | `kds-workspace-states` — KDS empty/loading/banners; menu sidebar + import history states |
| 2026-05-23 | KDS/UI 76–78/80 | Lint clean (`MenuScanner` hooks); **162** focused Vitest; build pass (`typography.css` layer fix) |
| 2026-05-23 | KDS/UI 79/80 | `KDS_REFOCUS_PLAN.md` + this doc — UI summary, mobile status, tests, remaining issues |
| 2026-05-23 | Safety recovery | Closed gaps **19, 20, 24, 59**: call indicator, menu-changed banner, `VoiceAgentPanel` on `/menu`, `HomeMetricsStrip` on landing; prompt audit in `KDS_REFOCUS_PLAN.md` |
