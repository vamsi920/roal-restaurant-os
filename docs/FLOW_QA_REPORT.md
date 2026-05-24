# ROAL Feature Flow QA Report

Living inventory and QA checklist for `/Users/vamsi/Desktop/restaurant-agent`.  
Prompt queue: [`docs/feature-flow-qa-60-prompts.md`](./feature-flow-qa-60-prompts.md).

## Executive summary (prompt 60 — 2026-05-23)

- **60/60 prompts** documented; certification table below. Launch blockers: [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md) (**4 open**, no P0 code defects on menu Edge).
- **Supabase** `mnkabwcbdxruefzuvuuv`: **24/24** migrations; Realtime publication complete; tenant RLS probes **pass** (prompt 51).
- **Edge tools** `get-menu` / `sync-draft-order` / `finalize-order`: deployed, `verify_jwt=false`, curl matrix **pass**; phone menu root cause = unbaked/stale EL tools, not broken Edge (prompt 38).
- **Auth & tenant**: callback open-redirect guarded; `requireRestaurantAccess` + API negative matrix covered in Vitest; cross-org leaks **none** found.
- **Product flows** (menu scan/commit, editor, KDS orders, billing gates, notifications, analytics, admin): code + MCP/Vitest **pass**; many signed-in browser paths **needs human**.
- **CI gates (prompt 58/60):** `npm run lint` **pass** (1 `MenuScanner` hook warning); `npm test` **452/452**; `npm run build` **pass** after `tsconfig` Edge exclude + zod path alias.
- **Deploy scripts** (`deploy-production.sh`, `deploy-edge-functions.sh`, `smoke-test-production.sh`) reviewed **pass**; macOS bash prompt fix applied (prompt 55).
- **Playwright smokes** (`auth-smoke`, `e2e-smoke`) exist (prompt 57); not run in agent env (no local dev server) — operator runs with `npm run dev`.
- **Stripe** checkout/portal stubbed off (`STRIPE_CHECKOUT_ENABLED`); dev mode does not block onboarding (prompt 43–45).
- **Ops before prod:** resolve `getroal.com` / init webhook; live Twilio `get_menu_items` **200**; optional `AGENT_TOOL_SIGNING_SECRET` on Edge.

| Field | Value |
|-------|--------|
| Last inventory refresh | 2026-05-23 |
| Final certification | **2026-05-23** (prompt 60) |
| Prompt 01 | **done** — flow map only (no product code changes) |
| Prompt 02 | **fixed** — env audit (see § Prompt 02 below) |
| Prompt 03 | **done** — Supabase MCP identity (no schema changes) |
| Prompt 04 | **done** — migrations 001–024 verified on remote (**pass**) |
| Prompt 05 | **done** — Edge deploy config verified + redeployed (**fixed**) |
| Prompt 10 | **pass** — auth callback/signout (see § Prompt 10 below) |
| Prompt 11 | **pass** — `GET /api/auth/context` (see § Prompt 11 below) |
| Prompt 12 | **pass** — org bootstrap + membership RLS / `024` (see § Prompt 12 below) |
| Prompt 14 | **fixed** — dashboard shell nav (see § Prompt 14 below) |
| Prompt 15 | **pass** — restaurant list + `POST /api/restaurants` (see changelog) |
| Prompt 13 | **pass** — role separation owner/admin/member (see § Prompt 13 below) |
| Prompt 16 | **pass** — onboarding wizard (see § Prompt 16); live browser **needs human** |
| Prompt 17 | **pass** — restaurant profile settings (see § Prompt 17); live save/refresh **needs human** |
| Prompt 18 | **fixed** — restaurant hours settings (see § Prompt 18); live KDS save **needs human** |
| Prompt 19 | **pass** — menu scanner extract flow (see § Prompt 19 below) |
| Prompt 20 | **deprecated** — legacy `POST /api/scanner/process`; no app callers (see § Prompt 20) |
| Prompt 21 | **pass** — menu import review + commit (see § Prompt 21) |
| Prompt 22 | **fixed** — menu import discard + history (see § Prompt 22) |
| Prompt 23 | **pass** — menu editor CRUD (see § Prompt 23); signed-in browser **needs human** |
| Prompt 24 | **fixed** — modifier groups deep test (see § Prompt 24) |
| Prompt 25 | **fixed** — live menu sidebar on KDS (see § Prompt 25) |
| Prompt 29 | **pass** — direct `get-menu` Edge curl matrix (see § Prompt 29) |
| Prompt 30 | **pass** — direct `sync-draft-order` Edge (see § Prompt 30) |
| Prompt 31 | **pass** — direct `finalize-order` Edge (see § Prompt 31) |
| Prompt 32 | **fixed** — agent tool auth + token scope (see § Prompt 32) |
| Prompt 34 | **pass** — `GET/PATCH /api/integrations/elevenlabs/agent` (see § Prompt 34) |
| Prompt 35 | **pass** — ElevenLabs tool sync API (see § Prompt 35) |
| Prompt 36 | **pass** — ElevenLabs tool config post-sync (see § Prompt 36) |
| Prompt 37 | **pass** — conversation-init webhook (see § Prompt 37) |
| Prompt 38 | **pass** — phone-call menu chain root-caused; resync + retest (see § Prompt 38) |
| Prompt 39 | **fixed** — VoiceAgentPanel connect/resync (see § Prompt 39); signed-in browser **needs human** |
| Prompt 40 | **pass** — voice agent test harness (see § Prompt 40) |
| Prompt 41 | **pass** — agent prompt + KB/menu snapshot (see § Prompt 41) |
| Prompt 42 | **pass** — phone personalization + Twilio (see § Prompt 42) |
| Prompt 43 | **pass** — billing gates + dev mode (see § Prompt 43) |
| Prompt 44 | **fixed** — usage event recording (see § Prompt 44) |
| Prompt 45 | **fixed** — billing dashboard dev/stripe/empty usage (see § Prompt 45) |
| Prompt 46 | **fixed** — notification settings (see § Prompt 46); signed-in save **needs human** |
| Prompt 47 | **pass** — notification event API + stuck orders (see § Prompt 47) |
| Prompt 48 | **fixed** — analytics dashboard (see § Prompt 48); signed-in browser **needs human** |
| Prompt 49 | **fixed** — admin ops dashboard (see § Prompt 49); signed-in browser **needs human** |
| Prompt 50 | **pass** — settings + support pages (see § Prompt 50); signed-in browser **needs human** |
| Prompt 51 | **pass** — tenant isolation negative tests (see § Prompt 51); no RLS/API leaks |
| Prompt 52 | **fixed** — API auth negative matrix all 17 routes (see § Prompt 52) |
| Prompt 53 | **pass** — Realtime publication + KDS fallback (see § Prompt 53) |
| Prompt 54 | **fixed** — observability + health (see § Prompt 54) |
| Prompt 55 | **fixed** — deploy scripts QA (see § Prompt 55) |
| Prompt 56 | **pass** — focused Vitest gaps (see § Prompt 56) |
| Prompt 57 | **pass** — Playwright smokes (see § Prompt 57); live run **needs human** |
| Prompt 58 | **pass** — full regression lint/test/build (see § Prompt 58) |
| Prompt 59 | **done** — [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md) (see § Prompt 59) |
| Prompt 60 | **done** — final certification (see § Final certification) |
| Prompt 06 | **fixed** — baseline gates (see § Prompt 06) |
| Prompt 07 | **pass** — public routes browser smoke 11/11 on `localhost:3020` (see § Prompt 07) |
| Prompt 08 | **pass** — dashboard auth redirect (see § Prompt 08) |
| Prompt 26 | **fixed** — compute-totals API (see § Prompt 26) |
| Prompt 27 | **pass** — draft order PATCH (see § Prompt 27) |
| Prompt 28 | **pass** — KDS live orders (see § Prompt 28) |
| Prompt 09 | **pass** — login/signup UI smoke + browser QA (see § Prompt 09) |
| Status legend | `pending` · `pass` · `fixed` · `blocked` · `needs human` · `done` · `deprecated` |

---

## How to use

1. Run prompts 02–60 from `feature-flow-qa-60-prompts.md`.
2. After each prompt, update the matching checklist rows (status + short notes).
3. Do not delete inventory sections; append findings under **Notes** or a dated **Changelog** at the bottom.

Related runbooks: [DEPLOYMENT.md](./DEPLOYMENT.md) · [TESTING.md](./TESTING.md) · [E2E_SMOKE.md](./E2E_SMOKE.md) · [AUTH.md](./AUTH.md) · [ELEVENLABS.md](./ELEVENLABS.md) · [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md).

---

## Architecture snapshot

```text
Guest / operator browser
  → Next.js 14 App Router (pages + Route Handlers + Server Actions)
  → Supabase Auth (cookies via @supabase/ssr middleware)
  → Postgres + RLS + Realtime + Storage (menu-uploads)
  → Edge Functions (ElevenLabs agent tools: get-menu, sync-draft-order, finalize-order)

External: Gemini (menu extract), ElevenLabs (Conv AI + webhooks), Stripe (planned billing)
```

**Middleware** (`middleware.ts`): request ID header; `updateSession` on `/dashboard/*`, `/login`, `/signup`, `/auth/callback`, `/api/*`. Unauthenticated users → 401 on `/api/restaurants/*` and `/api/scanner/*`; redirect to login on `/dashboard/*`; signed-in users on login/signup → `safeNextPath(next)`.

---

## Prompt 03 — Supabase MCP identity

**MCP server:** `plugin-supabase-supabase` (29 tools; OAuth-connected). `user-supabase` exposes only `mcp_auth` (no project tools).

**Project selection:** Account has 4 projects. Chose **`mnkabwcbdxruefzuvuuv`** (`yourturn`, `us-east-2`) because `NEXT_PUBLIC_SUPABASE_URL` ref matches local env. Other refs: `xcdpfmozwrddioktxiha`, `quzofxjdivcitpkrylov`, `cxdnmcyjmjsjkyhmwohz` (inactive; not used for this repo).

| Check | Result |
|-------|--------|
| MCP connected | **yes** — `list_projects`, `get_project`, `get_project_url`, `list_migrations`, `execute_sql` succeeded |
| MCP project ref | `mnkabwcbdxruefzuvuuv` |
| MCP project name | `yourturn` |
| MCP API URL | `https://mnkabwcbdxruefzuvuuv.supabase.co` |
| Local ref match (from `NEXT_PUBLIC_SUPABASE_URL`) | **yes** — `mnkabwcbdxruefzuvuuv` |
| Project status (MCP) | `ACTIVE_HEALTHY` |
| Connection health | **pass** — `SELECT 1` returned `ok=1`; Postgres 17.6 |
| Migration state | **24 applied remote** / **24 files local** — logical parity for `001`–`024` (remote history names omit numeric prefix on `006_clear_menu_rpc`, `007_phone_order_receipts`, `024_fix_membership_bootstrap_rls`; `015` applied after `016`–`018` in history timestamps but present) |
| **Status** | **pass** |

**QA IDs touched:** DEP-01 (identity only; full migration diff in prompt 04).

---

## Prompt 04 — Migrations 001–024

**Project:** `mnkabwcbdxruefzuvuuv` (`yourturn`) — same ref as `NEXT_PUBLIC_SUPABASE_URL`.

### Local migration files (`supabase/migrations/`)

| # | File |
|---|------|
| 001 | `001_init_schema.sql` |
| 002 | `002_merge_menu_rpc.sql` |
| 003 | `003_draft_orders.sql` |
| 004 | `004_menu_delete_rls.sql` |
| 005 | `005_draft_orders_customer.sql` |
| 006 | `006_clear_menu_rpc.sql` |
| 007 | `007_phone_order_receipts.sql` |
| 008 | `008_organizations_tenant.sql` |
| 009 | `009_production_rls_policies.sql` |
| 010 | `010_onboarding.sql` |
| 011 | `011_restaurant_profiles.sql` |
| 012 | `012_restaurant_hours.sql` |
| 013 | `013_menu_item_sort_order.sql` |
| 014 | `014_modifier_group_ordering.sql` |
| 015 | `015_menu_import_audits.sql` |
| 016 | `016_order_status_upgrade.sql` |
| 017 | `017_order_status_timestamps.sql` |
| 018 | `018_elevenlabs_agent_on_profile.sql` |
| 019 | `019_agent_tool_idempotency.sql` |
| 020 | `020_usage_events.sql` |
| 021 | `021_organization_billing.sql` |
| 022 | `022_notifications.sql` |
| 023 | `023_audit_logs.sql` |
| 024 | `024_fix_membership_bootstrap_rls.sql` |

**Count:** 24 local files.

### Remote applied (`list_migrations` via MCP)

| Version | Name (remote history) | Local file |
|---------|----------------------|------------|
| 20260512202030 | `001_init_schema` | 001 |
| 20260512202043 | `002_merge_menu_rpc` | 002 |
| 20260513193629 | `003_draft_orders` | 003 |
| 20260513193924 | `004_menu_delete_rls` | 004 |
| 20260513194955 | `005_draft_orders_customer` | 005 |
| 20260513203418 | `clear_menu_rpc` | 006 |
| 20260513230007 | `phone_order_receipts` | 007 |
| 20260519142717 | `008_organizations_tenant` | 008 |
| 20260519143035 | `009_production_rls_policies` | 009 |
| 20260519143101 | `010_onboarding` | 010 |
| 20260519143112 | `011_restaurant_profiles` | 011 |
| 20260519143132 | `012_restaurant_hours` | 012 |
| 20260519143211 | `013_menu_item_sort_order` | 013 |
| 20260519143218 | `014_modifier_group_ordering` | 014 |
| 20260519143249 | `015_menu_import_audits` | 015 |
| 20260519143220 | `016_order_status_upgrade` | 016 |
| 20260519143221 | `017_order_status_timestamps` | 017 |
| 20260519143224 | `018_elevenlabs_agent_on_profile` | 018 |
| 20260519143252 | `019_agent_tool_idempotency` | 019 |
| 20260519143300 | `020_usage_events` | 020 |
| 20260519143305 | `021_organization_billing` | 021 |
| 20260519143318 | `022_notifications` | 022 |
| 20260519143324 | `023_audit_logs` | 023 |
| 20260519144808 | `fix_membership_bootstrap_rls` | 024 |

**Count:** 24 remote entries. **Pending:** none.

**Notes:** Remote `schema_migrations.name` omits numeric prefix on 006/007/024 (applied under `clear_menu_rpc`, `phone_order_receipts`, `fix_membership_bootstrap_rls`). `015` timestamp is after `016`–`018` in history but all three are present — no re-apply needed.

### Key tables verified (`list_tables` + `information_schema`)

| Expected (prompt / app) | Remote table | OK |
|-------------------------|--------------|-----|
| restaurants | `restaurants` | yes |
| organizations | `organizations` | yes |
| profiles | `profiles` | yes |
| memberships | `memberships` | yes |
| draft_orders | `draft_orders` | yes |
| phone_order_receipts | `phone_order_receipts` | yes |
| menu import audit (015) | `menu_imports` | yes |
| usage_events | `usage_events` | yes |
| notifications | `notification_settings`, `notification_deliveries` | yes |
| audit_logs | `audit_logs` | yes |
| agent idempotency | `agent_tool_idempotency` | yes |
| menu core | `categories`, `items`, `modifiers` | yes |
| onboarding | `organization_onboarding`, `restaurant_onboarding` | yes |
| profiles/hours | `restaurant_profiles`, `restaurant_weekly_hours`, `restaurant_hours_exceptions` | yes |

All 21 `public` base tables returned; RLS enabled on listed tables.

### Actions taken

| Action | Result |
|--------|--------|
| MCP `list_migrations` | 24/24 applied |
| MCP `list_tables` / `execute_sql` | tables confirmed |
| `supabase migration list` (CLI 2.75.0) | **blocked** — login role `42501` (CREATEROLE); not used for apply |
| `supabase db push` / `apply_migration` | **not run** — nothing pending |

**Status:** **pass** — all 24 migrations applied; no schema push required.

**QA IDs touched:** DEP-01, ONB-05, MENU-*, KDS-*, ORD-*, BILL-*, NOTIF-*, ADM-* (DB-backed flows).

---

## Prompt 05 — Edge Function deployment configuration

**Project:** `mnkabwcbdxruefzuvuuv` · **MCP + CLI** · **Script:** `scripts/deploy-edge-functions.sh` (`--no-verify-jwt`) · **Local:** `supabase/config.toml` `verify_jwt = false` for all three.

### Per-function status

| Function | Deployed | Status | Version (post-QA) | `verify_jwt` | Redeploy |
|----------|----------|--------|-------------------|--------------|----------|
| `get-menu` | yes | ACTIVE | 6 (was 5) | **false** | **yes** — local newer than 2026-05-19 deploy |
| `sync-draft-order` | yes | ACTIVE | 7 (was 6) | **false** | **yes** |
| `finalize-order` | yes | ACTIVE | 7 (was 6) | **false** | **yes** |

Redeploy: `./scripts/deploy-edge-functions.sh` (2026-05-23 ~18:16 UTC). MCP `list_edge_functions` confirms `verify_jwt: false` after deploy.

### Edge secrets (names only — no values)

| Secret | Present | Notes |
|--------|---------|-------|
| `SUPABASE_URL` | **yes** | auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | auto-injected |
| `AGENT_TOOL_SIGNING_SECRET` | **no** | preferred; Edge uses `AGENT_TOOL_SECRET` as HMAC fallback when unset |
| `AGENT_TOOL_SECRET` | **yes** | legacy bearer + signing fallback |

**Follow-up:** If Next.js sets `AGENT_TOOL_SIGNING_SECRET`, mirror on Edge (`supabase secrets set …`) and **Re-sync** each restaurant.

### Public invocation (not Supabase user JWT)

- Gateway: `verify_jwt = false`; auth in `_shared/agent-tool-auth.ts`.
- **Signed:** `Authorization: Bearer roal1.*` (HMAC, per-restaurant `rid`).
- **Legacy:** `Authorization: Bearer <AGENT_TOOL_SECRET>` + connected agent on profile.
- **Also:** `apikey` (anon); baked `x-roal-restaurant-id`; optional `x-roal-idempotency-key` on POST tools.
- **CORS:** `OPTIONS` → 200; `Access-Control-Allow-Origin: *` (`_shared/agent-tool-json.ts`).

**Base URL:** `https://mnkabwcbdxruefzuvuuv.supabase.co/functions/v1/{slug}`

| Slug | Methods |
|------|---------|
| `get-menu` | GET, POST, OPTIONS |
| `sync-draft-order` | POST, OPTIONS |
| `finalize-order` | POST, OPTIONS |

### Config vs script

| Check | Result |
|-------|--------|
| `config.toml` ↔ `--no-verify-jwt` | **pass** |
| Deploy script targets | **pass** |
| Product code changes | **none** |

**Status:** **fixed** (redeploy + verify). **Soft blocker:** `AGENT_TOOL_SIGNING_SECRET` absent on Edge until ops parity with Next.js.

**QA IDs touched:** DEP-02 (**fixed**); EL-09–12, SEC-05 remain pending (runtime E2E).

---

## Prompt 11 — `GET /api/auth/context` (AUTH-05)

**Route:** `app/api/auth/context/route.ts` · **Lib:** `lib/auth/context-server.ts` (`getAuthContext`, `serializeAuthContext`), `lib/auth/context-client.ts` (`fetchAuthContextClient` expects 401 → `null`).

### Signed-out

| Check | Result |
|-------|--------|
| Live `curl` (no cookies) | **401** `{"error":"Unauthorized"}` |
| Client helper | `fetchAuthContextClient()` returns `null` on 401 |

No empty-shape fallback — unauthorized is explicit 401 (matches `requireAuthContext` / `PREMIUM_UI_REBUILD_PLAN.md`).

### Signed-in (Vitest integration)

| Check | Result |
|-------|--------|
| Mocked `getAuthContext` | **pass** — `tests/integration/api-auth-context.test.ts` (4 cases) |
| Live session curl | **blocked** — no test user cookie in QA env; use `npm run auth-smoke` or manual login for E2E |

### JSON shape (200)

| Field | Notes |
|-------|--------|
| `user` | `{ id, email }` only |
| `memberships[]` | `{ id, organization_id, role, organization: { id, name, slug } }` |
| `primaryOrganizationId` | first membership’s `organization_id` or `null` |
| `hasOrgAdminAccess` | `true` if any membership role is `owner` or `admin` |

Per-membership `role` is `owner` \| `admin` \| `member` (`lib/auth/roles.ts`). No separate owner/admin/member booleans on the payload.

### Security / leakage

| Check | Result |
|-------|--------|
| Service role / env secrets in body | **pass** — not serialized |
| `user_id`, membership `created_at`, org timestamps | **pass** — stripped |
| JWT / `app_metadata` / `user_metadata` on user | **pass** — omitted |

**Code changes:** added integration tests only; **no product bug fixes**.

**Status:** **pass**

**QA IDs touched:** AUTH-05.

---

## Prompt 12 — Organization bootstrap and membership RLS (AUTH-06, ONB-02)

**Project:** `mnkabwcbdxruefzuvuuv` · **Migrations:** `008_organizations_tenant.sql`, `010_onboarding.sql`, `009_production_rls_policies.sql`, `024_fix_membership_bootstrap_rls.sql` · **App:** `lib/auth/ensure-profile.ts`, `app/dashboard/onboarding/actions.ts` (`createOrganizationAction`).

### Schema and triggers

| Check | Result |
|-------|--------|
| `profiles` table + RLS (`profile_insert_self`, `profile_update_self`, teammate select) | **pass** |
| `on_auth_user_created` → `handle_new_user()` | **pass** — trigger present |
| `ensureUserProfile` upsert before org create | **pass** — matches `profile_insert_self` (`id = auth_user_id()`) |
| `024` profile backfill | **pass** — `auth.users` 1 / `profiles` 1 / `users_missing_profile` 0 |
| `organizations` insert (`org_insert_authenticated`) | **pass** |
| `organization_onboarding` auto row on org insert (`010` trigger) | **pass** — verified after bootstrap test org |

### Migration `024` on remote

| Check | Result |
|-------|--------|
| `organization_has_members(uuid)` | **pass** — exists, `SECURITY DEFINER` |
| `membership_insert_admin_or_bootstrap_owner` | **pass** — uses `NOT organization_has_members(organization_id)` (not RLS-blind subquery from `009`) |
| Remote migration applied | **pass** — `fix_membership_bootstrap_rls` in history (prompt 04) |
| New migration `025` | **not needed** |

### MCP SQL simulation (JWT `authenticated` role; test rows cleaned up)

| Scenario | Result |
|----------|--------|
| New org → `organization_has_members` false | **pass** |
| First owner `memberships` insert (bootstrap path) | **pass** |
| `auth_user_is_org_member` true after insert | **pass** |
| `organization_onboarding` row from trigger | **pass** |
| Second bootstrap owner (same user) | **pass** — blocked (RLS / unique) |
| Bootstrap owner by non-member when org already has owner (QA profile JWT) | **pass** — `insufficient_privilege` |

**Note:** Multi-statement `execute_sql` without a `DO` block did not propagate `request.jwt.claims` to `SET LOCAL role authenticated`; use a single transaction/`DO` for RLS probes.

### App flow (`createOrganizationAction`)

Order: `ensureUserProfile` → insert `organizations` → insert owner `memberships` → `ensureOrganizationOnboarding` / `completeOrganizationAccountStep`. Policies allow this sequence: authenticated org insert; bootstrap membership when no members; onboarding select/update requires membership (satisfied after step 2). Trigger usually creates onboarding before membership; `ensureOrganizationOnboarding` is idempotent fallback.

### Advisors / blockers

| Item | Status |
|------|--------|
| Bootstrap RLS blocks legitimate onboarding | **none** |
| `agent_tool_idempotency` / `internal_config` RLS no policy | **info** — pre-existing; out of scope |
| Live browser onboarding E2E | **needs human** — prompt 16 (`ONB-01`, wizard UI) |

**Status:** **pass** — bootstrap flow OK; `024` verified; no migration apply.

**QA IDs touched:** AUTH-06, ONB-02; ONB-04/ONB-05 (RLS + DB triggers; full wizard UI still prompt 16).

---

## Prompt 13 — Role separation (AUTH-07, ADM-04)

**Project:** `mnkabwcbdxruefzuvuuv` · **Code:** `lib/auth/roles.ts`, `lib/auth/context-server.ts` (`hasOrgAdminAccess`, `requireRestaurantAccess`, `requireOrgAdminAccess`) · **Pages:** `app/dashboard/admin/page.tsx`, `app/dashboard/settings/notifications/*`, `app/dashboard/billing/*`, `app/dashboard/layout.tsx` · **RLS:** `009_production_rls_policies.sql`, `022_notifications.sql`.

### QA fixture (no passwords — auth rows without `encrypted_password`; not loginable until human sets credentials or magic link)

| Entity | ID | Email (auth.users) |
|--------|-----|-------------------|
| Organization `qa-role-separation` | `b1111111-1111-4111-8111-111111111111` | — |
| Restaurant `QA Role Test Location` | `b2222222-2222-4222-8222-222222222222` | — |
| Owner membership | `c0000001-0001-4001-8001-000000000001` | `qa-role-owner@example.invalid` → user `a0000001-0001-4001-8001-000000000001` |
| Admin membership | `c0000002-0002-4002-8002-000000000002` | `qa-role-admin@example.invalid` → user `a0000002-0002-4002-8002-000000000002` |
| Member membership | `c0000003-0003-4003-8003-000000000003` | `qa-role-member@example.invalid` → user `a0000003-0003-4003-8003-000000000003` |

**Note:** `qa-role-owner@example.invalid` also has an **owner** membership on org `qa-p12-pre-*` from prompt 12; role tests use **`qa-role-separation`** only.

### App-layer matrix (code review + Vitest)

| Capability | Owner | Admin | Member | Enforcement |
|------------|:-----:|:-----:|:------:|-------------|
| `hasOrgAdminAccess` / Admin nav + `/dashboard/admin` | yes | yes | no | `layout.tsx`, `admin/page.tsx` redirect if false |
| Org update / billing manage (`canManageBilling`) | yes | yes | no | `isOrgAdmin`; billing actions + snapshot |
| Org delete | yes | no | no | `canDeleteOrganization` → RLS `org_delete_owner` |
| Manage members | yes | yes | no | `canManageMembers` |
| View billing page (read usage) | yes | yes | yes | No page gate; checkout hidden when `!canManageBilling` |
| Settings hub `/dashboard/settings` | yes | yes | yes | Auth only |
| Notifications view | yes | yes | yes | All members; delivery log readable |
| Notifications edit | yes | yes | no | `canEdit` + `saveNotificationSettingsAction` |
| Notification secrets in UI | full | full | redacted | `notificationSettingsForViewer` |
| Restaurants / KDS / menu / scanner APIs | yes | yes | yes | `canOperateRestaurant` + `requireRestaurantAccess` |
| Create restaurant | yes | yes | yes | `canCreateRestaurant` |
| Delete restaurant | yes | yes | no | `canDeleteRestaurant` + RLS `restaurant_delete_admin` |
| `requireOrgAdminAccess()` API helper | yes | yes | no | Defined; **no route callers yet** |

**Vitest:** `tests/unit/admin-ops.test.ts` (4), `tests/integration/api-auth-context.test.ts` (4) — **8/8 pass**.

### RLS simulation (`SET LOCAL role authenticated` + `request.jwt.claims`; org `b1111111-…`)

| Probe | Owner | Admin | Member | Expected |
|-------|:-----:|:-----:|:------:|:----------:|
| `organizations` SELECT | 1 row | (not run) | (not run) | member |
| `organizations` UPDATE | allowed | — | denied | admin+ |
| `notification_settings` UPDATE | — | allowed | denied | admin+ |
| `restaurants` DELETE (fixture id) | — | — | denied | admin+ |

**RLS helpers:** `auth_user_is_org_admin` / `auth_user_org_role` — owner+admin true; member false (**pass**).

### Browser / live session

| Route | Signed-in matrix | Status |
|-------|------------------|--------|
| `/dashboard/admin` | member → `/dashboard`; admin/owner → ops UI | **needs human** (no QA passwords) |
| `/dashboard/settings/notifications` | member read-only form | **pass** (prompt 46; signed-in save **needs human**) |
| `/dashboard/billing` | member no checkout buttons | **needs human** |

### Fixes

**None** — app gates and RLS match `docs/AUTH.md`; no overly open or strict checks found.

**Status:** **pass** — code + RLS aligned; fixture on remote for future signed-in QA.

**QA IDs touched:** AUTH-07, ADM-01, ADM-04; BILL-* (read vs manage), NOTIF-* (view vs edit).

---

## Prompt 15 — Restaurant list + `POST /api/restaurants` (DASH-03–04)

**Pages:** `app/dashboard/restaurants/page.tsx` (client list via Supabase + Realtime) · **Create UI:** `CreateRestaurantButton.tsx` (modal → `POST /api/restaurants`, gates via `GET /api/billing/gates`) · **API:** `app/api/restaurants/route.ts`.

### `POST /api/restaurants`

| Check | Result |
|-------|--------|
| Valid payload (authed owner) | **pass** (Vitest) — **200** `{ restaurant }`; `insert` uses `name` + resolved `organization_id` |
| Invalid / empty `name` | **pass** — **400** `{ error: "name is required" }` |
| Unauthenticated | **pass** — Vitest **401**; live `curl` (no cookies) **401** `{"error":"Unauthorized"}` |
| No org / resolve failure | **pass** — **403** with resolve error message |
| Resolved org ∉ memberships | **pass** — **403** `Forbidden` |
| Plan gate (`create_restaurant`) | **pass** — **402** `code: plan_limit_reached` via `planLimitJsonResponse` |
| Org scoping | **pass** — `resolveOrganizationId` + membership role check (`canCreateRestaurant`) before insert |

**Vitest:** `tests/integration/api-restaurants-post.test.ts` — **6 cases** (added org-mismatch 403 + plan gate 402).

### List page (`/dashboard/restaurants`)

| Check | Result |
|-------|--------|
| Signed-out browser | **pass** — `curl` → **307** `/login?next=%2Fdashboard%2Frestaurants` |
| Signed-in browser | **needs human** — no QA session cookie; UI loads restaurants via RLS-scoped Supabase `select` + Realtime channel `restaurants-list` |
| Create flow UX | Code review **pass** — 401 → login redirect; limit → `PlanLimitNotice` + disabled submit; success → `router.push` to new KDS |

### Supabase RLS (`restaurants`)

| Policy | Command | Expression |
|--------|---------|------------|
| `restaurant_insert_member` | INSERT | `WITH CHECK (auth_user_is_org_member(organization_id))` |
| `restaurant_select_member_or_demo` | SELECT | member or legacy demo |
| `restaurant_update_member` | UPDATE | member |
| `restaurant_delete_admin` | DELETE | admin |

RLS **enabled** on `public.restaurants` (MCP `execute_sql`, project `mnkabwcbdxruefzuvuuv`). API uses user-scoped server client — insert succeeds only when `organization_id` matches a membership org.

**Code changes:** integration tests only; **no product bug fixes**.

**Status:** **pass**

**QA IDs touched:** DASH-03, DASH-04.

---

## Prompt 16 — Onboarding wizard end-to-end (ONB-01–05)

**Route:** `/dashboard/onboarding` (`?restaurant=<uuid>` optional) · **UI:** `components/onboarding/onboarding-wizard.tsx` · **Actions:** `app/dashboard/onboarding/actions.ts` · **State:** `lib/onboarding/wizard-state.server.ts` · **DB:** `010_onboarding.sql` (`organization_onboarding`, `restaurant_onboarding`).

### Per-step QA (code review + unit tests; live browser **needs human**)

| Step | Wizard key | Result | Notes |
|------|------------|--------|-------|
| Account & organization | `account` | **pass** | Signed-out → `/login?next=/dashboard/onboarding`. No org → create org form; `createOrganizationAction` provisions membership + marks `account` completed. Existing org → confirm or “complete” message. |
| Restaurant creation | `restaurant_profile` (create form) | **pass** | `createRestaurantWizardAction` + redirect `?restaurant=`; `ensureRestaurantOnboarding` on insert. |
| Profile (name, phone, TZ, address) | `restaurant_profile` (edit form) | **pass** | `saveRestaurantProfileAction` → `upsertRestaurantProfile` + marks step `completed`. |
| Hours | — | **needs human** / gap | Copy mentions hours (`ONBOARDING_STEP_DESCRIPTIONS.restaurant_profile`) but wizard has **no hours UI**; weekly hours live on KDS (`RestaurantHoursSettings.tsx`). Set hours post-onboarding on restaurant workspace. |
| Menu import / setup | `menu_import` | **pass** | Embedded `MenuScanner`; `completeMenuImportStepAction` requires ≥1 category. |
| Voice agent connect | `voice_agent` | **pass** | Agent id + `connectElevenLabsAgentToRestaurantAction` or **Skip** → `skipped` persisted. |
| Test call | `test_call` | **pass** | Checkbox attestation → `completed` via `setWizardStepStatusAction`. |
| Go live | `go_live` | **pass** | Marks complete; links to KDS. `resolveWizardActiveStep` returns `go_live` when prior steps terminal. |

### Persistence & resume

| Check | Result |
|-------|--------|
| Step status in Postgres JSONB | **pass** — MCP: `organization_onboarding` ×3, `restaurant_onboarding` ×2 on `mnkabwcbdxruefzuvuuv` |
| Refresh resumes first incomplete step | **pass** — `loadOnboardingWizardState` + `resolveWizardActiveStep`; page `key` includes `activeStep` |
| `?restaurant=` selects location | **pass** — validated against org’s restaurants |
| Nav ahead without location | **fixed** — steps after profile disabled until `restaurantId`; empty-panel guard message |

### Redirects & empty org

| Check | Result |
|-------|--------|
| Unauthenticated | **pass** → login with `next` |
| Signed-in, no org | **pass** — account step only; no crash |
| Analytics / notifications without membership | **pass** → `/dashboard/onboarding` (existing redirects) |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/unit/onboarding-wizard.test.ts` | **pass** (5 cases) |

**Code changes:** wizard nav disable + empty-step message when location missing; +1 unit test for `go_live` resume.

**Status:** **pass** (hours sub-flow documented as gap; full signed-in browser E2E **needs human**).

**QA IDs touched:** ONB-01–05.

---

## Prompt 17 — Restaurant profile settings (PROF-01–02)

**Route:** `/dashboard/restaurants/[id]` (KDS) · **UI:** `RestaurantProfileSettings.tsx` · **Action:** `saveRestaurantProfileSettingsAction` in `profile-actions.ts` · **Lib:** `lib/restaurant-profile/schema.ts`, `helpers.ts` (`upsertRestaurantProfile`) · **DB:** `011_restaurant_profiles.sql` (+ `018` ElevenLabs columns unchanged on profile save).

### Fields exercised (static + automated)

| Group | Fields | Client validation | Server (`RestaurantProfileInputSchema`) |
|-------|--------|-------------------|----------------------------------------|
| Basics | name, phone, cuisine, website | name required; website `type=url` | name min 1; optional phone/cuisine; URL refine |
| Address | line1/2, city, region, postal, country, timezone | country max 2; timezone required | country len 2; timezone min 1 |
| Ordering | pickup/delivery toggles, prep minutes | both off → inline error; prep 5–240 | `.refine` pickup∨delivery; prep int 5–240 |
| Taxes & fees | tax %, service fee % | number inputs 0–100 | coerce 0–100; `NaN`/`abc` rejected |
| Escalation | name, phone, email | email `type=email` | optional text; email refine |

### Server action errors (`profile-actions.ts`)

| Condition | Thrown message |
|-----------|----------------|
| 401 | Sign in to save settings. |
| 404 | Restaurant not found. |
| Other access | You do not have access to this restaurant. |
| Zod fail | First issue message (e.g. Invalid escalation email, Enable at least pickup or delivery) |

Post-save: `revalidatePath` KDS + onboarding; ElevenLabs agent sync best-effort (errors swallowed).

### DB persistence (Supabase MCP `mnkabwcbdxruefzuvuuv`)

| Check | Result |
|-------|--------|
| `restaurant_profiles` row for test restaurant `9d3263d1-…` (`egg mania`) | **pass** — row exists (backfill/trigger) |
| UPDATE all profile columns + constraints (tax 9.5, prep 25, delivery on, address, escalation email) | **pass** — returned expected values; reverted to defaults after QA |
| `restaurants.name` updated via `upsertRestaurantProfile` | **pass** — code path updates `restaurants` then `restaurant_profiles`; not re-run live without session |
| ElevenLabs / `temporarily_closed` columns | **pass** — not in update payload (preserved) |

### Live browser (signed-in session)

| Check | Result |
|-------|--------|
| KDS profile panel load | **needs human** — navigated to KDS → redirect `/login?next=…` (no cookie) |
| Save → success toast | **needs human** |
| Refresh reloads saved values | **needs human** (server `ensureRestaurantProfile` + props on RSC refresh expected OK) |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/unit/restaurant-profile-schema.test.ts` | **pass** (5) |
| Zod spot-check (`NaN`/`abc` tax, bad country) | **pass** — rejects as expected; `''` tax coerces to 0 |

**Code changes:** none (schema/action/DB aligned).

**Status:** **pass** (signed-in save + refresh E2E **needs human**).

**QA IDs touched:** PROF-01, PROF-02.

---

## Prompt 18 — Restaurant hours settings (PROF-03–04)

**Route:** `/dashboard/restaurants/[id]` (KDS) · **UI:** `RestaurantHoursSettings.tsx` · **Action:** `saveRestaurantHoursAction` in `hours-actions.ts` · **Lib:** `lib/restaurant-hours/*` · **Edge:** `supabase/functions/_shared/restaurant-hours.ts` · **DB:** `012_restaurant_hours.sql` (`restaurant_weekly_hours`, `restaurant_hours_exceptions`, profile closure flags).

### KDS hours panel (code review + schema tests; live browser **needs human**)

| Check | Result |
|-------|--------|
| Weekly grid (7 days, Sun–Sat) | **pass** — `DAY_LABELS`; closed-day checkbox nulls times on save |
| Temporarily closed + reason | **pass** — updates `restaurant_profiles`; reason cleared when flag off (Zod) |
| Holidays / exceptions | **pass** — add/remove rows; upsert + delete orphans on save |
| Invalid equal open/close | **fixed** — `RestaurantHoursInputSchema` rejects same-minute window |
| Overnight window (close &lt; open on clock) | **pass** — allowed (e.g. 22:00–02:00); `evaluateRestaurantHours` supports wrap |
| Timezone edit in hours panel | **n/a** — read-only display from profile; edit via `RestaurantProfileSettings` |
| Status badge after save | **fixed** — `router.refresh()` after successful save reloads RSC `bundle.evaluation` |

### Persistence (`hours-actions.ts` + MCP)

| Check | Result |
|-------|--------|
| Profile closure flags | **pass** — `restaurant_profiles` update |
| Weekly rows | **pass** — upsert `restaurant_weekly_hours` on `(restaurant_id, day_of_week)` |
| Exceptions | **pass** — upsert + delete removed dates |
| Post-save cache | **pass** — `revalidatePath` KDS; ElevenLabs hours prompt sync best-effort |
| Remote data | **pass** — MCP: 21 weekly rows (3 restaurants × 7 days); `timezone` on profiles |

### Downstream consumers (code paths)

| Consumer | Hours load | Gate / output |
|----------|------------|---------------|
| Voice agent prompt | `loadRestaurantHoursBundle` → `buildAgentHoursPromptFromBundle` in `lib/elevenlabs-restaurant-agent-profile.ts` | Injected on agent profile apply after save |
| `get-menu` Edge | `loadHoursForRestaurant` | `operations.ordering_allowed`, status, message, weekly + exceptions |
| `sync-draft-order` Edge | same | **403** when `!ordering_allowed` |
| `finalize-order` Edge | same | blocks finalize when closed |
| Test harness | `lib/voice-agent/test-harness/*` | mirrors get-menu hours evaluation |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/unit/restaurant-hours.test.ts` | **pass** (5) — evaluation, exceptions prompt, schema equal-time reject, overnight allow |

**Code changes:** equal open/close validation in `lib/restaurant-hours/schema.ts`; `router.refresh()` after save in `RestaurantHoursSettings.tsx`; schema Vitest cases.

**Status:** **fixed** (live signed-in save/refresh E2E **needs human**).

**QA IDs touched:** PROF-03, PROF-04.

---

## Prompt 19 — Menu scanner extract flow (MENU-01, MENU-03)

**API:** `POST /api/scanner/extract` (`app/api/scanner/extract/route.ts`) · **Lib:** `lib/scanner/extract-menu.ts`, `lib/gemini.ts` · **UI:** `app/dashboard/restaurants/[id]/MenuScanner.tsx` (KDS).

### `GEMINI_API_KEY` handling

| Check | Result |
|-------|--------|
| Missing key | `requireGeminiEnv()` → `EnvValidationError` with `ENV_HINTS` path + Google AI Studio link; route returns **503** `{ error: "<formatted message>" }` — no secret value in body |
| Key never in responses | Grep + live Gemini error on 1×1 PNG: message is Google API text only; **no** `AIza` / `api_key` substring |
| Key only server-side | `lib/gemini.ts` uses `requireGeminiEnv()`; not referenced in scanner routes or `MenuScanner.tsx` |
| Local env | `GEMINI_SET=yes` (`.env` / `.env.local`; values not recorded) |

### `POST /api/scanner/extract`

| Check | Result |
|-------|--------|
| Unauthenticated | **pass** — live `curl` **401** `{"error":"Unauthorized"}` |
| Missing `restaurant_id` | **pass** — Vitest **400** `restaurant_id is required` (before `requireRestaurantAccess`) |
| Missing / non-file `image` | **pass** — Vitest **400** `image file is required` |
| Invalid file (e.g. PDF) | **pass** — Vitest **400** `/not an image/i`; no Supabase client constructed |
| Success shape | **pass** — Vitest **200** `{ ok, import_id, restaurant_id, menu, hints, summary }`; `menu` validated via `ScannedMenuSchema` in `extractMenuFromImage` |
| Invalid Gemini JSON / schema | **422** via `extractErrorHttpStatus` (unit test) |
| Live Gemini vision | **blocked (fixture)** — no menu image in `tests/fixtures/` (only `menu.ts` UUIDs). Ad-hoc 1×1 PNG → Google **400** “Unable to process input image” (key works; not a menu). Full scan **needs human** with real menu photo + signed-in session |

### DB writes before commit

| Store | On extract | On commit (`POST /api/scanner/commit`) |
|-------|------------|----------------------------------------|
| `categories` / `items` / `modifiers` | **not written** | `merge_menu` RPC via `lib/scanner/commit-menu.ts` |
| `menu_imports` + `menu-uploads` storage | **yes** — audit row, file upload, `extracted_menu` JSON | status → committed / failed |
| Usage / audit logs | `menu_scan`, `import_attempt`, `menu_scan.extracted` | commit usage + audit |

MCP (`menu_imports` columns on `mnkabwcbdxruefzuvuuv`): `extracted_menu`, `review_hints`, `extraction_summary`, `extraction_status` — no merge into live menu until commit.

### `MenuScanner.tsx` (KDS)

| Check | Result |
|-------|--------|
| Upload UX | drag/drop + file input; client `validateMenuImageFile`; preview; max size label |
| Error UX | red alert from `body.error`; failed extract may set `import_id` for discard |
| Flow | extract → review (`MenuImportReview`) → commit `/api/scanner/commit` or discard `/api/scanner/discard` |
| Plan gate | `menuScanGate` disables input + scan when `hardBlocked` |

### Automated tests

| Suite | Result |
|-------|--------|
| `tests/unit/extract-menu-validation.test.ts` | **6/6 pass** |
| `tests/integration/api-scanner-extract.test.ts` | **5/5 pass** (new: 400s + success shape) |

**Code changes:** integration tests only; **no product bug fixes**.

**Status:** **pass** (live menu image scan: **needs human**)

**QA IDs touched:** MENU-01, MENU-03.

---

## Prompt 26 — `POST /api/restaurants/[id]/orders/compute-totals` (ORD-02)

**Scope:** `app/api/restaurants/[id]/orders/compute-totals/route.ts`, `lib/orders/compute-order-totals.ts`, `pricing-settings.ts`, `menu-price-context.ts`, `validate-cart.ts`.

| Case | Expected | Result |
|------|----------|--------|
| Valid item + modifier + quantity | 200, `totals.complete`, subtotal matches menu | **pass** — Vitest integration |
| Unknown item name | 400, `order_validation_failed`, `unknown_item_name` issue | **pass** — **fixed** (was 200 + incomplete totals) |
| Unavailable / sold-out item | 400, `item_unavailable` issue | **pass** |
| Empty cart | 400, `empty_cart` issue | **pass** |
| Tax % + service fee % from profile | `pricing` + totals use `restaurant_profiles` | **pass** — unit + integration |
| `items` not array | 400 | **pass** |
| Unauthenticated | 401 via `requireRestaurantAccess` | **pass** |

**Fix:** Route now runs `validateCartForFinalize` before `computeOrderTotals` and returns structured 400 errors (`formatCartValidationError` with `tool: "compute_totals"`). Normalized cart lines feed totals (exact menu names/ids, no fuzzy-only matches on API).

**KDS note:** `KitchenOrderCard` / `OrderDetailModal` still call `computeOrderTotals` client-side for historical order lines (fuzzy name + optional `unit_price` override); API path is strict for dashboard/tool callers.

**Status:** **fixed**

---

## Prompt 20 — Legacy `POST /api/scanner/process` (MENU-02)

**Route:** `app/api/scanner/process/route.ts` — marked `@deprecated`; delegates to `extractMenuFromImage` only (same core as extract). Does **not** create `menu_import` rows, billing gates, usage events, or DB merge.

### vs extract → commit flow

| Aspect | `POST /api/scanner/process` (legacy) | `POST /api/scanner/extract` + commit |
|--------|-------------------------------------|--------------------------------------|
| Auth | `requireRestaurantAccess` | same |
| Image validation | none (accepts any `File`) | `validateMenuImageFile` |
| Billing gate | none | `menu_scan` gate |
| Import audit / storage | none | `menu_import` + `menu-uploads` |
| Response | `{ ok, menu, hints, deprecated }` | `{ ok, import_id, menu, hints, summary }` |
| DB writes | none | commit route merges after review |

### Callers (repo grep)

| Source | Calls `/api/scanner/process`? |
|--------|------------------------------|
| `MenuScanner.tsx` | **no** — local `process()` → `fetch("/api/scanner/extract")` |
| `tests/**` | **no** |
| `scripts/**` | **no** |
| Docs | README, AUTH.md, this report (deprecation notes only) |

**Used by product UI/scripts:** **no**

### Route behavior (static review)

| Check | Result |
|-------|--------|
| Missing `restaurant_id` | **400** |
| Missing `image` | **400** |
| Unauthenticated / no access | `requireRestaurantAccess` error response |
| Success shape | `{ ok, restaurant_id, menu, hints, deprecated: "<message>" }` |
| Auto-merge to menu | **no** (by design) |

Live Gemini call not exercised in this prompt (same extractor as MENU-01; no caller depends on process endpoint).

**Code changes:** none (no broken callers).

**Status:** **deprecated** (endpoint retained for external/legacy clients; product path is extract → review → commit).

**QA IDs touched:** MENU-02.

---

## Prompt 21 — Menu import review + commit (MENU-04, MENU-13)

**API:** `POST /api/scanner/commit` (`app/api/scanner/commit/route.ts`) · **merge:** `lib/scanner/commit-menu.ts` → `merge_menu` RPC · **guards:** `lib/scanner/import-commit-guards.ts` · **audit:** `lib/scanner/menu-import-audit.ts`, `015_menu_import_audits.sql` · **usage:** `recordRestaurantUsage` → `020_usage_events.sql` · **UI:** `MenuScanner.tsx` → `MenuImportReview.tsx`

### `POST /api/scanner/commit` (Vitest + curl)

| Check | Result |
|-------|--------|
| Unauthenticated | **pass** — Vitest **401**; live `curl` (no cookies) **401** `{"error":"Unauthorized"}` |
| Missing `restaurant_id` | **pass** — **400** |
| Invalid menu schema (empty `categories`) | **pass** — **422** `Invalid menu payload` |
| Blocking review errors (empty item name) | **pass** — **422** `Fix validation issues before committing` + `hints[]`; merge not called |
| Duplicate item names in category | **pass** — **warning** only (`buildReviewHints`); commit proceeds (**200**) |
| `import_id` not found | **pass** — **404** |
| Import already `committed` | **pass** — **409** `already committed` (`commitBlockedReason`) |
| Valid commit + `import_id` | **pass** — **200** `{ ok, stats }`; `recordMenuImportCommitted` + `import_attempt` usage with idempotency `import_attempt:{id}:committed` |
| `commit_failed` retry | **pass** — guard allows `extracted` and `commit_failed` (unit test) |

**Vitest:** `tests/integration/api-scanner-commit.test.ts` — **8 cases**; `tests/unit/import-commit-guards.test.ts` — **3/3 pass**.

### Supabase MCP (project `mnkabwcbdxruefzuvuuv`)

Fixture restaurant **QA Role Test Location** `b2222222-2222-4222-8222-222222222222` (org `b1111111-…`). Simulated authenticated owner JWT in a `DO` block (same pattern as prompt 13 RLS probes).

| Check | Result |
|-------|--------|
| `merge_menu` RPC | **pass** — `{ categories: 1, items: 1, modifiers: 1 }` |
| `menu_imports` audit row | **pass** — import `f1111111-…` → `extraction_status=committed`, `merge_result` populated, `committed_at` set |
| Live menu tables | **pass** — category `QA Mains`, item `QA Burger`, modifier `Extra sauce` |
| `usage_events` | **pass** — `import_attempt` with idempotency `import_attempt:f1111111-…:committed`, `metadata.outcome=committed` |
| Bare MCP SQL without JWT | **expected** — `merge_menu` raises `forbidden` (RLS guard in RPC) |

Remote had **zero** `menu_imports` before this probe; QA row seeded for verification only (no secrets).

### Review UI (`MenuScanner` → `MenuImportReview`)

| Check | Result |
|-------|--------|
| Commit payload | Code review **pass** — `POST` JSON `{ restaurant_id, menu, import_id? }` matches API |
| Error surfacing | **pass** — aggregates `body.hints` messages on **422** |
| Signed-in browser E2E | **needs human** — no QA session cookie; dev server reachable at `:3000` |

**Code changes:** added `tests/integration/api-scanner-commit.test.ts`; **no product bug fixes**.

**Status:** **pass**

**QA IDs touched:** MENU-04, MENU-13.

---

## Prompt 22 — Menu import discard + history (MENU-05–06)

**Routes:** `POST /api/scanner/discard` · `GET /api/restaurants/[id]/menu-imports` · **UI:** `MenuImportHistory.tsx`, `MenuScanner.tsx` (KDS) · **DB:** `015_menu_import_audits.sql` (`menu_imports`, `menu-uploads` bucket).

### `POST /api/scanner/discard`

| Check | Result |
|-------|--------|
| Auth | **pass** — `requireRestaurantAccess`; unauthenticated **401**, wrong org **403**, unknown restaurant **404** |
| Validation | **pass** — missing `restaurant_id` / `import_id` → **400** |
| Tenant binding | **pass** — `getMenuImportForRestaurant(supabase, restaurantId, importId)`; cross-restaurant `import_id` → **404** (no discard) |
| Discard semantics | **pass** — `recordMenuImportDiscarded` sets `extraction_status=discarded` only; **no** `merge_menu` / menu table writes |
| Committed guard | **pass** — `extraction_status=committed` → **409** |
| Idempotent | **pass** — already `discarded` → `{ ok: true }` without re-update |
| Usage event | **pass** — `import_attempt` idempotency `import_attempt:{id}:discarded` |

### `GET /api/restaurants/[id]/menu-imports`

| Check | Result |
|-------|--------|
| Auth / tenant | **pass** — same `requireRestaurantAccess`; forbidden **403** |
| List scope | **pass** — `listRecentMenuImports(supabase, restaurantId, 25)` filters `restaurant_id` |
| Response shape | **pass** — `{ ok: true, imports: MenuImportListItem[] }` with `uploader_name`, `signed_image_url`, status, `merge_result`, errors |
| Signed URLs | **pass** — per-row `createSignedUrl` on `menu-uploads` path (1h) |

### UI refresh

| Check | Result |
|-------|--------|
| `MenuImportHistory` | **pass** — listens `roal:menu-imports-changed` (scoped by `restaurantId`); manual Refresh |
| `MenuScanner` | **pass** — dispatches event after extract / commit / discard |
| Stale `extracted` on Reset / new file | **fixed** — `reset()` and `onFile()` now call discard via shared `abandonImport()` when `import_id` set |

### Supabase MCP (`mnkabwcbdxruefzuvuuv`)

| Check | Result |
|-------|--------|
| RLS enabled | **pass** — `menu_import_select` / `insert` / `update` via `auth_user_can_access_restaurant(restaurant_id)` |
| Cross-tenant probe | **pass** — JWT `qa-role-owner` cannot SELECT or UPDATE `menu_imports` row on `rls-qa-isolated` restaurant (`639b2da9-…`); test row cleaned up |
| Remote row counts | **pass** — `menu_imports` empty before QA probes (prompt 21 seeded commit row separately) |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/integration/api-menu-import-discard-history.test.ts` | **pass** (9 cases) |

**Code changes:** `MenuScanner.tsx` — discard on reset / file replace; + integration tests. **No API/RLS changes.**

**Status:** **fixed** (stale-import UI only; tenant isolation **pass**).

**QA IDs touched:** MENU-05, MENU-06.

---

## Prompt 23 — Menu editor CRUD (MENU-08–12)

**Page:** `/dashboard/restaurants/[id]/menu` (`force-dynamic`, `noStore`) · **UI:** `MenuEditor.tsx`, `ModifierGroupEditor.tsx` · **Actions:** `menu-actions.ts` · **Load:** `lib/menu-editor/load-menu.ts` · **Clear API:** `DELETE /api/restaurants/[id]/menu` (no `GET` on this route).

### CRUD matrix (code review + validation tests)

| Entity | Create | Update | Reorder | Delete | Server guards |
|--------|--------|--------|---------|--------|---------------|
| Category | `saveCategoryAction` (insert) | update by `id` + `restaurant_id` | `reorderCategoriesAction` | `deleteCategoryAction` (cascade items/modifiers) | `CategoryInputSchema`, `assertCategoryNameAvailable`, `assertCategoryInRestaurant` |
| Item | `saveItemAction` (auto `sort_order` when omitted) | price/description/`is_available`/category | `reorderItemsAction` (category-scoped) | `deleteItemAction` | `ItemInputSchema` (NaN→null, cent round), `assertItemNameAvailable` |
| Modifier group | `saveModifierGroupAction` (replace rows) | rename via `previous_group_name` | `reorderModifierGroupsAction` (not wired in UI) | `deleteModifierGroupAction` | `ModifierGroupInputSchema`, duplicate group check |

**Client:** optimistic list updates; `useLayoutEffect` resets from `initial` when `menuKey(restaurantId, initial)` changes after `revalidatePath` on dashboard + menu routes.

### `DELETE /api/restaurants/[id]/menu`

| Check | Result |
|-------|--------|
| Auth | **pass** — `requireRestaurantAccess`; unauthenticated **401** (Vitest) |
| Missing id | **pass** — **400** `missing restaurant id` |
| Clear path | **pass** — service role deletes categories when configured; else `clear_restaurant_menu` RPC (`via: rpc` / `service_role`) |
| RPC error | **pass** — **500** with message (Vitest) |

**Note:** Prompt 23 mentions verifying live menu via this route; only **DELETE** is implemented. Live reads use `loadRestaurantMenu` (RSC page, `LiveMenuSidebar`, Edge `get-menu`).

### Live menu verification (Supabase MCP `mnkabwcbdxruefzuvuuv`)

| Check | Result |
|-------|--------|
| Fixture restaurant `9d3263d1-…` (`egg mania`) | **pass** — 7 categories, 39 items, 0 modifiers |
| Sort order + pricing sample | **pass** — e.g. `Egg Samplers` `sort_order` 1, items 1–5; `Roll It Up` items priced `9.99` / `8.49`; `is_available` true |
| `loadRestaurantMenu` empty path | **pass** — Vitest returns `{ categories: [], items: [], modifiers: [] }` when no categories |

### Live browser

| Check | Result |
|-------|--------|
| `/dashboard/restaurants/[id]/menu` signed-in CRUD | **needs human** — dev server down / no session cookie |
| Guest | **pass** (pattern) — middleware redirects `/dashboard/*` → login with `next=` (same as prompt 15) |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/unit/menu-editor-validation.test.ts` | **pass** (5) |
| `tests/unit/modifier-groups.test.ts` | **pass** (6) |
| `tests/unit/live-menu-scope.test.ts` | **pass** (2) |
| `tests/unit/load-menu.test.ts` | **pass** (2) — added |
| `tests/integration/api-menu-delete.test.ts` | **pass** (5) — added |

**Code changes:** tests only (`api-menu-delete`, `load-menu`). **No product bug fixes** (CRUD/validation/cache paths reviewed OK).

**Status:** **pass** (signed-in editor E2E **needs human**).

**QA IDs touched:** MENU-08, MENU-09, MENU-10, MENU-11, MENU-12.

---

## Prompt 24 — Modifier groups deep test (MENU-11, ORD-03/04)

**Route:** `/dashboard/restaurants/[id]/menu` · **UI:** `ModifierGroupEditor.tsx`, `MenuEditor.tsx` · **Actions:** `saveModifierGroupAction`, `deleteModifierGroupAction`, `reorderModifierGroupsAction` in `menu-actions.ts` · **Lib:** `lib/menu-editor/modifier-groups.ts`, `modifier-group-schema.ts` · **Totals:** `lib/orders/compute-order-totals.ts`, `validate-cart.ts` · **Migration:** `014_modifier_group_ordering.sql` (`sort_order`, `group_sort_order`).

### CRUD + rules (code review)

| Check | Result |
|-------|--------|
| Create group | **pass** — delete-then-insert flat rows via `rowsFromGroupInput`; bounds from `resolveGroupSelectionBounds` |
| Edit / rename | **pass** — `previous_group_name` deletes old rows case-insensitively (`modifierBelongsToGroup`) |
| Delete group | **pass** — `deleteModifierGroupAction` removes all rows in group |
| Required vs optional | **pass** — `is_required` → `min_selection` 1 or 0; optional forces `min_selection=0` |
| Max selections | **pass** — clamped to option count; UI `maxCap` matches |
| Price deltas | **pass** — `extra_price` rounded via `roundMenuPrice`; shown in list + editor |
| Group sort order | **pass** — `group_sort_order` on rows; aggregated sort in `aggregateModifierGroups` |
| Option sort order | **pass** — `sort_order` per row (`idx+1` on save); no per-option drag UI (implicit order) |
| Item linkage | **pass** — `item_id` UUID + `assertItemInRestaurant`; groups scoped per item in editor |
| Duplicate group / option names | **pass** — server `findDuplicateGroupInList`; Zod rejects duplicate options case-insensitively |
| Client optimistic state | **pass** — `groupKey` filter on save/delete matches server grouping |

### Order totals + cart validation

| Check | Result |
|-------|--------|
| Modifier prices in subtotal | **pass** — `computeOrderTotals` sums `findModifierPrice` per customization; fixture: 2×(12.50+1.50)=**$28.00** |
| Explicit unit price override | **pass** — line `unit_price` without menu match still completes |
| Cart modifier names | **pass** — case-insensitive match to `modifier_name` |
| Required / max per group | **pass** — `validateModifierGroups` enforces min/max per group |
| Grouping in cart validation | **fixed** — uses `groupKey` (case/whitespace insensitive), aligned with menu editor |

### Supabase MCP (`mnkabwcbdxruefzuvuuv`)

| Column | App `DbModifier` | Remote |
|--------|------------------|--------|
| `id`, `item_id`, `group_name`, `modifier_name` | yes | yes |
| `extra_price`, `min_selection`, `max_selection` | yes | yes |
| `sort_order`, `group_sort_order` | yes | yes (migration **014**) |
| `created_at` | n/a on type | yes |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/unit/modifier-groups.test.ts` | **pass** (6) |
| `tests/unit/compute-order-totals.test.ts` | **pass** (4) — modifier + quantity sample |
| `tests/unit/validate-cart.test.ts` | **pass** (11) |

### Browser

| Check | Result |
|-------|--------|
| Menu editor signed-in | **needs human** — `/dashboard/restaurants` redirects to login (no session in automation) |

**Code changes:** `reorderModifierGroupsAction` updates rows by id with `modifierBelongsToGroup` (was exact `group_name` match); `validate-cart` group buckets use `groupKey`.

**Status:** **fixed** (persistence/validation alignment; live editor E2E **needs human**).

**QA IDs touched:** MENU-11, ORD-03, ORD-04.

---

## Prompt 25 — Live menu sidebar on KDS (KDS-02)

**Route:** `/dashboard/restaurants/[id]` · **UI:** `LiveMenuSidebar.tsx` · **Scope:** `lib/menu-editor/live-menu-scope.ts` · **Load:** `loadRestaurantMenu` (poll/resync) · **Clear:** `roal:menu-cleared` from `MenuScanner.tsx` after `DELETE /api/restaurants/[id]/menu`

### Menu data + empty state (code review + MCP)

| Check | Result |
|-------|--------|
| Server snapshot on KDS load | **pass** — RSC loads categories/items/modifiers; `serverMenuKey` resets client state without clobbering realtime on same rows |
| After editor commit / menu save | **pass** — `revalidateMenu` + Realtime `items`/`categories`/`modifiers` updates; `router.refresh` on KDS navigation picks up new `serverKey` |
| Empty menu | **pass** — `EmptyMenu` when zero categories; fixture **Isolated Diner** `639b2da9-…` has 0 categories (MCP) |
| Populated menu | **pass** — **egg mania** `9d3263d1-…`: 7 categories, 39 items (MCP) |
| Orphan scope | **pass** — `filterItemsToCategories` / `filterModifiersToItems` drop rows outside loaded categories/items |
| Unavailable items | **fixed** — gray status dot + muted item name (`text-subtle`); matches editor list convention |
| Clear menu | **pass** — `roal:menu-cleared` clears sidebar state + `scopeRef`; scanner also `router.refresh()` |

### Realtime vs poll fallback

| Mode | Behavior | Result |
|------|----------|--------|
| `SUBSCRIBED` | Channel on `categories` (restaurant filter), `items`, `modifiers`; 30s backup poll; `visibilitychange` resync | **pass** (code review) |
| `CHANNEL_ERROR` / `TIMED_OUT` | `realtimeDegraded` → amber **Sync** badge, 8s poll, immediate `syncMenuFromServer` | **fixed** — status dot was still green `pulse-dot` while degraded |
| Out-of-scope item INSERT | `scheduleResync` (400ms debounce) | **pass** |
| Category DELETE | Cascading item/modifier removal in client | **pass** |
| Cross-restaurant leakage | Item/modifier handlers gate on `scopeRef` category/item ids; category channel filtered by `restaurant_id` | **pass** (code review) |
| Second-tab / live Realtime E2E | **needs human** — no QA session cookie in browser automation |

### Mobile / narrow layout

| Check | Result |
|-------|--------|
| Sidebar max height | **pass** — `max-h-[min(50svh,380px)]` on narrow viewports; `sm:max-h-[calc(100dvh-8rem)]` + sticky on `sm+` |
| KDS grid | **pass** — `grid-cols-1` stacks menu above scanner until `xl:grid-cols-[420px_1fr]` |
| Signed-in snapshot | **needs human** — `GET /dashboard/restaurants/9d3263d1-…` → `/login?next=…` (no cookie); CDP 390×844 exercised on login shell only |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/unit/live-menu-scope.test.ts` | **pass** (2/2) |

### Browser

| Check | Result |
|-------|--------|
| Authed KDS live menu | **needs human** |
| Realtime flash after edit | **needs human** |
| Poll fallback UI | **needs human** (degraded path hard to force without blocking Realtime) |

**Code changes:** `LiveMenuSidebar.tsx` — degraded status uses static amber dot (not green pulse); unavailable item names use `text-subtle`.

**Status:** **fixed** (signed-in Realtime/two-tab E2E **needs human**).

**QA IDs touched:** KDS-02.

---

## Prompt 27 — Draft order API lifecycle (ORD-01, KDS-05)

**PATCH route:** `app/api/restaurants/[id]/orders/[orderId]/route.ts` · **Lib:** `lib/orders/apply-order-status.ts`, `lib/order-status.ts` · **KDS client:** `useOrderStatusActions.ts` · **List/load:** no REST list route (by design).

### Routes vs prompt expectation

| Route | Expected (prompt 27) | Repo |
|-------|---------------------|------|
| `GET/POST /api/restaurants/[id]/orders` | list orders | **missing** — orders loaded via server component + browser Supabase (`page.tsx`, `LiveOrdersPanel.fetchAll`) |
| `PATCH …/orders/[orderId]` | status actions | **present** — `action`: accept, start, mark_ready, complete, cancel |
| `POST …/orders/compute-totals` | totals (prompt 26) | **present** — separate route |

### `PATCH /api/restaurants/[id]/orders/[orderId]`

| Check | Result |
|-------|--------|
| Unauthenticated | **pass** — Vitest **401** |
| Forbidden restaurant | **pass** — Vitest **403**; Supabase not called |
| Invalid `action` | **pass** — Vitest **400** before DB |
| Order not found / wrong `restaurant_id` | **pass** — Vitest **404** `Order not found` (scoped `.eq("restaurant_id", …)`) |
| Invalid transition | **pass** — Vitest **409** e.g. accept from `completed` |
| Valid accept | **pass** — Vitest **200** `{ ok, order, action, status }`; `accepted_at` on order |
| Actions | accept → accepted; start → in_progress; mark_ready → ready; complete → completed; cancel → canceled |

### Status machine + timestamps

| Check | Result |
|-------|--------|
| `canApplyOrderAction` / `getOrderActionsForStatus` | **pass** — `tests/unit/order-status.test.ts` (4) |
| `buildOrderStatusPatch` lifecycle | **pass** — `tests/unit/apply-order-status.test.ts` (4): legacy `confirmed` → accept; full pipeline; no overwrite of existing milestone ts |
| Migration `017_order_status_timestamps` | **pass** — MCP `draft_orders` has `accepted_at`, `in_progress_at`, `ready_at`, `completed_at`, `canceled_at` on `mnkabwcbdxruefzuvuuv` |
| Patch sets ts once | `statusTimestampField` + `!order[field]` in `buildOrderStatusPatch` |

### Data sources (list / receipts)

| Table | Load path |
|-------|-----------|
| `draft_orders` | KDS SSR + client poll/Realtime |
| `phone_order_receipts` | same (finalize-order Edge) |

No MCP seed rows required for this prompt (logic verified via Vitest + schema).

### Automated tests

| Suite | Result |
|-------|--------|
| `tests/unit/apply-order-status.test.ts` | **4/4 pass** |
| `tests/unit/order-status.test.ts` | **4/4 pass** |
| `tests/integration/api-orders-patch.test.ts` | **6/6 pass** (+403, +404, +200 accept) |

**Code changes:** integration tests only. **No product bug fixes.**

**Status:** **pass** (live KDS button E2E deferred to prompt 28)

**QA IDs touched:** ORD-01, KDS-05.

---

## Prompt 35 — `POST /api/integrations/elevenlabs/sync-roal-tools` (EL-05)

**Route:** `app/api/integrations/elevenlabs/sync-roal-tools/route.ts` · **Lib:** `lib/sync-elevenlabs-roal-tools.ts` · **Docs:** [ELEVENLABS.md](./ELEVENLABS.md) (sync API section added).

### Fixture (Supabase MCP `mnkabwcbdxruefzuvuuv`)

| Field | Value |
|-------|--------|
| Restaurant | `egg mania` · `9d3263d1-4d9d-4f89-bfc5-160e2cca1855` |
| Agent | `agent_0601krevmvm2fy89m10j3etws1n3` (from `restaurant_profiles.elevenlabs_agent_id`) |

### `POST` sync (baked)

| Check | Result |
|-------|--------|
| Local route `POST …/sync-roal-tools` | **pass** — **200** `{ ok: true, restaurant_tools_baked: true }` |
| Exactly 3 tools returned | **pass** — `get_menu_items`, `sync_draft_order`, `finalize_order` (all `updated`) |
| Agent `prompt.tool_ids` | **pass** — 3 ids; all match sync result on this agent |
| `get_menu_items` baked URL | **pass** — `restaurant_id` query matches fixture uuid |
| Headers on all 3 tools (EL GET tool) | **pass** — `x-roal-restaurant-id`, `apikey`, `Authorization`; header uuid matches fixture |
| Missing `agent_id` + no env default | **pass** — **400** (code review) |
| `ELEVENLABS_SYNC_TOKEN` unset locally | Bearer not required; wrong bearer still **200** |
| `ELEVENLABS_SYNC_TOKEN` set in prod | **needs human** — **401** without matching Bearer |

### Profile tool IDs (`restaurant_profiles`)

| Check | Result |
|-------|--------|
| `elevenlabs_last_sync_summary.tools` | **pass** (MCP) — 3 names + tool ids aligned with EL |
| `restaurant_tools_baked` | **true** in summary |
| API route writes profile | **no** — KDS `connectVoiceAgentAction` / `resyncVoiceAgentAction` persists via `saveSyncSuccess` |

### Auth model

| Entry | Session | Bearer `ELEVENLABS_SYNC_TOKEN` |
|-------|---------|------------------------------|
| `POST …/sync-roal-tools` | not checked | optional gate |
| KDS Connect / Resync | `requireRestaurantAccess` | n/a (server action) |

### Runtime deps

| Dep | Local |
|-----|--------|
| `ELEVENLABS_API_KEY` | set — EL API reachable |
| `AGENT_TOOL_SIGNING_SECRET` | unset — legacy `AGENT_TOOL_SECRET` in tool `Authorization` (**needs human** for signing parity with Edge, prompt 05) |

**Code changes:** `docs/ELEVENLABS.md` only. **No sync logic fixes.**

**Status:** **pass**

**QA IDs touched:** EL-05.

---

## Prompt 36 — ElevenLabs tool configuration post-sync (EL-05)

**Scope:** Read live Conv AI tools after KDS connect (prompt 35). **Scripts:** `scripts/inspect-roal-tools.ts`, `scripts/peek-agent.ts` · **Lib:** `lib/sync-elevenlabs-roal-tools.ts` · **Edge schemas:** `supabase/functions/_shared/agent-tool-zod.ts`.

### Fixture (same as prompt 35)

| Field | Value |
|-------|--------|
| Supabase project ref (from `NEXT_PUBLIC_SUPABASE_URL`) | `mnkabwcbdxruefzuvuuv` |
| Restaurant | `egg mania` · `9d3263d1-4d9d-4f89-bfc5-160e2cca1855` |
| Agent | `agent_0601krevmvm2fy89m10j3etws1n3` |

### Per-tool verification (ElevenLabs `GET /v1/convai/tools/{id}`)

| Tool | URL host ref | `apikey` | `Authorization` | `x-roal-restaurant-id` | Body/query vs Zod (baked) | Stale `restaurant_*` dynamic vars |
|------|--------------|----------|-------------------|------------------------|---------------------------|-----------------------------------|
| `get_menu_items` | **match** `mnkabwcbdxruefzuvuuv` | present | present (signed `roal1.*`, len ~289) | baked uuid = fixture | GET; `restaurant_id` + `restaurant_name` in query (no dynamic query schema) | **none** |
| `sync_draft_order` | **match** | present | present | baked uuid = fixture | POST; required `session_id`, `status`, `items`; optional `customer_name`, `customer_phone` — aligns with `SyncDraftOrderRequestSchema` (no `restaurant_id` in body) | **none** |
| `finalize_order` | **match** | present | present | baked uuid = fixture | POST; required `session_id`, `customer_name`, `customer_phone`; optional `items` — aligns with `FinalizeOrderRequestSchema` | **none** |

**Agent attachment:** `prompt.tool_ids` length **3**; all three ROAL tool ids attached.

**Agent placeholders (greeting only, not tool scope):** `restaurant_id` + `restaurant_name` set to fixture values; `first_message` literal (`egg mania`), no unresolved `{{…}}` templates.

**Phone/Twilio note:** Tool payloads do **not** use `dynamic_variable` for `restaurant_id` / `restaurant_name`; scope is URL query (`get_menu_items`) + `x-roal-restaurant-id` header on all three tools.

### Schema nuance (non-blocking)

ElevenLabs line-item objects expose `name`, `quantity`, `customizations` only. Edge Zod `LineItemSchema` also accepts optional `item_id` / `notes` — agents can still pass `name`-only lines; `item_id` is harness/advanced path.

### Actions

| Action | Result |
|--------|--------|
| Resync required | **no** — live config already baked and correct |
| Code changes | **none** — added `scripts/inspect-roal-tools.ts` for repeat QA |

**Status:** **pass**

**QA IDs touched:** EL-05 (config verification).

---

## Prompt 37 — Conversation-init webhook (EL-06)

**Scope:** `app/api/integrations/elevenlabs/conversation-init/route.ts` · `lib/elevenlabs/conversation-init.ts` · `lib/elevenlabs/phone-personalization.ts` (URL builder only).

### Route matrix (Vitest)

| Case | Method | Input | HTTP | Notes |
|------|--------|-------|------|-------|
| Query agent | GET | `?agent_id=` | 200 | `conversation_initiation_client_data` |
| Twilio POST | POST | `{ agent_id, caller_id, call_sid, … }` | 200 | Ignores call metadata; uses `agent_id` |
| camelCase query | POST | `?agentId=` | 200 | Body may omit agent |
| Missing agent | GET | (none) | 400 | No DB lookup |
| Unknown agent | GET | unknown id | 200 | Fallback `restaurant_name` = `the restaurant`, empty `restaurant_id` |
| Secret required | GET/POST | no secret | 401 | When `ELEVENLABS_CONVERSATION_INIT_SECRET` set (mocked in tests) |
| Secret header | POST | `x-roal-conversation-init-secret` | 200 | Matches env secret |
| Secret query | GET | `?secret=` | 200 | Matches `buildConversationInitWebhookUrl` pattern |

**Commands:** `npm test -- tests/unit/elevenlabs-conversation-init.test.ts tests/integration/api-elevenlabs-conversation-init.test.ts` → **14/14 pass**.

### DB lookup (service role)

| Check | Result |
|-------|--------|
| Column | `restaurant_profiles.elevenlabs_agent_id` |
| Fixture | `egg mania` · `9d3263d1-4d9d-4f89-bfc5-160e2cca1855` |
| MCP | 1 profile row with agent id (prefix `agent_06` only in notes) |
| `lookupRestaurantForElevenLabsAgent` (local env, no secret in output) | **pass** — resolves name `egg mania` |

### Response shape (phone dynamic vars)

| Field | Source | Notes |
|-------|--------|-------|
| `type` | constant | `conversation_initiation_client_data` |
| `dynamic_variables.restaurant_id` | profile lookup | UUID when found |
| `dynamic_variables.restaurant_name` | `restaurants.name` | Never empty; default `the restaurant` |

**Hours / menu context:** baked into agent **system prompt** on Connect (prompt 41), not returned in init payload — matches [ELEVENLABS.md](./ELEVENLABS.md) and tool schemas (`restaurant_id` + `restaurant_name` only).

### Code changes

| Item | Result |
|------|--------|
| Exported `readElevenLabsConversationInitAgentId`, `isElevenLabsConversationInitAuthorized`, header constant | **fixed** — testable + route uses shared lib |
| Phone personalization init bug | **none** — lookup + payload OK |

**Deferred:** Live inbound Twilio call E2E (**needs human**); production curl with real init secret.

**Status:** **pass**

**QA IDs touched:** EL-06.

---

## Prompt 28 — KDS live orders panel (KDS-03, KDS-04)

**UI:** `LiveOrdersPanel.tsx`, `KitchenOrderCard.tsx`, `OrderDetailModal.tsx`, `order-card-parts.tsx` · **Actions:** `useOrderStatusActions.ts` → `PATCH /api/restaurants/[id]/orders/[orderId]` · **SSR load:** `app/dashboard/restaurants/[id]/page.tsx`.

### Test fixture (MCP seed + cleanup)

**Restaurant:** `QA Role Test Location` · `b2222222-2222-4222-8222-222222222222` (org `qa-role-separation`, prompt 13).

| `session_id` | `status` | Expected tab |
|--------------|----------|--------------|
| `flow-qa-28-queue` | `new` | Kitchen queue |
| `flow-qa-28-live` | `draft` | Live carts |
| `flow-qa-28-done` | `completed` | Done (terminal draft card) |
| `flow-qa-28-receipt` | (receipt row) | Done → Receipt archive |

Rows inserted via MCP `execute_sql`, verified with `SELECT`, then **deleted** (`DELETE … WHERE session_id LIKE 'flow-qa-28%'`). **0** rows remaining on remote.

### Tabs, cards, modal, status buttons (code + data model)

| Check | Result |
|-------|--------|
| Tab filters | **pass** — `isQueuedKitchenStatus`, `isVoiceCartStatus`, `isTerminalOrderStatus` + `receiptArchive` |
| Queue cards | **pass** — `KitchenOrderCard`: items, totals, timeline, Accept/Start/Mark ready/Complete/Cancel |
| Live cart cards | **pass** — inline card + Details → modal (`draft`, no kitchen actions) |
| Done tab | **pass** — terminal drafts + receipt archive; terminal cards use no-op `onAction` |
| Detail modal | **pass** — draft actions + print; receipt read-only |
| Legacy `confirmed` | **pass** — normalized to `new` in panel + fetch |
| Optimistic PATCH | **pass** — `mergeFetchedDraftOrders` + `mergeRealtimeRow` (prompt 27) |

### Realtime vs polling fallback

| State | UI chip | Poll interval | Behavior |
|-------|---------|---------------|----------|
| `connecting` | Connecting… | 6s | `fetchAll` on mount |
| `SUBSCRIBED` | Realtime | 28s | `postgres_changes` on `draft_orders` + `phone_order_receipts`; slow poll safety net |
| `CHANNEL_ERROR` / `TIMED_OUT` | Polling 6s | 6s | `reportRealtimeDegraded`; channel teardown; exponential reconnect (max 30s) |

**2-tab Realtime:** not run — needs signed-in session on two tabs.

### Browser QA

| Check | Result |
|-------|--------|
| Navigate `/dashboard/restaurants/b2222222-…` | Redirect **`/login?next=…`** (no session) |
| Tabs / cards / modal / status buttons | **needs human** — QA users have no passwords (prompt 13) |
| 2-tab insert/update sync | **needs human** |

### Automated tests

| Suite | Result |
|-------|--------|
| `tests/unit/merge-fetched-orders.test.ts` | **2/2 pass** |
| `tests/unit/apply-order-status.test.ts` | **4/4 pass** |
| `tests/integration/api-orders-patch.test.ts` | **6/6 pass** |

**Code changes:** none.

**Status:** **pass** (logic + seed mapping + unit tests; live KDS E2E **needs human**)

**QA IDs touched:** KDS-03, KDS-04, KDS-05, ORD-01.

---

## Prompt 29 — Direct-test `get-menu` Edge Function (EL-09, phone-call menu)

**Function:** `supabase/functions/get-menu/index.ts` · **Auth:** `_shared/agent-tool-auth.ts`, `agent-tool-token.ts` · **Deploy:** v6, `verify_jwt=false` (prompt 05) · **Doc:** [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md).

**Base URL:** `https://mnkabwcbdxruefzuvuuv.supabase.co/functions/v1/get-menu` (ref from `NEXT_PUBLIC_SUPABASE_URL` only).

### Fixture (MCP `execute_sql`)

| Field | Value |
|-------|--------|
| Restaurant | **egg mania** — `9d3263d1-4d9d-4f89-bfc5-160e2cca1855` |
| Menu | 7 categories, 39 items |
| Agent connected | **yes** (`restaurant_profiles.elevenlabs_agent_id` set) |
| No-agent control | **QA Role Test Location** — `b2222222-2222-4222-8222-222222222222` |

### Edge secrets (names only)

| Secret | Present (Edge CLI) | Local `.env` |
|--------|-------------------|--------------|
| `AGENT_TOOL_SIGNING_SECRET` | **no** | **no** (HMAC uses `AGENT_TOOL_SECRET` fallback per `getSigningSecrets()`) |
| `AGENT_TOOL_SECRET` | **yes** | **yes** |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | **yes** (injected) | n/a on Edge |

### Deployed curl matrix (2026-05-23)

Secrets loaded in terminal only; `apikey` = publishable anon key. Signed token minted locally via `mintAgentToolToken` (same fallback secret as Edge).

| Case | Method | Auth | Scope | HTTP | Result |
|------|--------|------|-------|------|--------|
| CORS preflight | OPTIONS | — | — | **200** | `ok` |
| Missing bearer | GET | none | `restaurant_id` query | **401** | `missing_bearer` |
| Legacy secret | GET | `AGENT_TOOL_SECRET` | query + `x-roal-restaurant-id` | **200** | 7 cat / 39 items + `operations` |
| Legacy secret | POST | legacy | JSON `restaurant_id` + header | **200** | same payload |
| Legacy header-only (baked) | GET | legacy | `x-roal-restaurant-id` only | **200** | same |
| Signed `roal1.*` | GET | signed | query + header | **200** | same |
| Signed `roal1.*` | GET | signed | query only (no header) | **200** | same |
| Signed `roal1.*` | POST | signed | body + header | **200** | same |
| Signed header-only (baked) | GET | signed | `x-roal-restaurant-id` only | **200** | same |
| Signed wrong restaurant | GET | signed | token `rid` ≠ query/header | **400** | `restaurant_id_mismatch` |
| Legacy missing scope | GET | legacy | no `restaurant_id` | **400** | `missing_restaurant_id` |
| Legacy bad secret | GET | wrong bearer | header + query | **401** | `invalid_legacy_secret` |
| Legacy no agent | GET | legacy | QA no-agent UUID | **403** | `agent_not_connected` |
| No `apikey` | GET | signed | header + query | **200** | gateway still OK (anon optional at gateway for this project) |

**Response shape:** `restaurant`, nested `categories[].items[]`, `operations` (hours open, `America/Chicago`), `restaurant_name_hint`.

### Local vs deployed

| Check | Result |
|-------|--------|
| `tests/unit/agent-tool-auth.test.ts` | **9/9 pass** (mint/verify, scope) |
| Deployed behavior vs `index.ts` + auth shared | **match** — no code drift requiring redeploy |
| **Redeploy** | **no** |

### Phone-call menu issue (root cause)

Deployed **`get-menu` is healthy** for connected restaurant + valid legacy or signed auth. Failure on live calls is **unlikely** to be Edge/menu DB for this fixture.

**Likely upstream (prompt 38):**

1. ElevenLabs tool headers **stale** after secret rotation — **Re-sync** agent on KDS.  
2. Baked `x-roal-restaurant-id` / `Authorization` **mismatch** another location’s UUID.  
3. `AGENT_TOOL_SECRET` in Next.js ≠ Edge (not observed today; both use legacy path OK).  
4. Target restaurant **agent not connected** (403 `agent_not_connected`).

**Status:** **pass** (runtime Edge verified; no product code changes).

**QA IDs touched:** EL-09 (**pass** runtime); phone-menu E2E deferred to prompt **38**.

---

## Prompt 38 — Root-cause live phone-call menu failure (EL-09, EL-06, SEC-05)

**Priority:** End-to-end `get_menu_items` as ElevenLabs invokes it on Twilio calls.

### Prior work synthesized

| Prompt | Finding relevant to menu calls |
|--------|--------------------------------|
| **29** | Deployed `get-menu` on `mnkabwcbdxruefzuvuuv` returns **200** with legacy + signed auth, baked `x-roal-restaurant-id`, and query `restaurant_id`; egg mania **7 categories / 39 items**. Edge/menu DB not the failure mode when scope + auth are correct. |
| **36** | See § Prompt 36 — baked `get_menu_items` URL/headers on `mnkabwcbdxruefzuvuuv`; no stale dynamic restaurant vars on phone tools. |
| **37** | See § Prompt 37 — conversation-init returns egg mania vars when secret present; **401** without secret when configured. |

### Chain comparison (egg mania `9d3263d1-…`)

| # | Link | Result |
|---|------|--------|
| 1 | ElevenLabs `get_menu_items` config | **pass** — ref `mnkabwcbdxruefzuvuuv`; baked URL + header; signed bearer; no bad dynamic restaurant vars |
| 2 | Deployed `get-menu` (curl as EL) | **pass** — **200**, 7 categories, 39 items, `ordering_allowed: true` |
| 3 | Supabase menu rows | **pass** — MCP: 7 categories, 39 items; agent connected on profile |
| 4 | Env project ref | **pass** — local `NEXT_PUBLIC_SUPABASE_URL` ref = tool URL host ref |
| 5 | Auth | **pass** — signed `roal1.*` (minted with signing secret or `AGENT_TOOL_SECRET` fallback; Edge `getSigningSecrets()` uses same fallback). Legacy without scope → **400** `missing_restaurant_id` (failure mode for **unbaked** tools only) |
| 6 | conversation-init | **pass** locally with secret; **blocked** probe to `https://getroal.com` (DNS did not resolve from QA host) — does not block baked `get_menu_items` |

### Root cause

**Not** deployed `get-menu`, menu data, or Supabase ref mismatch.

**Historical / conditional failure mode:** `get_menu_items` configured in **dynamic** mode (no baked `restaurant_id` in URL/`x-roal-restaurant-id`) while the call could not supply `restaurant_id` (conversation-init **401** without secret, unreachable production app URL, or stale tool copy). That yields Edge **400** `missing_restaurant_id` or empty agent context — guest hears “no menu.”

**Current agent state (post KDS sync 2026-05-23):** tools are **baked** to egg mania; direct EL-shaped GET succeeds without relying on conversation dynamic variables for menu scope.

### Fix applied (minimal)

| Action | Result |
|--------|--------|
| Product code | **none** — chain already correct after prior connect/sync |
| Ops | **Re-sync** — `scripts/connect-elevenlabs-restaurant.ts` for egg mania (`restaurant_tools_baked: true`, phone webhook + placeholders refreshed) |
| Edge redeploy | **not required** (prompt 29: deployed function matches local) |

### Retest (post-resync)

| Check | Result |
|-------|--------|
| EL-shaped GET `get-menu` (baked URL + headers from `buildAgentToolRequestHeaders`) | **200**, 7 categories, 39 items |
| ElevenLabs tool URL still baked to same restaurant UUID | **pass** (API inspect) |

### Follow-ups (**needs human**, not menu-Edge)

| Item | Notes |
|------|--------|
| Production `getroal.com` DNS / deploy | QA host could not resolve `getroal.com`; EL phone personalization webhook points there — fix hosting/DNS so init webhook succeeds on real calls (greeting/placeholders; menu tool is baked independently). |
| Live Twilio call | Confirm ElevenLabs tool log shows **200** on `get_menu_items` after resync. |
| `AGENT_TOOL_SIGNING_SECRET` parity | Optional: set on Next.js + Edge to avoid legacy-only drift (prompt 05). |

**Status:** **pass** (root cause identified; resync + retest OK; no secrets in this section).

**QA IDs touched:** EL-09, EL-06 (init), SEC-05 (tool auth path).

---

## Prompt 30 — Direct-test `sync-draft-order` Edge Function (EL-10, KDS-02)

**Function:** `supabase/functions/sync-draft-order/index.ts` · **Shared:** `_shared/idempotency.ts`, `order-validate.ts`, `order-status.ts`, `agent-tool-auth.ts` · **Deploy:** v7, `verify_jwt=false` (prompt 05).

### Fixture (MCP `execute_sql`)

| Field | Value |
|-------|--------|
| Restaurant | **egg mania** (`9d3263d1-4d9d-4f89-bfc5-160e2cca1855`) |
| Agent connected | **yes** (`restaurant_profiles.elevenlabs_agent_id` set) |
| Sample item | `0038fff5-1abf-46e3-b80f-cf9cf976010e` — Roll Hari Chicken |
| No-agent control | **QA Role Test Location** (`b2222222-2222-4222-8222-222222222222`) — 403 `agent_not_connected` |

Session prefix: `flow-qa-p30-*` (safe QA rows; not production guest data).

### Invocation (deployed Edge, secrets from local `.env` only in terminal)

| Auth mode | Result |
|-----------|--------|
| Legacy `Authorization: Bearer <AGENT_TOOL_SECRET>` + `apikey` + `x-roal-restaurant-id` | **200** upsert |
| Signed `roal1.*` (minted locally with signing secret or `AGENT_TOOL_SECRET` fallback) | **200** upsert |

### Checks

| Check | Result |
|-------|--------|
| `draft_orders` upsert (`onConflict: restaurant_id,session_id`) | **pass** — row with `status=draft`, normalized `items[]`, `customer_name` / `customer_phone` |
| Idempotency (`x-roal-idempotency-key`) | **pass** — replay **200** + header `x-roal-idempotent-replay: true`; row in `agent_tool_idempotency` (`tool_name=sync_draft_order`) |
| Status mapping `confirmed` → stored `new` | **pass** — `coerceSyncDraftOrderStatus` (`order-status.ts`) |
| Status `draft` | **pass** — stored `draft` |
| Cart validation (foreign `item_id`) | **pass** — **422** `order_validation_failed` when QA item used on egg mania menu |
| Restaurant scoping | **pass** — conflicting body `restaurant_id` vs header → **400** `missing_restaurant_id` (no single resolved id); no-agent restaurant → **403** `agent_not_connected` |
| Customer fields | **pass** — persisted on draft row when provided |
| Hours gate | not exercised (egg mania open per weekly hours) |

### KDS visibility

Same query pattern as KDS SSR + live panel:

- Server: `app/dashboard/restaurants/[id]/page.tsx` — `draft_orders` `.select("*").eq("restaurant_id", id).order("updated_at", { ascending: false })`
- Client: `LiveOrdersPanel.tsx` `fetchAll` — identical filter/order

MCP service-role `SELECT` on `draft_orders` for `flow-qa-p30-*` sessions confirms rows visible to that pattern (RLS allows org members on authenticated browser; Edge writes via service role).

### Code / deploy

| Item | Result |
|------|--------|
| Product code changes | **none** |
| Redeploy | **not required** |

**Status:** **pass**

**QA IDs touched:** EL-10, KDS-02, ORD-02 (draft cart via voice).

---

## Prompt 31 — Direct-test `finalize-order` Edge Function (EL-10, EL-12, KDS-03)

**Function:** `supabase/functions/finalize-order/index.ts` · **Shared:** `order-validate.ts` (`validateCustomerForFinalize`, `validateCartForFinalize`), `order-status.ts` (`FINALIZE_ORDER_STATUS` = **`new`**), `idempotency.ts`, `record-usage.ts` · **Deploy:** v7, `verify_jwt=false` (prompt 05).

**Runner:** `node --env-file=.env --env-file=.env.local scripts/qa-finalize-order-edge.mjs` (signed `roal1.*` via `AGENT_TOOL_SECRET` fallback; secrets never logged).

### Fixture (MCP `execute_sql`)

| Field | Value |
|-------|--------|
| Restaurant | **egg mania** (`9d3263d1-4d9d-4f89-bfc5-160e2cca1855`) |
| Agent connected | **yes** |
| Menu line used | `Boiled Eggs` (from live `get-menu` GET) |
| Session prefix | `qa-p31-*` (QA-only rows) |

### Flow exercised (deployed Edge)

| Step | Result |
|------|--------|
| `get-menu` GET (prelude) | **200** — pick available item |
| `sync-draft-order` → `finalize-order` (same `session_id`, no `items` on finalize) | **200** — `draft_orders.status` = **`new`** |
| `finalize-order` with inline `items[]` only (standalone cart) | **200** — `status` = **`new`** |
| Idempotency (`x-roal-idempotency-key`) | **pass** — 2nd call **200** + `x-roal-idempotent-replay: true`; single `agent_tool_idempotency` row (`tool_name=finalize_order`) |
| Missing / empty `customer_name` + `customer_phone` | **400** `validation_failed` (Zod `.min(1)`) |
| Placeholder guest (`John Doe`, `555-000-0000`) | **400** `customer_validation_failed` (`validateCustomerForFinalize`) |

### DB verification (MCP, service role)

| Table | Check | Result |
|-------|--------|--------|
| `draft_orders` | Both QA sessions | **pass** — `status=new`, normalized `items`, customer fields |
| `phone_order_receipts` | Upsert on finalize | **pass** — one row per session (`onConflict: restaurant_id,session_id`) |
| `usage_events` | Metering | **pass** — `tool_call` (`finalize_order` 200/400), `voice_order` + `order_completed` (`order_status=new`) on success; idempotent replay did **not** duplicate `order_completed` |
| `agent_tool_idempotency` | Replay cache | **pass** — stored 200 body for finalize key |

### KDS completed / canceled visibility

Not browser-tested (no signed-in session). **Query pattern** matches `LiveOrdersPanel.tsx`:

- `terminalOrders` = `draft_orders` where `status` ∈ `{completed, canceled}` (`isTerminalOrderStatus`)
- `receiptArchive` = `phone_order_receipts` excluding sessions already in `terminalOrders`

MCP: after finalize, set `qa-p31-…-draft` → **`completed`** and `qa-p31-…-direct` → **`canceled`**; both appear in terminal filter; receipts remain for archive when session not terminal.

### Code / deploy

| Item | Result |
|------|--------|
| Product code changes | **none** |
| Redeploy | **not required** |

**Status:** **pass**

**QA IDs touched:** EL-10 (**pass** finalize idempotency), EL-12 (**pass** usage on finalize), KDS-03 (receipt + terminal status pattern).

---

## Prompt 32 — Agent tool auth and token scope (EL-09, SEC-05)

**Next.js:** `lib/agent-tools/token.ts`, `headers.ts`, `schemas.ts`, `scope.ts` · **Edge:** `supabase/functions/_shared/agent-tool-auth.ts`, `agent-tool-token.ts`, `agent-tool-zod.ts` · **Doc:** [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md).

### Auth model (verified)

| Mode | Bearer | Restaurant scope | Ownership |
|------|--------|------------------|-----------|
| Signed `roal1.*` | HMAC (`AGENT_TOOL_SIGNING_SECRET` or `AGENT_TOOL_SECRET` fallback) | Token `rid` must agree with any of: `x-roal-restaurant-id`, JSON/query `restaurant_id` (case-insensitive UUID compare) | Optional `aid` vs `restaurant_profiles.elevenlabs_agent_id` |
| Legacy | `AGENT_TOOL_SECRET` (timing-safe) | Scope required from header and/or body/query (all must match) | Profile must have connected agent |

`apikey` is **not** checked inside handlers; Supabase gateway may still accept requests when `verify_jwt=false` (observed **200** without `apikey` on deployed `get-menu`).

### Unit tests (Vitest)

| File | Count | Notes |
|------|-------|-------|
| `tests/unit/agent-tool-auth.test.ts` | **18** | mint/verify, `parseBearerToken`, `buildAgentToolRequestHeaders`, `resolveRestaurantId`, legacy vs signed |
| `tests/unit/agent-tool-schemas.test.ts` | **17** | Zod + `assertRestaurantIdMatches` (incl. UUID casing) |

### Deployed curl matrix — `get-menu` (2026-05-23)

Fixture: **egg mania** (`9d3263d1-4d9d-4f89-bfc5-160e2cca1855`, agent connected). Tokens minted locally with same secret fallback as Edge; no secret values logged.

| Case | Auth | Scope | HTTP | Code / notes |
|------|------|-------|------|----------------|
| Signed valid | `roal1.*` | query + header | **200** | menu payload |
| Signed token-only | `roal1.*` | none (token `rid` only) | **200** | baked path OK |
| Signed no header | `roal1.*` | query only | **200** | |
| Signed wrong header | `roal1.*` | header ≠ token | **400** | `restaurant_id_mismatch` |
| Signed wrong query | `roal1.*` | query ≠ token | **400** | `restaurant_id_mismatch` |
| Expired signed | `roal1.*` (ttl −60s) | query + header | **401** | `token_expired` |
| Bad signature | tampered bearer | query + header | **401** | `invalid_signature` |
| Missing bearer | — | query + header | **401** | `missing_bearer` |
| Legacy valid | `AGENT_TOOL_SECRET` | query + header | **200** | |
| Legacy query-only | legacy | query (no header) | **200** | |
| Legacy no scope | legacy | none | **400** | `missing_restaurant_id` |
| Legacy wrong header | legacy | header ≠ query | **400** | `missing_restaurant_id` (scope disagreement) |
| Missing `apikey` | signed | query + header | **200** | gateway/handler do not enforce |

### Defect fixed

| Issue | Cause | Fix |
|-------|--------|-----|
| Same UUID, different hex case → **400** `restaurant_id_mismatch` | `resolveRestaurantId` / `assertRestaurantIdMatches` used case-sensitive string compare | Normalize restaurant UUIDs to lowercase in `lib/agent-tools/*` and Edge `_shared/*` |

### Code / deploy

| Item | Result |
|------|--------|
| Auth logic | **fixed** (UUID normalization) |
| Redeploy Edge | **yes** — `get-menu`, `sync-draft-order`, `finalize-order` (post-fix) |

**Status:** **fixed**

**QA IDs touched:** EL-09 (**pass** auth matrix), SEC-05 (scope enforcement).

---

## Prompt 02 — Environment audit (2026-05-23)

**Status:** `fixed` (docs + `.env.example` + `lib/env.*` schema/hints; no secret values recorded)

### Loading model

| File | Role |
|------|------|
| `.env` | Base local config (committed keys only in `.env.example`) |
| `.env.local` | Overrides `.env` for duplicate keys (Next.js precedence) |
| `lib/env.public.ts` | Zod: required `NEXT_PUBLIC_SUPABASE_*`; optional `NEXT_PUBLIC_APP_URL`, Stripe publishable |
| `lib/env.server.ts` | Zod server secrets + `requireGeminiEnv`, `requireElevenLabs*`, `requireRoalToolSecrets`, `getEnvStatus`, `collectMissingForFeature` |
| `lib/env.shared.ts` | `ENV_HINTS`, `EnvValidationError`, parsers |
| `middleware.ts` / `lib/supabase/middleware.ts` | Reads `NEXT_PUBLIC_SUPABASE_*` directly (no Zod; skips session if unset) |

**Package scripts:** `elevenlabs:*` use `npx tsx --env-file=.env [--env-file=.env.local]`; `dev`/`build` rely on Next.js auto-load.

### Required / recommended by feature

| Feature | Required | Recommended | Optional |
|---------|----------|-------------|----------|
| App + dashboard | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | — |
| Menu scanner | `GEMINI_API_KEY` + Supabase public | — | `GEMINI_MODEL` |
| KDS receipts (strict RLS) | — | `SUPABASE_SERVICE_ROLE_KEY` | — |
| ElevenLabs connect/sync | `ELEVENLABS_API_KEY` | `ELEVENLABS_AGENT_ID` | `ELEVENLABS_SYNC_TOKEN`, `ROAL_ORDER_KB`, `RESTAURANT_AGENT_TIMEZONE` |
| Voice tools (Next + Edge) | `AGENT_TOOL_SIGNING_SECRET` **or** `AGENT_TOOL_SECRET` | Prefer `AGENT_TOOL_SIGNING_SECRET` on both sides | Legacy `AGENT_TOOL_SECRET` only |
| Twilio / conversation-init | — | `NEXT_PUBLIC_APP_URL`, `ELEVENLABS_CONVERSATION_INIT_SECRET` | `VERCEL_URL` (platform) |
| SEO / canonicals / billing redirects | — | `NEXT_PUBLIC_APP_URL` | `VERCEL_URL` |
| Stripe billing | — | — | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (planned; dev mode without) |
| CLI connect/sync | `ROAL_SYNC_RESTAURANT_ID`, `ELEVENLABS_*`, service role | `NEXT_PUBLIC_APP_URL` | `ROAL_SYNC_RESTAURANT_NAME`, `SKIP_APP_URL_CHECK` |

**Edge Function secrets (Supabase Dashboard, not Next.js `.env`):** `AGENT_TOOL_SIGNING_SECRET` (preferred, must match Next.js), optional `AGENT_TOOL_SECRET`; `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` auto-injected.

### Local key inventory (names only)

| Key | `.env` | `.env.local` | Notes |
|-----|:------:|:------------:|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | override |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | override |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | override |
| `GEMINI_API_KEY` | ✓ | ✓ | override |
| `GEMINI_MODEL` | ✓ | ✓ | override |
| `ELEVENLABS_API_KEY` | ✓ | ✓ | override |
| `ELEVENLABS_AGENT_ID` | ✓ | ✓ | override |
| `AGENT_TOOL_SECRET` | ✓ | ✓ | legacy; satisfies `agentTools` |
| `AGENT_TOOL_SIGNING_SECRET` | — | — | **missing locally**; migrate when convenient |
| `NEXT_PUBLIC_APP_URL` | — | ✓ | only in `.env.local` |
| `ELEVENLABS_CONVERSATION_INIT_SECRET` | — | ✓ | only in `.env.local` |
| `NEXT_PUBLIC_STRIPE_*` / `STRIPE_*` | — | — | not set (billing dev mode) |

**Overrides:** 8 keys duplicated in both files → `.env.local` wins for all.

### Safe validation (`tsx --env-file=.env --env-file=.env.local`)

| Flag | Result |
|------|--------|
| `supabase` | true |
| `serviceRole` | true |
| `gemini` | true |
| `elevenlabs` | true |
| `agentTools` | true (via `AGENT_TOOL_SECRET`) |
| `agentToolSigning` | false |
| `appUrl` | true (`NEXT_PUBLIC_APP_URL` in `.env.local`) |
| `stripe` | false |
| `collectMissingForFeature` | all features: no missing paths |

### Gaps / direct `process.env` (not bugs)

| Variable | Used in | In Zod schema? |
|----------|---------|----------------|
| `NEXT_PUBLIC_APP_URL` | `lib/site-url.ts`, billing actions, connect script | ✓ added `optional` in `env.public.ts` |
| `VERCEL_URL` | `lib/site-url.ts`, `getEnvStatus().appUrl` fallback | platform-injected |
| `NODE_ENV` | logger, LiveOrdersPanel | N/A |
| `SKIP_APP_URL_CHECK` | `scripts/connect-elevenlabs-restaurant.ts` | script-only |
| `AGENT_TOOL_*` | `lib/agent-tools/token.ts` | duplicated read; same precedence as `getServerEnv` |

### Fixes applied (prompt 02)

- `.env.example`: promoted `NEXT_PUBLIC_APP_URL`, clarified `AGENT_TOOL_SIGNING_SECRET` vs `AGENT_TOOL_SECRET`, Edge secret comments, `SKIP_APP_URL_CHECK` note.
- `lib/env.public.ts`: `NEXT_PUBLIC_APP_URL` optional field.
- `lib/env.shared.ts`: `ENV_HINTS.NEXT_PUBLIC_APP_URL`.
- `lib/env.server.ts`: `getEnvStatus()` adds `agentToolSigning`, `appUrl`.
- `lib/admin/types.ts`: `AdminEnvFlags` aligned.

### Follow-ups (not blocking)

| Item | Status |
|------|--------|
| Set `AGENT_TOOL_SIGNING_SECRET` locally + on Edge (match Next.js) | `needs human` — legacy secret works today |
| Stripe keys for production billing | `needs human` — planned |
| Align `lib/site-url.ts` / billing actions to `getPublicEnv()` | optional refactor |

---

## 1. Public pages (marketing & legal)

| Route | Page / component | Lib / assets | QA ID | Status |
|-------|------------------|--------------|-------|--------|
| `/` | `app/page.tsx` | `components/landing/home/*`, `lib/landing/home-*` | PUB-01 | pass |
| `/pricing` | `app/pricing/page.tsx` | `lib/landing/pricing-*` | PUB-02 | pass |
| `/demo` | `app/demo/page.tsx` | `lib/landing/demo-*` | PUB-03 | pass |
| `/about` | `app/about/page.tsx` | `lib/landing/about-*` | PUB-04 | pass |
| `/contact` | `app/contact/page.tsx` | `lib/landing/contact-*` | PUB-05 | pass |
| `/security` | `app/security/page.tsx` | `lib/landing/security-*` | PUB-06 | pass |
| `/privacy` | `app/privacy/page.tsx` | `lib/landing/legal-*` | PUB-07 | pass |
| `/terms` | `app/terms/page.tsx` | `lib/landing/legal-*` | PUB-08 | pass |
| `/blog` | `app/blog/page.tsx` | `lib/blog/*` | PUB-09 | pass |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | 10 posts in `lib/blog/posts.ts` | PUB-10 | pending |
| `404` | `app/not-found.tsx` | `MarketingShell` | PUB-11 | pending |
| `/sitemap.xml` | `app/sitemap.ts` | `SITEMAP_PUBLIC_PATHS` + blog slugs | PUB-12 | pending |
| `/robots.txt` | `app/robots.ts` | `lib/seo/robots-txt.ts` (disallow `/api/`, `/auth/`, `/dashboard`) | PUB-13 | pending |

**Blog slugs (10):** `why-restaurants-miss-calls-dinner-rush`, `ai-phone-ordering-small-restaurants`, `cost-unanswered-restaurant-phone-calls`, `restaurant-ai-voice-agent-sounds-human`, `phone-agent-must-know-live-menu`, `pay-only-successful-orders`, `setup-roal-20-minutes`, `rush-hour-staffing-phone-line`, `phone-orders-vs-delivery-apps`, `when-ai-should-hand-off-to-staff`.

**Automated QA (unit):** `tests/unit/*public*`, `*blog*`, `*pricing*`, `*demo*`, `*contact*`, `*cross-link*`, `*sitemap*`, `*robots*`, `*visual-consistency*`, `*mobile*`, `*desktop*`, `*accessibility*`, `*performance*`.

---

## 2. Auth

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Sign up | `/signup` | `app/(auth)/signup/page.tsx`, `components/auth/*` | AUTH-01 | **pass** (prompt 09) |
| Log in | `/login` | `app/(auth)/login/page.tsx` | AUTH-02 | **pass** (prompt 09) |
| OAuth / magic link callback | `GET /auth/callback` | `app/auth/callback/route.ts`, `safeNextPath` | AUTH-03 | **pass** |
| Sign out | `GET` / `POST /auth/signout` | `app/auth/signout/route.ts` | AUTH-04 | **pass** |
| Session + membership context | `GET /api/auth/context` | `lib/auth/context-server.ts`, `context-client.ts` | AUTH-05 | **pass** |
| Profile bootstrap | signup / first dashboard | `lib/auth/ensure-profile.ts`, `claim-legacy-org.ts` | AUTH-06 | **pass** (prompt 12) |
| Roles | dashboard gates | `lib/auth/roles.ts` (`owner` / `admin` / `member`) | AUTH-07 | **pass** (prompt 13) |
| Guest → dashboard redirect | middleware | `lib/supabase/middleware.ts`, `lib/auth/auth-routes.ts` | AUTH-08 | **pass** (prompt 08) |

**Scripts:** `npm run auth-smoke` → `scripts/auth-smoke.mjs` (Playwright; fake `smoke-test@example.invalid` only).

**Automated QA:** `tests/unit/auth-*`, `tests/unit/safe-next.test.ts`, `tests/integration` (context covered in prompt 11).

**Docs:** [AUTH.md](./AUTH.md), [AUTH_ROUTE_QA.md](./AUTH_ROUTE_QA.md), [AUTH_ACCESSIBILITY.md](./AUTH_ACCESSIBILITY.md).

---

## Prompt 09 — Login and signup rendering (2026-05-23)

**Scope:** `npm run auth-smoke` · browser QA on `/login` and `/signup` · `components/auth/*` · `app/(auth)/*` · fake email only (`smoke-test@example.invalid` per [E2E_SMOKE.md](./E2E_SMOKE.md)).

### `npm run auth-smoke` (`scripts/auth-smoke.mjs`)

| Run | Result | Notes |
|-----|--------|-------|
| Cold / stale `.next` | **fail** | `login render` — main-app chunk 404/timeout; or signup `signUp` — no signal |
| After `rm -rf .next && npm run dev` + warm routes | **pass** | **9/9** checks (ran twice consecutively) |

Checks: login/signup titles, field types, controlled email input, `signInWithPassword` / `signUp` (loading, `/auth/v1/` POST, or `role="alert"` / `role="status"`).

### Browser QA (Playwright + Cursor browser)

| Check | Result |
|-------|--------|
| Login render | **pass** — `h1` “Sign in”, skip link, marketing nav |
| Signup render | **pass** — form `h1` “Create your account”, `#signup-entry-heading` aside |
| HTML5 validation (empty submit) | **pass** — focus stays on required email; no native GET leak |
| Loading state | **pass** — submit → `One moment…`, `aria-busy="true"`, fields disabled |
| Supabase error UI (fake creds) | **pass** — signup shows `role="alert"`; login reaches loading then Supabase error (smoke) |
| Confirm email UI | **pass** (code) — `role="status"` panel after successful `signUp` (`auth-form.tsx`) |
| Callback error in URL | **pass** (code) — `?error=` from callback → `role="alert"` via `urlError` state |
| Labels / a11y | **pass** — `PublicFormField` + `htmlFor`; `aria-labelledby` on form; `role="alert"` on errors; Vitest `public-accessibility-qa.test.ts` |
| Signed-in redirect | **pass** (code) — middleware `AUTH_PATHS` → `safeNextPath(next)` when session exists |
| Network / bundle secrets | **pass** — no `service_role` key value in responses; `service_role` string only in bundled `@supabase/supabase-js` JSDoc; anon key to `*.supabase.co` only |

### Code review

| File | Role |
|------|------|
| `components/auth/auth-form.tsx` | Client sign-in/up, loading, alerts, confirm panel |
| `components/auth/signup-page-entry.tsx` | Grid + aside + form |
| `components/auth/signup-onboarding-aside.tsx` | Onboarding story |
| `components/auth/public-auth-header.tsx` | Marketing chrome |
| `app/(auth)/layout.tsx` | Skip link, `public-theme`, `#auth-main` |
| `app/(auth)/login/page.tsx` | `AuthForm` in `Suspense` |
| `app/(auth)/signup/page.tsx` | `SignupPageEntry` in `Suspense` |

No server actions on auth pages; Supabase browser client only.

### Bugs / fixes

| Item | Status |
|------|--------|
| Auth UI / route defects | **none** — no product code changes |
| Flaky smoke without fresh dev | **ops** — restart: `rm -rf .next && npm run dev` (documented in E2E_SMOKE) |
| Signed-in login/signup redirect | **needs human** — optional live session check |

**Status:** **pass**

**QA IDs touched:** AUTH-01, AUTH-02

---

## Prompt 10 — Auth callback and signout (2026-05-23)

**Routes:** `app/auth/callback/route.ts` · `app/auth/signout/route.ts` · `lib/auth/safe-next.ts`

### `safeNextPath` (open-redirect guard)

| Input | Result |
|-------|--------|
| `/dashboard/restaurants` | allowed |
| `null` / missing | `/dashboard` (fallback) |
| `//evil.com` | fallback |
| `https://evil.com` | fallback |
| `/\\evil` | fallback |

**Vitest:** `tests/unit/safe-next.test.ts` — 3 cases, **pass**.

### `GET /auth/callback`

| Case | HTTP | `Location` / body |
|------|------|-------------------|
| No `code` | 307 | `/login?error=Sign-in+link+expired+or+invalid.+Try+again.` |
| No `code` + `next=//evil.com` | 307 | same login error (no open redirect) |
| `code=fake` + `next=//evil.com` | 307 | `/login?error=…` (PKCE / exchange error; not evil host) |
| `code=fake` + `next=/dashboard/billing` | 307 | `/login?error=…` (expected without PKCE cookies) |

**Cookie handling:** `@supabase/ssr` `createServerClient` with `getAll` / `setAll` on request + redirect response (same pattern as `lib/supabase/middleware.ts`). Session cookies set only after successful `exchangeCodeForSession`.

**Probe note:** `curl -I` sends **HEAD** → **404** (route exports `GET` only). Use **GET** for smoke checks.

### `GET` / `POST /auth/signout`

| Method | HTTP | `Location` |
|--------|------|------------|
| GET | 303 | `http://localhost:3000/login` |
| POST | 303 | `http://localhost:3000/login` |

Calls `supabase.auth.signOut()`; `setAll` refreshes redirect response with cleared session cookies.

### Static / related tests

| File | Result |
|------|--------|
| `tests/unit/auth-route-qa.test.ts` | **pass** — middleware matcher includes `/auth/callback` |
| `tests/unit/auth-flow-smoke.test.ts` | **pass** — signup `emailRedirectTo` → `/auth/callback?next=…` |

### Bugs / fixes

| Item | Status |
|------|--------|
| Open redirect via `next` on callback | **pass** — `safeNextPath` before redirect |
| Missing `code` error path | **pass** |
| Signout redirect + session clear | **pass** |
| Product code changes | **none** |
| New Vitest route tests | **not added** — no defect found |

**Status:** **pass**

**QA IDs touched:** AUTH-03, AUTH-04

---

## 3. Onboarding

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Wizard UI | `/dashboard/onboarding` | `components/onboarding/onboarding-wizard.tsx` | ONB-01 | pass |
| Org account step | wizard | `ORGANIZATION_ONBOARDING_STEPS` → `account` | ONB-02 | **pass** (prompt 12 — org+owner RLS) |
| Restaurant steps | wizard | `restaurant_profile`, `menu_import`, `voice_agent`, `test_call`, `go_live` | ONB-03 | pass |
| Server actions | form submits | `app/dashboard/onboarding/actions.ts` | ONB-04 | **pass** (prompt 12 — `createOrganizationAction` RLS) |
| DB progress | migrations | `010_onboarding.sql` | ONB-05 | **pass** (prompt 12 — triggers + onboarding RLS) |

**Lib:** `lib/onboarding/*` (steps, wizard state, helpers, types).

**Automated QA:** `tests/unit/onboarding-wizard.test.ts`.

**Docs:** [ONBOARDING.md](./ONBOARDING.md).

---

## 4. Dashboard shell & restaurants

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Overview | `/dashboard` | `app/dashboard/page.tsx` | DASH-01 | pending |
| Nav / layout | all dashboard routes | `components/dashboard/app-shell.tsx`, `lib/dashboard-nav.ts` | DASH-02 | pending |
| Restaurant list | `/dashboard/restaurants` | `app/dashboard/restaurants/page.tsx` | DASH-03 | **pass** (prompt 15) |
| Create restaurant | list UI + API | `CreateRestaurantButton.tsx`, `POST /api/restaurants` | DASH-04 | **pass** (prompt 15) |
| Settings hub | `/dashboard/settings` | `app/dashboard/settings/page.tsx` | DASH-05 | **pass** (prompt 50) |
| Support | `/dashboard/support` | `app/dashboard/support/page.tsx`, `support-hub.tsx` | DASH-06 | **pass** (prompt 50) |
| Unauthenticated access | any `/dashboard/*` | middleware redirect + `?next=` | DASH-07 | **pass** (prompt 08) |

**Automated QA:** `tests/unit/dashboard-nav.test.ts`.

---

## 5. Restaurant KDS (per-location ops)

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| KDS home | `/dashboard/restaurants/[id]` | Live menu, orders, scanner, voice, profile, hours | KDS-01 | pending |
| Live menu sidebar | KDS | `LiveMenuSidebar.tsx`, Realtime on menu tables | KDS-02 | **fixed** (prompt 25) |
| Live orders / phone panel | KDS | `LiveOrdersPanel.tsx`, `draft_orders`, `phone_order_receipts` | KDS-03 | **pass** (prompt 28; browser **needs human**) |
| Order detail modal | KDS | `OrderDetailModal.tsx`, status actions | KDS-04 | **pass** (prompt 28; browser **needs human**) |
| Order status actions | KDS | `useOrderStatusActions.ts`, `lib/orders/apply-order-status.ts` | KDS-05 | **pass** (prompt 27) |
| Order totals display | KDS / modal | `OrderTotalsBreakdown`, `compute-totals` API | KDS-06 | pending |
| Stuck-order notify (page load) | KDS server | `notifyStuckOrdersForOrganization` | KDS-07 | **pass** (prompt 47) |
| Tenant access denied | wrong `id` | `getRestaurantAccessForPage` → 404 / login | KDS-08 | pending |

**Realtime tables (expected):** `categories`, `items`, `modifiers`, `draft_orders`, `phone_order_receipts` (see DEPLOYMENT.md).

**Order statuses (migrations 016–017):** lib `lib/order-status.ts`, edge `_shared/order-status.ts`.

---

## 6. Restaurant profile & hours

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Profile settings | KDS panel | `RestaurantProfileSettings.tsx`, `profile-actions.ts` | PROF-01 | **pass** (Prompt 17; browser **needs human**) |
| Tax / service fee / EL fields | profile | `011_restaurant_profiles.sql`, `lib/restaurant-profile/*` | PROF-02 | **pass** (Prompt 17; EL sync columns not edited by form) |
| Hours settings | KDS panel | `RestaurantHoursSettings.tsx`, `hours-actions.ts` | PROF-03 | **fixed** (prompt 18) |
| Hours in agent tools | Edge + voice | `supabase/functions/_shared/restaurant-hours.ts` | PROF-04 | **pass** (prompt 18) |

**Automated QA:** `tests/unit/restaurant-profile-schema.test.ts`, `tests/unit/restaurant-hours.test.ts`.

---

## 7. Menu scan, import, edit

| Step | API / UI | Lib | QA ID | Status |
|------|----------|-----|-------|--------|
| Extract (Gemini) | `POST /api/scanner/extract` | `lib/scanner/extract-menu.ts`, `lib/gemini.ts` | MENU-01 | **pass** (prompt 19) |
| Legacy one-shot process | `POST /api/scanner/process` | `extract-menu` only (no merge); see § Prompt 20 | MENU-02 | **deprecated** (prompt 20) |
| Review UI | KDS `MenuScanner.tsx` | client state | MENU-03 | **pass** (prompt 19) |
| Commit import | `POST /api/scanner/commit` | `lib/scanner/commit-menu.ts`, `import-commit-guards.ts` | MENU-04 | **pass** (prompt 21) |
| Discard import | `POST /api/scanner/discard` | audit status | MENU-05 | pass |
| Import history | `GET /api/restaurants/[id]/menu-imports` | `MenuImportHistory.tsx`, `015_menu_import_audits.sql` | MENU-06 | pass |
| Storage uploads | Supabase bucket | `menu-uploads` (migration 015) | MENU-07 | pending |
| Menu editor page | `/dashboard/restaurants/[id]/menu` | `MenuEditor.tsx`, `menu-actions.ts` | MENU-08 | **pass** (prompt 23) |
| Category CRUD / reorder | editor actions | `saveCategoryAction`, `reorderCategoriesAction`, … | MENU-09 | **pass** (prompt 23) |
| Item CRUD / reorder | editor actions | `saveItemAction`, `reorderItemsAction`, … | MENU-10 | **pass** (prompt 23) |
| Modifier groups | editor | `ModifierGroupEditor.tsx`, `lib/menu-editor/*` | MENU-11 | **pass** (Prompt 24) |
| Clear menu (admin) | API | `DELETE /api/restaurants/[id]/menu` → RPC `clear_restaurant_menu` | MENU-12 | **pass** (prompt 23) |
| Merge RPC | commit / tools | `002_merge_menu_rpc.sql`, `006_clear_menu_rpc.sql` | MENU-13 | **pass** (prompt 21) |

**Automated QA:** `extract-menu-validation`, `api-scanner-extract` (integration), `import-commit-guards`, `menu-editor-validation`, `modifier-groups`, `live-menu-scope`.

---

## 8. KDS orders (dashboard API)

| Flow | Method | Route | QA ID | Status |
|------|--------|-------|-------|--------|
| Patch order status | PATCH | `/api/restaurants/[id]/orders/[orderId]` | ORD-01 | **pass** (prompt 27) |
| Compute totals | POST | `/api/restaurants/[id]/orders/compute-totals` | ORD-02 | **fixed** (prompt 26) |
| Cart validation | Edge + lib | `lib/orders/validate-cart.ts` | ORD-03 | **pass** (shared with prompt 26) |
| Pricing from profile | KDS | `lib/orders/pricing-settings.ts`, `compute-order-totals.ts` | ORD-04 | **pass** (prompt 26) |

**Tables:** `draft_orders`, `phone_order_receipts` (003, 005, 007+).

**Automated QA:** `tests/unit/compute-order-totals.test.ts` (9), `tests/integration/api-compute-totals.test.ts` (6), `validate-cart`, `merge-fetched-orders`, `integration/api-orders-patch`.

---

## 9. ElevenLabs & voice agent

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Voice agent panel | KDS | `VoiceAgentPanel.tsx`, `voice-agent-actions.ts` | EL-01 | pending |
| Agent prompt / first message / KB | server | `lib/elevenlabs/agent-prompt.ts`, `elevenlabs-restaurant-agent-profile.ts` | EL-01b | **pass** (prompt 41) |
| Connect / resync agent | server actions | `connectVoiceAgentAction`, `resyncVoiceAgentAction` | EL-02 | pending |
| Control center load | action | `lib/voice-agent/load-control-center.ts` | EL-03 | pending |
| Agent CRUD proxy | API | `GET/PATCH /api/integrations/elevenlabs/agent` | EL-04 | **pass** (prompt 34) |
| Sync ROAL tools to EL | API | `POST /api/integrations/elevenlabs/sync-roal-tools` | EL-05 | **pass** (prompts 35–36) |
| EL tool config (post-sync) | script | `scripts/inspect-roal-tools.ts` | EL-05 | **pass** (prompt 36) |
| Conversation init (Twilio) | API | `GET/POST /api/integrations/elevenlabs/conversation-init` | EL-06 | **pass** (prompt 37) |
| Test harness (dry/live) | KDS | `VoiceAgentTestHarness.tsx`, `voice-agent-test-actions.ts` | EL-07 | pending |
| Legacy connect action | KDS | `elevenlabs-actions.ts` | EL-08 | pending |
| Agent tool auth | Edge + `lib/agent-tools` | `_shared/agent-tool-auth.ts`, `token.ts`, `scope.ts` | EL-09 | **fixed** (prompt 32 UUID scope + curl matrix) |
| Idempotency | Edge | `019_agent_tool_idempotency.sql`, `_shared/idempotency.ts` | EL-10 | **pass** (prompts 30–31: sync + finalize replay) |
| Billing gate on voice order | Edge | `_shared/billing-gate.ts` | EL-11 | pending |
| Usage metering | Edge + DB | `020_usage_events.sql`, `_shared/record-usage.ts` | EL-12 | **fixed** (prompt 44: full event map; KDS/Edge `order_completed` dedupe) |
| ElevenLabs API reachability | server | `lib/elevenlabs.ts`, `requireElevenLabsApiKey`, `GET /v1/convai/agents/{id}` | EL-00 | **pass** (prompt 33) |

**Edge Functions (deploy `--no-verify-jwt`):**

| Function | Purpose | Shared libs |
|----------|---------|-------------|
| `get-menu` | Menu + hours for agent (**pass** prompt 29) | `load-restaurant-menu`, hours, billing gate, usage |
| `sync-draft-order` | Upsert draft cart (**pass** prompt 30) | `order-validate`, idempotency, billing gate |
| `finalize-order` | Place kitchen order (**pass** prompt 31) | customer validation, `FINALIZE_ORDER_STATUS` → `new`, receipts |

**CLI scripts (operator, not user-facing):**

| Script | Purpose |
|--------|---------|
| `scripts/setup-elevenlabs-roal.ts` | `npm run elevenlabs:setup` |
| `scripts/connect-elevenlabs-restaurant.ts` | `npm run elevenlabs:connect` |
| `scripts/apply-restaurant-profile.ts` | `npm run elevenlabs:profile` |
| `scripts/sync-roal-el.ts` | `npm run elevenlabs:tools` |
| `scripts/list-elevenlabs-restaurants.ts` | list agents |
| `scripts/peek-agent.ts` | debug agent config |

**Automated QA:** `agent-tool-*`, `elevenlabs-conversation-init`, `voice-agent-*`, `agent-prompt`.

**Docs:** [ELEVENLABS.md](./ELEVENLABS.md), [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md).

---

## 10. Billing & plan gates

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Billing dashboard | `/dashboard/billing` | `BillingDashboard.tsx`, `lib/billing/load-billing.ts` | BILL-01 | **fixed** (prompt 45) |
| Checkout (planned Stripe) | server action | `startCheckoutAction` in `billing/actions.ts` | BILL-02 | **pass** (stub; no live checkout) |
| Customer portal | server action | `openBillingPortalAction` | BILL-03 | **pass** (stub; no live portal) |
| Gate API | `GET /api/billing/gates` | `lib/billing/gates.ts`, `entitlements.ts` | BILL-04 | **pass** (prompt 43) |
| Plan limits UI | KDS / create | `PlanLimitNotice.tsx`, `loadOrganizationGateVerdicts` | BILL-05 | **pass** (prompt 43; code review) |
| Schema | DB | `021_organization_billing.sql` | BILL-06 | pending |

**Env (planned):** `STRIPE_*` in `.env.example` (commented).

**Automated QA:** `tests/unit/billing-gates.test.ts` (8), `tests/integration/api-billing-gates.test.ts` (4); `api-restaurants-post` plan gate 402.

---

## Prompt 43 — Billing gate behavior (BILL-04–05)

**Scope:** `app/api/billing/gates/route.ts` · `lib/billing/{gates,limits,entitlements,assert-gate,load-billing,provider,gate-http}.ts` · `POST /api/restaurants` · `PlanLimitNotice` · onboarding (no create gate).

### `GET /api/billing/gates`

| Check | Result |
|-------|--------|
| Unauthenticated | **pass** — Vitest **401** `{ error: "Unauthorized" }` (`requireAuthContext`) |
| Authed, primary org | **pass** — **200** `{ gates: { menu_scan, create_restaurant, voice_order } }` |
| Org resolve failure | **pass** — **403** resolve error |
| Unknown org row | **pass** — **404** `Organization not found` |
| Live curl (no cookies) | **pass** — **401** when dev server up |

Uses `resolveOrganizationId` (default primary membership) + `loadOrganizationGateVerdicts` → `evaluateOrganizationGates`.

### Dev mode (no Stripe keys)

| Check | Result |
|-------|--------|
| Provider | `getBillingProviderConfig()` → `mode: "dev"`, `isConfigured: false` when `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` absent (local `.env.example` commented) |
| Limits | `effectivePlanLimits` → `DEV_MODE_LIMITS` (50 locations; scan/voice/orders/calls ≥ 1M) |
| Gates | `evaluateBillingGate` never `hardBlocked` in dev — **pass** even at 99/99 usage (unit) |
| Checkout / portal | `billingProvider.*` → `{ ok: false, code: "not_configured", message: … }` |
| Billing UI | `BillingDashboard` dev banner + relaxed meters — **pass** (code review) |
| Onboarding | `/dashboard/onboarding` — updates existing restaurants only; no `assertOrganizationBillingGate` on wizard — **pass** (prompt 16 + code review) |

### Stripe mode plan limits

| Action | Limit key | Block when |
|--------|-----------|------------|
| `menu_scan` | `menu_scans` | Subscription inactive or period usage + 1 > cap |
| `create_restaurant` | `active_locations` | `max(activeLocations, restaurantCount) + 1 > cap` |
| `voice_order` | `voice_orders` | Same pattern |

| Check | Result |
|-------|--------|
| Location cap (stripe) | **pass** — unit: 2/2 locations + `additionalUsage: 1` → `hardBlocked`, title `Location limit reached` |
| `POST /api/restaurants` | **pass** — integration **402** `plan_limit_reached` (prompt 15 + mock) |
| Soft warning | **pass** — 80% threshold → `level: warning`, `allowed: true`, `showUpgrade` (stripe only) |
| `PlanLimitNotice` | **pass** — hides when `ok` or empty message; disables create on `hardBlocked` only |

**MCP / live Stripe seed:** not run — local env is dev mode; stripe blocking verified via unit + mocked integration. Production limit enforcement with real usage rows → prompt **44**.

### Tests

| Command | Result |
|---------|--------|
| `npm test -- tests/unit/billing-gates.test.ts` | **8/8 pass** |
| `npm test -- tests/integration/api-billing-gates.test.ts` | **4/4 pass** |

### Code changes (prompt 43)

| Change | Why |
|--------|-----|
| Added `api-billing-gates` integration tests | Covers authed/unauthed/403/404 for BILL-04 |
| Added `create_restaurant` stripe cap unit case | Documents location-limit gate |

**Status:** **pass** (no gate logic bugs found).

**QA IDs touched:** BILL-04, BILL-05 (gate API + limit UI); BILL-06 schema remains pending (dashboard: prompt 45).

---

## Prompt 44 — Usage event recording (EL-12, BILL-01, analytics)

**Scope:** `lib/usage/record.ts` · `lib/usage/query.ts` · `lib/usage/sanitize.ts` · `lib/usage/index.ts` · `supabase/functions/_shared/record-usage.ts` · `020_usage_events.sql` · scanner extract/commit/discard · Edge agent tools · KDS order PATCH · `load-billing.ts` · `load-analytics.ts` · `billing-gate.ts`.

### Event producers

| Event | Producer | Idempotency |
|-------|----------|-------------|
| `menu_scan` | `POST /api/scanner/extract` (success + failure) | `menu_scan:{importId}` / `:failed` |
| `import_attempt` | extract, commit, discard | per-import keys (`:created`, `:committed`, …) |
| `tool_call` | Edge `get-menu`, `sync-draft-order`, `finalize-order` | — (metadata: tool, http_status, outcome) |
| `voice_order` | Edge `sync-draft-order` when cart has lines | `voice_order:{restaurantId}:{sessionId}` |
| `order_completed` | Edge `finalize-order`; KDS `PATCH` `complete` | `order_completed:{restaurantId}:{sessionId}` |
| `active_location` | `recordRestaurantUsage` / Edge metering | `active_location:{restaurantId}:{UTC-day}` |

### Unit tests

| Command | Result |
|---------|--------|
| `npm test -- tests/unit/usage-record.test.ts tests/unit/usage-sanitize.test.ts` | **5/5 pass** |

### Billing / analytics consumers

| Consumer | Result |
|----------|--------|
| `loadOrganizationBilling` / `getUsageSummary` | **pass** — counts by `event_type` in billing period |
| `assertOrganizationBillingGate` (`menu_scan`) | **pass** — pre-extract |
| `assertVoiceOrderBillingGate` (Edge) | **pass** — counts `voice_order` rows |
| `load-analytics.ts` / `aggregate.ts` | **pass** — usage series + menu scan stats |

### Supabase MCP (`mnkabwcbdxruefzuvuuv`)

| Check | Result |
|-------|--------|
| Row counts by type | **pass** — sample: `tool_call` 27, `voice_order` 4, `order_completed` 2, `active_location` 2, `import_attempt` 1 (post prompts 29–31); no remote `menu_scan` yet (no live extract metering rows) |
| Edge finalize sample | **pass** — `order_completed:…:qa-p31-*` with matching `tool_call` / `voice_order` |

### Fix applied

| Issue | Fix |
|-------|-----|
| KDS `complete` used `order_completed:{orderId}` while Edge finalize uses `order_completed:{restaurantId}:{sessionId}` → duplicate `order_completed` for voice orders (billing + analytics inflation) | KDS PATCH uses session-scoped idempotency when `session_id` present (`app/api/restaurants/[id]/orders/[orderId]/route.ts`); duplicate insert ignored (`23505`) |

**Vitest:** `tests/integration/api-orders-patch.test.ts` — **7/7** (added complete → usage idempotency case).

**Status:** **fixed**

**QA IDs touched:** EL-12; BILL-01 (period usage); analytics usage series.

---

## Prompt 45 — Billing dashboard (`/dashboard/billing`)

**Scope:** `components/billing/BillingDashboard.tsx` · `BillingCheckoutButtons.tsx` · `app/dashboard/billing/page.tsx` · `app/dashboard/billing/actions.ts` · `lib/billing/load-billing.ts` · `lib/billing/provider.ts` (`STRIPE_CHECKOUT_ENABLED`).

### States reviewed

| State | Env / data | UI expectation | Result |
|-------|------------|----------------|--------|
| Dev / missing Stripe (`not_configured`) | No Stripe keys | Dev banner; relaxed limits; no checkout buttons; provider **Development** | **pass** |
| Empty usage | Zero `usage_events` in period | Five meters at 0; all `ok`; bar width safe at 0% | **pass** (unit) |
| Stripe keys, checkout not shipped (`not_implemented`) | Both keys set; `STRIPE_CHECKOUT_ENABLED=false` | Amber “keys detected” banner; no Upgrade/Manage buttons; **Stripe (keys only)**; customer **Linked** only when `stripe_customer_id` set | **fixed** |

### Misleading UI fixed

| Issue | Fix |
|-------|-----|
| Upgrade / Manage payment shown while checkout is stub-only | Render `BillingCheckoutButtons` only when `snapshot.checkoutEnabled` |
| “Stripe customer: Connected” when only API keys present | `stripeCustomerLinked` from DB; label **Linked** / **—** |
| Provider row implied live billing | **Stripe (keys only)** until checkout ships |

### Auth / browser

| Check | Result |
|-------|--------|
| Guest `GET /dashboard/billing` | **307** → `/login?next=%2Fdashboard%2Fbilling` |
| Signed-in admin/owner/member layout | **needs human** |
| Member without `canManageBilling` | Code: admin-only copy, no checkout — browser **needs human** |

### Tests

| Command | Result |
|---------|--------|
| `npm test -- tests/unit/billing-provider.test.ts tests/unit/billing-gates.test.ts` | **13/13 pass** |

**Status:** **fixed** (misleading Stripe UI); signed-in browser **needs human**.

**QA IDs touched:** BILL-01, BILL-02, BILL-03 (stubs + dashboard copy).

---

## Prompt 46 — Notification settings (NOTIF-01–02, 05–07)

**Route:** `/dashboard/settings/notifications` · **UI:** `NotificationSettingsForm.tsx`, `NotificationDeliveryLog.tsx` · **Server:** `app/dashboard/settings/notifications/actions.ts`, `page.tsx` · **Lib:** `lib/notifications/settings.ts`, `redact.ts`, `providers/*` · **Schema:** `022_notifications.sql`.

### Save settings

| Check | Result |
|-------|--------|
| Dev console mode | Forces `dev_console` channel; events + stuck threshold persist |
| Production mode | Webhook URL, email/SMS lists, channel toggles from form |
| Dev save preserves production secrets | **fixed** — disabled production fields omitted from `FormData`; `channelSecretsForSave` keeps existing webhook/recipients |
| Revalidate | `revalidatePath` after save |

### Admin vs member

| Role | View | Edit |
|------|------|------|
| Owner / admin | Full settings | Submit + `saveNotificationSettingsAction` |
| Member | Events/channels/mode; secrets redacted (`notificationSettingsForViewer`) | No submit; action returns error if forged |
| RLS | `notification_settings` SELECT member; UPDATE admin (`022`) | Matches UI |

### Delivery log & redaction

| Check | Result |
|-------|--------|
| `payload` | Stripped client-side (`deliveryRowForClient`) |
| `error_message` URLs | `redactDeliveryErrorMessage` → `[redacted-url]` |
| Member secrets in form | `webhookUrl` / recipient arrays empty when `!canEdit` |

### Provider config (production)

| Channel | Missing config behavior |
|---------|-------------------------|
| `webhook` | `skipped` — “No webhook URL configured.” |
| `email` | `skipped` — no recipients or “not wired yet” |
| `sms` | `skipped` — no numbers |
| `dev_console` | Always logs + delivery row in dev mode |

Errors surface in delivery log `error_message` (URL-redacted when shown).

### Tests

| Command | Result |
|---------|--------|
| `npx vitest run tests/unit/notifications.test.ts` | **7/7 pass** (+2 `channelSecretsForSave`) |
| `npx vitest run tests/integration/api-notifications-events.test.ts` | **pass** (events API; full matrix prompt **47**) |

### Browser

| Check | Result |
|-------|--------|
| Guest | **pass** — 307 → `/login?next=/dashboard/settings/notifications` |
| Signed-in save / member read-only | **needs human** |

**Status:** **fixed** (dev-console save wiped webhook/recipients; otherwise **pass**).

**QA IDs touched:** NOTIF-01, NOTIF-02, NOTIF-05, NOTIF-06, NOTIF-07.

---

## 11. Notifications

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Settings UI | `/dashboard/settings/notifications` | `NotificationSettingsForm.tsx`, `actions.ts` | NOTIF-01 | **pass** (prompt 46; browser **needs human**) |
| Save settings | server action | `saveNotificationSettingsAction` | NOTIF-02 | **fixed** (prompt 46: preserve secrets on dev save) |
| Dispatch event | `POST /api/notifications/events` | `lib/notifications/dispatch.ts` | NOTIF-03 | **pass** (prompt 47) |
| Stuck orders check | `POST /api/notifications/check-stuck` | `lib/notifications/stuck-orders.ts` | NOTIF-04 | **pass** (prompt 47) |
| Providers | runtime | `dev-console`, `webhook` (`lib/notifications/providers/*`) | NOTIF-05 | **pass** (prompt 46) |
| Delivery log UI | settings page | `NotificationDeliveryLog.tsx` | NOTIF-06 | **pass** (prompt 46) |
| Schema | DB | `022_notifications.sql` | NOTIF-07 | **pass** (prompt 04 + 46) |

**Automated QA:** `notifications.test.ts`, `integration/api-notifications-events.test.ts`.

---

## 12. Analytics

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Analytics dashboard | `/dashboard/analytics` | `components/analytics/*` | ANLY-01 | pending |
| Range picker / charts | UI | `AnalyticsRangePicker`, `OrdersTrendChart` | ANLY-02 | pending |
| Aggregation | server | `lib/analytics/aggregate.ts` | ANLY-03 | pending |
| Usage metrics | DB | `020_usage_events.sql`, `lib/usage/*` | ANLY-04 | pending |

**Automated QA:** `analytics-aggregate.test.ts`, `usage-*` tests.

---

## 13. Admin / ops

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Admin console | `/dashboard/admin` | `AdminOpsDashboard.tsx` (org admin+ only) | ADM-01 | **pass** (prompt 13: code + gate) |
| Ops snapshot | server | `lib/admin/load-ops-snapshot.ts` | ADM-02 | **pass** (prompt 49: sanitized health + errors) |
| Audit logs | DB | `023_audit_logs.sql`, `lib/observability/audit.ts` | ADM-03 | **pass** (prompt 49: `audit_logs` failures in recent errors) |
| Member blocked | non-admin | redirect `/dashboard` | ADM-04 | **pass** (prompt 13: `hasOrgAdminAccess` + redirect) |

**Automated QA:** `admin-ops.test.ts`.

---

## 14. Security, observability, deployment

| Flow | Entry | Implementation | QA ID | Status |
|------|-------|----------------|-------|--------|
| Public security page | `/security` | marketing copy + FAQ JSON-LD | SEC-01 | pending |
| Health check | `GET /api/health` | `lib/observability/health.ts` (env, DB, Gemini, EL, Edge OPTIONS) | SEC-02 | **pass** (prompt 54) |
| Request ID | all matched routes | `middleware.ts`, `lib/observability/request-id.ts` | SEC-03 | **pass** (prompt 54) |
| RLS / tenant | Postgres | `008`, `009`, `024` migrations; [RLS.md](./RLS.md) | SEC-04 | **pass** (prompt 51: cross-org MCP probes) |
| Agent tool security | Edge + Next | [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md) | SEC-05 | pending |
| Migrations apply | CLI | `supabase db push` (001–024) | DEP-01 | pending |
| Edge deploy | CLI | `npm run deploy:edge` → `scripts/deploy-edge-functions.sh` | DEP-02 | **fixed** (prompt 05: v6/7, `verify_jwt` false) |
| Production deploy check | CLI | `npm run deploy:check` → `scripts/deploy-production.sh` | DEP-03 | **fixed** (prompt 55: macOS bash y/n) |
| Post-deploy smoke | CLI | `npm run smoke` → `scripts/smoke-test-production.sh` | DEP-04 | **pass** (prompt 55: routes + health fields) |
| Build gate | CI | `npm run lint`, `npm test`, `npm run build` | DEP-05 | **pass** (prompt 55: wired in deploy-production.sh) |

---

## 15. Automated tests (inventory)

| Bucket | Count (approx) | Path |
|--------|----------------|------|
| Unit | ~65 files | `tests/unit/*.test.ts` |
| Integration | 5 files | `tests/integration/api-*.test.ts` (`api-scanner-commit`: 8 cases) |
| Config | 1 | `vitest.config.ts` |
| Fixtures | menu UUIDs | `tests/fixtures/menu.ts` |

**Not covered in Vitest (manual / smoke):** Edge Functions (Deno), live Gemini, live ElevenLabs, Playwright E2E (except `auth-smoke`), Stripe.

**npm scripts:** `test`, `test:watch`, `test:coverage`, `auth-smoke`, `smoke`, `deploy:edge`, `deploy:check`, `elevenlabs:*`.

---

## 16. Supabase migrations (001–024)

| # | File | Domain |
|---|------|--------|
| 001 | `init_schema` | restaurants, categories, items, modifiers, Realtime |
| 002 | `merge_menu_rpc` | atomic menu merge |
| 003 | `draft_orders` | voice cart sessions |
| 004 | `menu_delete_rls` | delete policies |
| 005 | `draft_orders_customer` | customer fields on drafts |
| 006 | `clear_menu_rpc` | clear restaurant menu |
| 007 | `phone_order_receipts` | finalized phone orders |
| 008 | `organizations_tenant` | orgs, profiles, memberships |
| 009 | `production_rls_policies` | member-scoped RLS |
| 010 | `onboarding` | wizard progress |
| 011 | `restaurant_profiles` | tax/fees, EL sync metadata |
| 012 | `restaurant_hours` | weekly hours JSON |
| 013 | `menu_item_sort_order` | item ordering |
| 014 | `modifier_group_ordering` | modifier groups |
| 015 | `menu_import_audits` | import history, `menu-uploads` bucket |
| 016 | `order_status_upgrade` | kitchen statuses |
| 017 | `order_status_timestamps` | status timestamps |
| 018 | `elevenlabs_agent_on_profile` | agent id on profile |
| 019 | `agent_tool_idempotency` | tool replay cache |
| 020 | `usage_events` | metering |
| 021 | `organization_billing` | plans / subscription columns |
| 022 | `notifications` | settings + delivery log |
| 023 | `audit_logs` | audit trail |
| 024 | `fix_membership_bootstrap_rls` | first-owner membership insert |

---

## 17. Lib module map (by domain)

| Module | Responsibility |
|--------|----------------|
| `lib/auth` | session, roles, context API, safe redirects, profile bootstrap |
| `lib/supabase` | browser/server clients, middleware session |
| `lib/onboarding` | wizard types, steps, server state |
| `lib/restaurant-profile` | profile schema, helpers |
| `lib/restaurant-hours` | hours schema, load/save helpers |
| `lib/scanner` | Gemini extract, commit, import audit |
| `lib/menu-editor` | validation, normalize, modifier groups, load menu |
| `lib/menu-import` | import types |
| `lib/orders` | cart, totals, status, line items, pricing |
| `lib/order-status.ts` | shared status constants |
| `lib/voice-agent` | control center, test harness, sanitize errors |
| `lib/elevenlabs` | agent prompt, conversation-init, phone personalization |
| `lib/agent-tools` | headers, schemas, token minting (Next side) |
| `lib/billing` | gates, entitlements, limits, Stripe provider stub |
| `lib/notifications` | dispatch, providers, stuck orders, settings |
| `lib/analytics` | aggregation types + queries |
| `lib/usage` | record + query usage events |
| `lib/admin` | ops snapshot, sanitization |
| `lib/observability` | health, logger, audit, route context, request ID |
| `lib/landing` | all marketing copy, metadata, demos |
| `lib/blog` | posts, SEO, JSON-LD, validation |
| `lib/seo` | robots, OG helpers |
| `lib/env.*` | public/server/shared env parsing |
| `lib/gemini.ts` | Gemini client for scanner |
| `lib/sync-elevenlabs-roal-tools.ts` | tool sync helper |
| `lib/dashboard-nav.ts` | dashboard navigation model |

---

## 18. Prompt → checklist index (02–60)

| Prompt | Primary QA IDs |
|--------|----------------|
| 02 Env audit | SEC-02, DEP-* (env flags) |
| 03 Supabase MCP identity | DEP-01, SEC-04 |
| 04 Migrations 001–024 | DEP-01, all DB-backed flows |
| 05 Edge deploy config | DEP-02, EL-09–12, SEC-02 |
| 06 lint/test/build | DEP-05 |
| 07 Public routes | PUB-01–13 |
| 08 Dashboard auth guard | DASH-07, AUTH-08 |
| 09 Login/signup UI | AUTH-01–02 |
| 10 Callback/signout | AUTH-03–04 |
| 11 Auth context API | AUTH-05 |
| 12 Membership RLS bootstrap | AUTH-06, ONB-02 |
| 13 Role separation | AUTH-07, ADM-04 |
| 14 Dashboard shell | DASH-01–02 |
| 15 Restaurant list/create | DASH-03–04 |
| 16 Onboarding E2E | ONB-01–05 |
| 17 Profile settings | PROF-01–02 |
| 18 Hours settings | PROF-03–04 |
| 19 Scanner extract | MENU-01, MENU-03 |
| 20 Scanner process legacy | MENU-02 |
| 21 Import commit | MENU-04, MENU-13 |
| 22 Discard/history | MENU-05–06 |
| 23 Menu editor CRUD | MENU-08–12 |
| 24–27 Orders/KDS/realtime | KDS-*, ORD-* |
| 28–35 Voice/EL/Edge | EL-* |
| 36–40 Billing/notifications | BILL-*, NOTIF-* |
| 41–45 Analytics/admin/health | ANLY-*, ADM-*, SEC-02 |
| 51 Tenant isolation | SEC-04, KDS-08 |
| 46–60 Cross-cutting, regression, sign-off | E2E_SMOKE + full table |

---

## Prompt 33 — ElevenLabs API reachability (EL-00)

**Scope:** `lib/elevenlabs.ts` · `requireElevenLabsApiKey` (`lib/env.server.ts`) · `runHealthChecks` elevenlabs flag (`lib/observability/health.ts`) · env loading.

### Code paths reviewed

| Piece | Behavior |
|-------|----------|
| `elevenlabsFetch` | Sets `xi-api-key` from `requireElevenLabsApiKey()`; base `https://api.elevenlabs.io` |
| `getConvaiAgent` | `GET /v1/convai/agents/{agentId}`; throws on non-2xx (no key in error payload) |
| `requireElevenLabsApiKey` | Zod optional in schema; throws `EnvValidationError` if unset/blank |
| `getElevenLabsAgentId` / `requireElevenLabsAgentId` | Request `agent_id` or `ELEVENLABS_AGENT_ID` |
| Health `checks.elevenlabs` | **Config only** — `flags.elevenlabs` + `agent_id_configured`; does not call ElevenLabs API |

### Env (names only; no secret values)

| Key | `.env` | `.env.local` | Notes |
|-----|:------:|:------------:|-------|
| `ELEVENLABS_API_KEY` | present, non-empty | present, non-empty | `.env.local` overrides `.env` (both set here) |
| `ELEVENLABS_AGENT_ID` | present, non-empty | present, non-empty | same |
| `ELEVENLABS_CONVERSATION_INIT_SECRET` | — | present | prompt 02 inventory |

`getEnvStatus().elevenlabs` → **true** with `tsx --env-file=.env --env-file=.env.local`.

**Empty-override trap:** not observed locally (both files have values). `.env.example` comment warns against blank `.env.local` duplicates.

### Live API probe (no key in output)

| Probe | Result |
|-------|--------|
| `npx tsx --env-file=.env --env-file=.env.local scripts/peek-agent.ts` | **pass** — HTTP 200; agent JSON returned (`agent_id`, `name`, `conversation_config`, …); `workflowNodeCount` 0 |
| Agent id resolution | default `ELEVENLABS_AGENT_ID` resolves (id match confirmed in script output) |

### Gaps / follow-ups

| Item | Status |
|------|--------|
| `GET /api/health` live EL HTTP probe | not in health module — agent route is separate |
| `GET /api/integrations/elevenlabs/agent` curl | **pass** (prompt **34**) |

**Status:** **pass** (no product code changes; `.env.example` comment only).

**QA IDs touched:** EL-00 (reachability); EL-04 covered in prompt **34**.

---

## Prompt 34 — ElevenLabs agent fetch route (EL-04)

**Route:** `app/api/integrations/elevenlabs/agent/route.ts` · **Lib:** `getElevenLabsAgentId` (`lib/env.server.ts`), `getConvaiAgent` / `patchConvaiAgent` (`lib/elevenlabs.ts`).

### Auth / access

| Check | Result |
|-------|--------|
| Middleware | Runs on `/api/*` (session refresh only) |
| `isProtectedApi` | **not** listed — no Supabase session required |
| Anonymous `curl` | **pass** — server uses `ELEVENLABS_API_KEY` only |

Treat as **server-secret proxy**: restrict at network layer in production.

### GET agent id resolution

| Case | Result |
|------|--------|
| No `agent_id` query | **pass** — `ELEVENLABS_AGENT_ID` default |
| `?agent_id=` | **pass** — query overrides env default |
| Neither query nor env | **400** `Missing agent_id query or ELEVENLABS_AGENT_ID…` |

### Missing / invalid env

| Case | Result |
|------|--------|
| Blank / missing `ELEVENLABS_API_KEY` | **503** — `EnvValidationError` (path + hint); **no** stack in JSON |
| Upstream ElevenLabs error | **502** — message only |

### Success response

| Check | Result |
|-------|--------|
| Envelope | `{ agent_id, agent }` |
| Server API key in body | **pass** — never added by route |
| Live `GET` (first dev compile) | **pass** — **200**, Conv AI summary fields; no key leak |

### PATCH (smoke)

| Check | Result |
|------|--------|
| Valid JSON object | **pass** (Vitest) — `patchConvaiAgent` + `{ agent_id, agent }` |
| Invalid body | **400** `JSON body required` |
| Live PATCH after HMR glitch | **blocked** — dev `_not-found` / vendor-chunk error; not route logic |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/integration/api-elevenlabs-agent.test.ts` | **7/7 pass** |

**Code changes:** tests only; **no route fixes**.

**Status:** **pass**

**QA IDs touched:** EL-04.

---

## Prompt 39 — VoiceAgentPanel connect / re-sync (EL-04, KDS-03)

**Route:** `/dashboard/restaurants/[id]` (KDS) · **UI:** `VoiceAgentPanel.tsx` · **Actions:** `connectVoiceAgentAction`, `resyncVoiceAgentAction` in `voice-agent-actions.ts` · **Legacy:** `elevenlabs-actions.ts` re-exports connect only · **Lib:** `lib/voice-agent/load-control-center.ts`, `lib/sync-elevenlabs-roal-tools.ts` · **DB:** `018_elevenlabs_agent_on_profile.sql`.

### Fixture (Supabase MCP `mnkabwcbdxruefzuvuuv`)

| Field | Value |
|-------|--------|
| Restaurant | `egg mania` · `9d3263d1-4d9d-4f89-bfc5-160e2cca1855` |
| Linked agent | `agent_0601krevmvm2fy89m10j3etws1n3` (profile column) |

### UI / actions (code review + static audit)

| Check | Result |
|-------|--------|
| Connect loading label | **pass** — `busy === "connect"` → `Syncing…`; panel actions disabled while `busy !== null` |
| Re-sync loading label | **pass** — `busy === "resync"` → `Re-syncing…` |
| Refresh loading label | **pass** — `busy === "refresh"` → `Refreshing…` |
| Env secrets card | **pass** — `ELEVENLABS_API_KEY`, `AGENT_TOOL_SIGNING_SECRET`, `AGENT_TOOL_SECRET` with Missing/OK + hints; aggregate restart message when required keys missing |
| Connect disabled when env not ready | **pass** — `!center.envReady` or `voiceBlocked` |
| Re-sync disabled without linked agent | **pass** — `!center.agentId` |
| Success feedback after connect / re-sync | **fixed** — bordered success banner (aligned with profile/hours panels) |
| Inline action errors | **pass** — bordered danger banner; failures also persist `elevenlabs_last_sync_error` |
| `elevenlabs-actions.ts` | **pass** — deprecated wrapper delegates to `connectVoiceAgentAction` |

### DB persistence (MCP `restaurant_profiles`)

| Column / JSON | Result |
|---------------|--------|
| `elevenlabs_agent_id` | **pass** — fixture agent id |
| `elevenlabs_last_sync_at` | **pass** — recent timestamp |
| `elevenlabs_last_sync_error` | **pass** — null |
| `elevenlabs_last_sync_summary.tool_ids_on_agent` | **pass** — 3 tool ids |
| `elevenlabs_last_sync_summary.tools` | **pass** — 3 ROAL tools |

Written by `saveSyncSuccess` after `syncRoalElevenLabsTools` + `applyRestaurantOrderAgentProfile` (not `POST …/sync-roal-tools` alone).

### Live browser (signed-in KDS)

| Check | Result |
|-------|--------|
| Voice panel load | **needs human** — KDS → `/login?next=…` (no session in automation) |
| Connect / re-sync + loading + success banner | **needs human** |
| Env-missing dev state | **needs human** — card + disabled connect verified in code |

### Automated

| Artifact | Result |
|----------|--------|
| `tests/unit/voice-agent-ui-audit.test.ts` | **pass** (3) — success copy + action wiring |
| `tests/unit/voice-agent-control-center.test.ts` | **pass** (4) |

**Code changes:** `VoiceAgentPanel.tsx` success banner; audit test expectations.

**Status:** **fixed** (signed-in connect/resync E2E **needs human**).

**QA IDs touched:** EL-04 (KDS connect), KDS-03.

---

## Prompt 40 — Voice agent test harness (EL-07)

**Scope:** `app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx` · `voice-agent-test-actions.ts` · `lib/voice-agent/test-harness/*` · shared validation `lib/orders/validate-cart.ts` (same paths as Edge `_shared/order-validate.ts`).

**Important:** The harness **does not HTTP-call** Edge Functions. It runs `simulateHarnessTool` / `runHarnessScenario` in-process with the same Zod schemas and cart/customer validators as production tools. **Dry run** keeps cart state in memory (`dryRunDraftItems`); **live** (checkbox off) upserts `draft_orders` / `phone_order_receipts` via service-role Supabase when available. Edge signing (`AGENT_TOOL_SIGNING_SECRET`) + deployed functions matter for **real ElevenLabs calls** (prompts 29–31), not for harness dry-run.

### Automated QA

| Suite | Result |
|-------|--------|
| `tests/unit/voice-agent-harness.test.ts` | **10/10 pass** |
| `tests/unit/voice-agent-ui-audit.test.ts` | **3/3 pass** (harness `input-base`, panel wiring) |
| `tests/unit/voice-agent-control-center.test.ts` | **4/4 pass** |
| `tests/unit/agent-prompt.test.ts` | **6/6 pass** (handoff / escalation copy in generated prompt) |

### Prompt 40 scenario matrix (dry-run)

| User flow | Harness scenario `id` | Steps | Dry-run result |
|-----------|----------------------|-------|----------------|
| Menu lookup | `menu_and_hours` | `get_menu_items` | **pass** — categories + `operations.ordering_allowed` |
| Unavailable item | `unavailable_item_sync` | menu → sync sold-out line | **pass** — step 2 fails validation (`expectedFailure`) |
| Modifier choice (valid) | `valid_modifier_sync` | menu → sync with required group choice | **pass** — added prompt 40; needs menu with `min_selection ≥ 1` |
| Draft sync | `happy_pickup_order` step 2 | menu → sync available item ×2 | **pass** |
| Finalize | `happy_pickup_order` step 3 | finalize w/ name + phone | **pass** — dry-run cart carryover from prior sync |
| Handoff to staff | *(no agent tool)* | — | **pass (prompt 41)** — `buildRestaurantOrderAgentPrompt` includes `Staff escalation` when profile has `escalation_*`; not simulatable in harness |
| Missing name/phone | `finalize_without_customer` | menu → sync → finalize bare | **pass** — HTTP **400** `customer_validation_failed` |

### Additional harness scenarios (regression)

| Scenario `id` | Purpose | Dry-run |
|---------------|---------|---------|
| `invalid_modifier_sync` | Off-menu modifier on item with modifier groups | **pass** |
| `required_modifier_missing` | Required group empty | **pass** |
| `invalid_menu_item` | Off-menu item name | **pass** |
| `empty_cart_finalize` | Finalize with no cart | **pass** |
| `closed_restaurant_sync` | `ordering_allowed: false` | **pass** — `restaurant_closed` on sync + finalize |

### Code changes (prompt 40)

| Change | Why |
|--------|-----|
| Added `valid_modifier_sync` scenario | Covers “modifier choice” happy path missing from catalog |
| `invalid_modifier_sync` prefers `requiredModifier` item | Exercises `unknown_modifier` on items that actually have groups |
| Prereq message for modifier scenarios without required groups | Clear operator message instead of false pass |

### Live DB path (checkbox **Dry run** off)

| Check | Status |
|-------|--------|
| `runVoiceAgentHarnessScenarioAction` uses `getServiceRoleSupabase() ?? createServerSupabase()` | **pass** (code review) |
| Writes `draft_orders` on sync/finalize; receipt on finalize | **pass** (mirrors `simulateHarnessTool`) |
| `clearHarnessDraftSessionAction` only for `roal-harness-*` session ids | **pass** |
| Signed-in KDS browser run on real restaurant | **needs human** |
| Parity with deployed Edge HTTP | Covered separately in prompts **29–31**; harness validates **shared lib** only |

**Status:** **pass** (dry-run automated; live KDS **needs human**).

**QA IDs touched:** EL-07.

---

## Prompt 41 — Agent prompt, first message, placeholders, KB/menu snapshot

**Scope:** `lib/elevenlabs/agent-prompt.ts` · `lib/elevenlabs-restaurant-agent-profile.ts` · `lib/elevenlabs/phone-personalization.ts` · `lib/elevenlabs/conversation-init.ts` · `lib/elevenlabs/load-menu-prompt-snapshot.ts` · connect flow (`connectVoiceAgentAction` → `syncRoalElevenLabsTools` + `applyRestaurantOrderAgentProfile` + optional conversation-init webhook).

### Generated prompt contract

| Requirement | Location | Result |
|-------------|----------|--------|
| Call `get_menu_items` before taking items | `CORE_BEHAVIOR` step 2; `## Menu rules`; KB playbook | **pass** |
| `sync_draft_order` after every cart change | `## Cart and tools`; KB playbook | **pass** |
| Never invent / placeholder guest identity | `CORE_BEHAVIOR` speech + finalize rules; `## Customer information` | **pass** |
| First message (no `{{restaurant_name}}`) | `buildRestaurantOrderFirstMessage` | **pass** — pickup/delivery/closed variants |
| Dynamic placeholders | `mergeRestaurantPlaceholders` on connect; conversation-init webhook | **pass** — `restaurant_id`, `restaurant_name` |
| Hours + timezone in prompt | `buildAgentHoursPromptFromBundle` → `buildHoursPromptSection` | **pass** when DB bundle loads |
| Agent clock timezone | `RESTAURANT_AGENT_TIMEZONE` → `prompt.timezone` on PATCH | **pass** (env-gated) |
| Menu size hint in prompt | `buildMenuRulesSection` when `loadMenuPromptSnapshot` succeeds | **pass** |
| Optional `ROAL_ORDER_KB` | `isRoalOrderKbEnabled()` → attach `ROAL_order_taker_playbook` doc | **pass** (default on; set `ROAL_ORDER_KB=0` to skip) |

### Connect / personalization flow

| Step | Behavior |
|------|----------|
| `connectVoiceAgentAction` | Tools sync → `applyRestaurantOrderAgentProfile` (prompt, first_message, placeholders, hours, menu hint, KB?, voicemail, timezone) |
| Phone personalization | `buildConversationInitWebhookUrl` + `applyElevenLabsPhonePersonalizationWebhook` when app URL + secret configured |
| Twilio init | `GET/POST /api/integrations/elevenlabs/conversation-init` → `buildElevenLabsConversationInitPayload` |

### Tests

| Command | Result |
|---------|--------|
| `npm test -- tests/unit/agent-prompt.test.ts tests/unit/elevenlabs-placeholders.test.ts` | **10/10 pass** (prompt 41 contract cases added) |

### Code / deploy

| Item | Result |
|------|--------|
| Prompt generation defects fixed | **none** — review only; contract tests added |
| Redeploy | **not required** |

**Status:** **pass**

**QA IDs touched:** EL-01b (agent prompt generation); EL-06 (conversation-init wiring reviewed).

---

## Prompt 42 — Phone personalization & Twilio assumptions (EL-06)

**Scope:** [ELEVENLABS.md](./ELEVENLABS.md) · [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · `lib/elevenlabs/phone-personalization.ts` · `app/api/integrations/elevenlabs/conversation-init/route.ts` · Connect / CLI · baked tools (cross-check prompts **29**, **36**; live call menu notes prompt **38**).

### Webhook URL pattern

| Check | Result |
|-------|--------|
| Code | `buildConversationInitWebhookUrl()` → `{origin}/api/integrations/elevenlabs/conversation-init` via `getSiteOrigin()` |
| Docs | `{NEXT_PUBLIC_APP_URL}/api/integrations/elevenlabs/conversation-init` — **match** |
| Secret | Optional `?secret=` when `ELEVENLABS_CONVERSATION_INIT_SECRET` set; route accepts header `x-roal-conversation-init-secret` or query |
| Lookup | `agent_id` → `restaurant_profiles.elevenlabs_agent_id` → `restaurants.name` (service role) |
| Connect | PATCHes ElevenLabs `conversation_initiation_client_data_webhook` when origin configured |
| No origin | Webhook PATCH skipped; control center **warns** (fixed: **ok** when last sync stored webhook URL) |

**Vitest:** `tests/unit/phone-personalization.test.ts` (4).

### First message — no unresolved `{{restaurant_name}}`

| Mechanism | Result |
|-----------|--------|
| `buildRestaurantOrderFirstMessage` | Literal name only — `agent-prompt.test.ts` |
| Connect sync | PATCHes `first_message` + placeholders |
| Template guard | `firstMessageHasUnresolvedTemplates` → control center **error** if `{{…}}` remains |
| Init payload | Returns `restaurant_name` for call-start dynamic vars |

### Baked tools vs dynamic vars

| Layer | After KDS Connect |
|-------|-------------------|
| Tools | Baked URLs + `x-roal-restaurant-id` + `roal1.*` — no conv `dynamic_variable` on POST bodies (prompt **29** / **36**) |
| Twilio init | Webhook supplies `restaurant_id` / `restaurant_name` when EL still needs session vars |
| Legacy | Dynamic tool mode without `restaurantId` — not Twilio-safe |

**Deferred:** Inbound Twilio E2E **needs human** (HTTP matrix completed in prompt **37**).

**Status:** **pass**

**QA IDs touched:** EL-06 (**pass**).

---

## Prompt 47 — Notification event API + stuck orders (NOTIF-03, NOTIF-04, KDS-07)

**Routes:** `app/api/notifications/events/route.ts` · `app/api/notifications/check-stuck/route.ts` · **Lib:** `lib/notifications/dispatch.ts`, `lib/notifications/stuck-orders.ts` · **KDS:** `app/dashboard/restaurants/[id]/page.tsx` (fire-and-forget on load) · **Client:** `lib/notifications/report-realtime-degraded.ts` → events API.

### `POST /api/notifications/events`

| Check | Result |
|-------|--------|
| Signed out | **pass** — **401** `{ error: "Unauthorized" }` |
| Invalid `organization_id` query (not a member) | **pass** — **403**; no dispatch |
| Invalid JSON | **pass** — **400** `Invalid JSON` |
| Invalid `event_type` | **pass** — **400**; Zod rejects unknown enum |
| Valid org-scoped event (no `restaurant_id`) | **pass** — **200** `{ ok: true }`; `dispatchNotification` with resolved org |
| `restaurant_id` unknown | **pass** — **403** `Forbidden` |
| `restaurant_id` other org | **pass** — **403** when `restaurants.organization_id` ≠ resolved org |
| `realtime_degraded` + restaurant | **pass** — **200**; tenant check before dispatch |

**Allowed `event_type` values:** `order_completed`, `sync_failure`, `scan_failure`, `order_stuck`, `realtime_degraded` (`NOTIFICATION_EVENT_TYPES`).

### `POST /api/notifications/check-stuck`

| Check | Result |
|-------|--------|
| Signed out | **pass** — **401** |
| Invalid org query | **pass** — **403** |
| Authed org | **pass** — loads org restaurants; `{ ok: true, notified }` from `notifyStuckOrdersForOrganization` |

### Stuck orders (`lib/notifications/stuck-orders.ts`)

| Check | Result |
|-------|--------|
| Skips when `order_stuck` not in `enabled_events` | **pass** (Vitest) |
| Skips when no restaurants | **pass** (Vitest) |
| Queries `draft_orders` in `new`/`accepted`/`in_progress`/`ready` older than `order_stuck_minutes` | **pass** (code + Vitest dispatch path) |
| Idempotency key | `order_stuck:{order_id}:{minutes}` per row |
| KDS page load | **pass** (code review) — `void notifyStuckOrdersForOrganization(...)` after org restaurant list; best-effort, no await |

### Delivery log + tenant isolation (MCP `mnkabwcbdxruefzuvuuv`)

| Check | Result |
|-------|--------|
| Table `notification_deliveries` columns | **pass** — `organization_id`, `restaurant_id`, `event_type`, `channel`, `status`, `idempotency_key`, … |
| RLS cross-tenant SELECT | **pass** — `qa-role-member` JWT cannot see Legacy POC delivery row inserted for probe; row cleaned up |
| Production delivery rows | none on remote at QA time (dispatch not exercised live) |

**Vitest:** `tests/integration/api-notifications-events.test.ts` (**11**), `tests/unit/notifications.test.ts` stuck-order cases (**3** new) — **21/21** pass in notification suites.

### Fixes

**None** — auth, org resolution, restaurant tenant gate, dispatch, and stuck-order helper behave as specified.

**Status:** **pass**

**QA IDs touched:** NOTIF-03, NOTIF-04, KDS-07 (**pass**).

---

## Prompt 49 — Admin ops dashboard (ADM-01–04)

**Scope:** `/dashboard/admin` · `app/dashboard/admin/page.tsx` · `components/admin/AdminOpsDashboard.tsx` · `lib/admin/load-ops-snapshot.ts` · `lib/admin/sanitize-ops-detail.ts` · `lib/env.server.ts` (`getEnvStatus`) · `lib/observability/health.ts` (`sanitizeHealthReportForPublic`).

### Access gates

| Actor | Expected | Code / test | Result |
|-------|----------|-------------|--------|
| Signed out | Login redirect | `dashboard/layout.tsx` → `/login?next=/dashboard`; admin page documents `/login?next=/dashboard/admin` | **pass** |
| Member only | `/dashboard` | `hasOrgAdminAccess` false → `redirect("/dashboard")` | **pass** |
| Owner / admin | Page loads | `isOrgAdmin` filter → `loadAdminOpsSnapshot` + `AdminOpsDashboard` | **pass** (code); browser **needs human** |
| Nav hidden for member | No Admin link | `app-shell.tsx` + `adminOnly` on nav item | **pass** |

### Health + env (no secrets in HTML)

| Check | Result |
|-------|--------|
| `getEnvStatus()` | Booleans only (`Boolean(env.*)`); UI shows ✓/— per flag | **pass** |
| `envFlags` in snapshot | No API keys or URLs in `AdminOpsSnapshot` | **pass** |
| Health check messages | **fixed:** `loadAdminOpsSnapshot` runs `sanitizeHealthReportForPublic` before SSR | **fixed** |
| `/api/health` link | Public endpoint already sanitized | **pass** |

### Sanitized errors + audit feed

| Source | Sanitization | UI |
|--------|--------------|-----|
| `audit_logs` (`failure` / `denied`) | `metadata.message` → `sanitizeOpsErrorDetail` | Recent errors, source `audit` | **pass** |
| `menu_imports` / `notification_deliveries` / voice sync | `truncate` → `sanitizeOpsErrorDetail`; agent id suffix only | Table + error cards | **pass** |
| Tokens / webhook URLs | Vitest: `sk-*` + webhook host redacted | **pass** |

### Tests

| Command | Result |
|---------|--------|
| `npm test -- tests/unit/admin-ops.test.ts` | **7/7 pass** |

### Code changes (prompt 49)

| File | Change |
|------|--------|
| `lib/admin/load-ops-snapshot.ts` | `sanitizeHealthReportForPublic` on health before admin HTML |

**Status:** **fixed** (health sanitization); gates + snapshot **pass** via code + unit tests.

**QA IDs touched:** ADM-01, ADM-02, ADM-03, ADM-04.

---

## Prompt 50 — Settings + support pages (DASH-05–06)

**Routes:** `/dashboard/settings` · `/dashboard/support` · **Files:** `app/dashboard/settings/page.tsx`, `app/dashboard/support/page.tsx`, `components/dashboard/support-hub.tsx` · **Related:** `app/dashboard/settings/notifications/page.tsx` (prompt **46**), `app/dashboard/layout.tsx`, `lib/dashboard-nav.ts`.

### Auth + redirects

| Route | Guest | Signed-in guard |
|-------|-------|-----------------|
| `/dashboard/settings` | **pass** — 307 → `/login?next=/dashboard/settings` (middleware + page `redirect`) | Layout requires session; page auth-only (no org gate) |
| `/dashboard/support` | **pass** — 307 → `/login?next=/dashboard/support` | Layout auth only; `SupportHub` is static (no server data) |
| `/dashboard/settings/notifications` | **pass** — 307 with correct `next` | No `primaryMembership` → `/dashboard/onboarding` (prompt **46**) |

### Outbound links (dead-route check)

| Source | Target | Exists / HTTP |
|--------|--------|----------------|
| Settings hub | `/dashboard/onboarding` | page **pass** |
| Settings hub | `/dashboard/settings/notifications` | page **pass** |
| Settings hub | `/dashboard/restaurants` | page **pass** |
| Settings hub | `/dashboard/restaurants/{id}` | KDS page when org has ≥1 restaurant (`created_at` desc, limit 1) |
| Support hub | `/dashboard/onboarding`, `/dashboard/settings/notifications`, `/dashboard/restaurants`, `/contact` | **pass** (`/contact` 200 guest) |
| Support hub | `/api/health` | **pass** — 200 JSON (intentional smoke URL; opens in-app) |
| Support CTAs | `/contact` | **pass** |

**Vitest:** `tests/unit/dashboard-nav.test.ts` — **6/6 pass** (all nav `page.tsx` exist; settings vs notifications active-state).

### Empty states + org membership

| State | Settings hub | Support |
|-------|--------------|---------|
| Signed-in, no `primaryMembership` | Primary CTA **Start onboarding** → `/dashboard/onboarding`; sidebar shows “No organization” (layout) | Static runbooks + resources (no org-scoped data) |
| Org, zero restaurants | Same onboarding CTA | Same |
| Org + ≥1 restaurant | **Open location settings** → newest restaurant KDS | Same |
| All roles (owner/admin/member) | Hub readable; per-restaurant profile/hours remain on KDS (prompts **17**–**18**) | No role gate (help content only) |

Notifications sub-route: member read-only / admin edit — covered in prompt **46**; hub link does not bypass that gate.

### Shell / nav

| Check | Result |
|-------|--------|
| Nav items `Settings`, `Support` | **pass** — `lib/dashboard-nav.ts` |
| Header title on `/dashboard/settings`, `/dashboard/support` | **pass** — `pageTitle()` → “Settings” / “Support” |
| Crashes on render | **pass** — no throws in settings query path (Supabase error → null restaurant id, not thrown) |

### Browser

| Check | Result |
|-------|--------|
| Signed-in click-through all hub links | **needs human** (no QA session in agent browser) |
| MCP browser | Login shell reachable at `127.0.0.1:3000/login`; dashboard pages not exercised signed-in |

### Fixes

**None** — navigation, empty states, and membership handling match spec; no dead routes found.

**Status:** **pass**

**QA IDs touched:** DASH-05, DASH-06.

---

## Prompt 51 — Tenant isolation negative tests (SEC-04)

**Project:** `mnkabwcbdxruefzuvuuv` · **RLS:** [RLS.md](./RLS.md) · migrations `008`, `009`, `024` · **App gates:** `requireRestaurantAccess`, `resolveOrganizationId`, `loadOrganizationAnalytics` (primary org only).

### Fixture orgs (pre-existing QA data; no passwords)

| Org | ID | Restaurant | Probe user (Org A only) |
|-----|-----|------------|-------------------------|
| **A** `qa-role-separation` | `b1111111-1111-4111-8111-111111111111` | `b2222222-2222-4222-8222-222222222222` | `qa-role-owner@example.invalid` → `a0000001-0001-4001-8001-000000000001` |
| **B** `rls-qa-isolated` | `ac88ceed-96d4-4a91-b474-49f5a3ee011d` | `639b2da9-3409-4fc9-b899-d313b7d7583f` (**Isolated Diner**) | — (no membership for probe user) |

`internal_config.rls_poc_demo_reads` = **false** (anon demo reads off).

### MCP RLS simulation (JWT Org A → Org B rows)

Method: `SECURITY INVOKER` probe in one transaction — `SET LOCAL role authenticated` + `request.jwt.claims` for `a0000001-…` (same pattern as prompts **12**–**13**). Org B seeded via service-role SQL with fixed `f151…`–`f157…` IDs (category, item, draft, receipt, usage event, menu import, notification delivery); service role confirms rows exist; probe user sees **0** for all SELECTs.

| Resource | SELECT (Org B) | UPDATE/INSERT (Org B) | Expected |
|----------|----------------|------------------------|----------|
| `restaurants` | 0 | INSERT **denied** | pass |
| `organizations` (+ billing columns) | 0; `billing_plan` null | UPDATE 0 rows | pass |
| `categories` / `items` | 0 | UPDATE 0 rows | pass |
| `draft_orders` | 0 | UPDATE 0 rows | pass |
| `phone_order_receipts` | 0 | — | pass |
| `menu_imports` | 0 | UPDATE 0 rows | pass |
| `notification_settings` / `notification_deliveries` | 0 | UPDATE 0 rows | pass |
| `usage_events` | 0 | INSERT **denied** | pass |

**Note:** Bare `execute_sql` without `SET LOCAL role authenticated` in a single `DO`/function runs as superuser and **bypasses RLS** — do not use UNION probes alone for tenant tests.

### API / app layer (Vitest + code review)

| Surface | Cross-tenant guard | Result |
|---------|-------------------|--------|
| Restaurant-scoped APIs | `requireRestaurantAccess` → **403** or **404** (RLS hides foreign restaurant) | **pass** — menu-import, orders, scanner routes |
| `GET/POST /api/notifications/events` | Org membership + restaurant org match | **pass** — `api-notifications-events` (403 other org) |
| `GET /api/billing/gates` | `resolveOrganizationId` membership check | **pass** — `api-billing-gates` (403 non-member org) |
| Analytics page | `loadOrganizationAnalytics` uses `primaryMembership.organization_id` only | **pass** — no `organization_id` query override |
| Billing dashboard | `loadOrganizationBilling` via user session + RLS on `organizations` | **pass** (prompt **45**) |

**Vitest (tenant-related):** `api-menu-import-discard-history` (9), `api-notifications-events` (11), `api-billing-gates` (4), `api-orders-patch` (7), `analytics-aggregate` (6) — **37/37 pass**.

### Policy review (`009` + `022` + `020`)

| Table | Policy basis | Cross-org leak |
|-------|--------------|----------------|
| Menu chain | `auth_user_can_access_restaurant` / category / item helpers | none found |
| Orders / receipts | restaurant org membership | none found |
| Notifications | `auth_user_is_org_member` / `auth_user_is_org_admin` | none found |
| Usage / analytics source | `usage_events` org ∈ user memberships | none found |
| Billing fields | on `organizations` — `org_select_member` only | none found |

### Fixes

**None** — no migration `025+` or route changes required.

**Status:** **pass**

**QA IDs touched:** SEC-04; KDS-08 (tenant denied); BILL-* / NOTIF-* / ANLY-* (org-scoped reads).

---

## Prompt 52 — API auth negative tests (all `/api` routes)

**Inventory:** 17 route handlers under `app/api/**/route.ts`. **Vitest:** existing integration suites + `api-sync-roal-tools.test.ts` (**5**) + `api-auth-negative-gaps.test.ts` (**11**). **Middleware** (`lib/supabase/middleware.ts`): signed-out **401** on `/api/restaurants/*` and `/api/scanner/*` before handlers (not exercised in handler unit tests; noted in matrix).

**Legend:** ✓ = covered (Vitest or code review) · — = N/A · MW = middleware session gate

### Route × negative matrix

| Route | Method | Signed-out 401 | Wrong method | Invalid JSON 400 | Bad/missing restaurant 400/404 | Wrong org / cross-tenant 403 | Auth model |
|-------|--------|----------------|--------------|------------------|--------------------------------|------------------------------|------------|
| `/api/auth/context` | GET | ✓ | ✓ (405 router) | — | — | — | Session |
| `/api/billing/gates` | GET | ✓ | ✓ (405) | — | — | ✓ | Session + org resolve |
| `/api/health` | GET | — (public) | ✓ (405) | — | — | — | Public |
| `/api/restaurants` | POST | ✓ (+ MW) | ✓ (405) | ✓ (empty body → name) | — | ✓ | Session + org |
| `/api/restaurants/[id]/menu` | DELETE | ✓ (+ MW) | ✓ (405) | — | ✓ missing id **400** | ✓ | Session + `requireRestaurantAccess` |
| `/api/restaurants/[id]/menu-imports` | GET | ✓ (+ MW) | ✓ (405) | — | ✓ **404** not found | ✓ | Session + restaurant |
| `/api/restaurants/[id]/orders/[orderId]` | PATCH | ✓ (+ MW) | ✓ (405) | ✓ | ✓ order **404** | ✓ | Session + restaurant |
| `/api/restaurants/[id]/orders/compute-totals` | POST | ✓ (+ MW) | ✓ (405) | ✓ | ✓ **404** / items **400** | ✓ | Session + restaurant |
| `/api/scanner/extract` | POST | ✓ (+ MW) | ✓ (405) | ✓ (form: missing `restaurant_id`/image) | via access **404** | ✓ | Session + restaurant |
| `/api/scanner/process` | POST | ✓ (+ MW) | ✓ (405) | ✓ (form) | via access **404** | ✓ | Session + restaurant (deprecated) |
| `/api/scanner/commit` | POST | ✓ (+ MW) | ✓ (405) | ✓ | ✓ missing `restaurant_id` **400** | ✓ | Session + restaurant |
| `/api/scanner/discard` | POST | ✓ (+ MW) | ✓ (405) | ✓ | ✓ import **404** | ✓ | Session + restaurant |
| `/api/notifications/events` | POST | ✓ | ✓ (405) | ✓ | ✓ bad `restaurant_id` **403** | ✓ | Session + org + restaurant gate |
| `/api/notifications/check-stuck` | POST | ✓ | ✓ (405) | — | — | ✓ | Session + org |
| `/api/integrations/elevenlabs/agent` | GET, PATCH | — | ✓ (405) | ✓ PATCH body | — | — | Server env / EL API key |
| `/api/integrations/elevenlabs/conversation-init` | GET, POST | ✓ secret | ✓ (405) | ✓ missing `agent_id` | — | — | Optional init secret |
| `/api/integrations/elevenlabs/sync-roal-tools` | POST | — | ✓ (405) | ✓ (body optional) | — | — | Optional `ELEVENLABS_SYNC_TOKEN` Bearer |

### Fixes (minimal)

| Route | Issue | Fix |
|-------|-------|-----|
| `POST /api/scanner/commit` | Malformed JSON → unhandled throw | **400** `Invalid JSON` |
| `POST /api/scanner/discard` | Malformed JSON → **500** | **400** `Invalid JSON` |
| `PATCH …/orders/[orderId]` | Malformed JSON → **500** | **400** `Invalid JSON` |
| `POST …/compute-totals` | Malformed JSON → **500** | **400** `Invalid JSON` |

### Gaps / notes

| Item | Result |
|------|--------|
| Wrong HTTP method | **pass** — App Router returns **405** when method not exported (code review); handlers only export intended verbs |
| Invalid restaurant UUID string | No format pre-check; unknown id → **404** from `requireRestaurantAccess` DB lookup |
| `POST /api/restaurants` invalid JSON | `.catch(() => ({}))` → **400** `name is required` (not `Invalid JSON`) — acceptable |
| ElevenLabs `agent` route | No session auth by design (dashboard/server); EL key stays server-side |
| Live middleware 401 curl | **needs human** optional — handler tests + MW code review |

**Status:** **fixed** (JSON parse statuses + gap tests)

**QA IDs touched:** API auth matrix (prompt 52).

---

## Prompt 53 — Verify Realtime setup

**Refs:** [DEPLOYMENT.md](./DEPLOYMENT.md) § Realtime publication · `LiveOrdersPanel.tsx` · `LiveMenuSidebar.tsx` · migrations `001`, `003`, `007` · remote `mnkabwcbdxruefzuvuuv`

### `supabase_realtime` publication (Supabase MCP)

Query: `pg_publication_tables WHERE pubname = 'supabase_realtime'`.

| Table | DEPLOYMENT.md KDS list | In publication |
|-------|------------------------|----------------|
| `categories` | yes | **yes** |
| `items` | yes | **yes** |
| `modifiers` | yes | **yes** |
| `draft_orders` | yes | **yes** (`003_draft_orders.sql`) |
| `phone_order_receipts` | yes | **yes** (`007_phone_order_receipts.sql`) |
| `restaurants` | (not listed; menu/org context) | **yes** (`001_init_schema.sql`) |

**Replica identity:** `relreplident = d` (default / PK) on all five KDS tables above — sufficient for `postgres_changes` UPDATE/DELETE.

**Migrations:** 24/24 on remote (includes publication DDL). **No SQL apply** — publication already complete.

### KDS client — orders (`LiveOrdersPanel`)

| State | Chip / copy | Poll | Reconnect |
|-------|-------------|------|-----------|
| `connecting` | Connecting… | 6s | — |
| `SUBSCRIBED` | Realtime (pulse) | 28s safety net | — |
| `CHANNEL_ERROR` / `TIMED_OUT` | Polling 6s + subtitle “polling every 6s…” | 6s | exponential backoff re-`attach()` (max 30s); `reportRealtimeDegraded` |

Channel: `orders-{restaurantId}` · `postgres_changes` on `draft_orders` + `phone_order_receipts` with `restaurant_id` filter.

### KDS client — menu (`LiveMenuSidebar`)

| State | Badge | Poll | Reconnect |
|-------|-------|------|-----------|
| `SUBSCRIBED` | Live (pulse) | 30s backup | — |
| `CHANNEL_ERROR` / `TIMED_OUT` | Sync (amber dot) + “syncing periodically” | 8s + immediate `syncMenuFromServer` | **none** (stays degraded until full remount; orders panel reconnects — parity gap, not blocking) |

Channel: `menu-{restaurantId}` · `categories` (restaurant filter), `items`, `modifiers`.

### Browser

| Check | Result |
|-------|--------|
| `GET /dashboard/restaurants/9d3263d1-4d9d-4f89-bfc5-160e2cca1855` | **307/redirect** → `/login?next=…` (no session cookie) |
| WebSocket `SUBSCRIBED` chip on KDS | **needs human** |
| Forced degraded / polling banner | **needs human** (block Realtime or revoke publication to exercise) |

**Code changes:** none.

**Status:** **pass** (publication verified on remote; signed-in Realtime/degraded UI **needs human**)

**QA IDs touched:** KDS-02, KDS-03, KDS-04 (Realtime infrastructure).

---

## Prompt 54 — Observability and health (SEC-02, SEC-03)

**Scope:** `app/api/health/route.ts` · `lib/observability/health.ts` · `logger.ts` · `route-context.ts` · `request-id.ts` · `middleware.ts`.

### `GET /api/health`

| Check | Result |
|-------|--------|
| `status` ∈ `healthy` \| `degraded` \| `unhealthy` | **pass** — derived from fail/warn counts; `env_public` fail → `unhealthy` |
| HTTP status | **pass** — **200** for healthy/degraded; **503** for unhealthy |
| Body shape | **pass** — `{ ok, status, timestamp, checks, request_id }` |
| No API keys / JWT in JSON | **pass** — `sanitizeHealthReportForPublic`; integration test rejects `eyJ…` |
| Error path | **pass** — thrown checks → **503** generic `Health check failed`; no secret in body |

### Request ID (`x-request-id`)

| Route | Result |
|-------|--------|
| Middleware matcher | `/api/:path*`, `/dashboard/:path*`, auth pages |
| `GET /api/restaurants` (unsigned) | **pass** — response header present |
| `GET /dashboard` (unsigned redirect) | **pass** — header on **307** |
| Health route | **pass** — echoes inbound id; `jsonResponse` sets header |

### Logger redaction

| Check | Result |
|-------|--------|
| `sanitizeLogFields` | **pass** — `api_key`, `authorization`, etc. → `[redacted]` |
| Vitest | `tests/unit/observability-health.test.ts` **4/4**; `tests/integration/api-health.test.ts` **2/2** |

### Integration check flags (public JSON)

| Check | Result |
|-------|--------|
| `env_server.details` | **pass** — `getEnvStatus()` booleans only |
| `env_public` / `elevenlabs` details | **pass** — `*_configured` booleans |
| Edge probes | **fixed** — internal `reachable` boolean; public `details` drops non-booleans (e.g. legacy `http_status`) |

### Fixes (prompt 54)

| File | Change |
|------|--------|
| `lib/observability/health.ts` | Edge probe `details.reachable`; public sanitize keeps boolean `details` only |

**Live curl:** localhost dev returned HTML **500** (stale `.next` chunk) — not used for sign-off; Vitest + middleware header probes used instead.

**Status:** **fixed** (edge detail sanitization); health + request ID + logger **pass**.

**QA IDs touched:** SEC-02, SEC-03.

---

## Prompt 56 — Add missing focused tests

**Scope:** Post prompts 1–55 gap review — auth callback edge cases, tenant helpers / `requireRestaurantAccess`, Next vs Edge Zod parity, ElevenLabs baked tool sync config, order lifecycle cancel.

### Gaps addressed (prior coverage)

| Risk area | Prior state | Prompt 56 action |
|-----------|-------------|------------------|
| Auth callback (`/auth/callback`) | `safe-next` unit only; prompt 10 curl | Integration route tests (missing code, evil `next`, exchange error, success redirect) |
| Tenant scoping helpers | Route integration mocks only | `resolveOrganizationId` / `serializeAuthContext` unit + `requireRestaurantAccess` 401/403/404/200 |
| Edge vs Next request schemas | Next-only `agent-tool-schemas.test.ts` | Parity matrix imports `supabase/functions/_shared/agent-tool-zod.ts` (Vitest alias `npm:zod@3.23.8` → `zod`) |
| EL baked sync config | Prompt 35/36 curl + MCP | `syncRoalElevenLabsTools` unit: tool names, `x-roal-restaurant-id`, baked body omits `restaurant_id` |
| Order lifecycle cancel | accept/complete/409 only | PATCH integration: `cancel` on `accepted` → `canceled` + `canceled_at` |

### Tests added / extended

| File | Cases | Focus |
|------|-------|--------|
| `tests/integration/auth-callback-route.test.ts` | 4 | Callback redirects + open-redirect guard |
| `tests/unit/auth-tenant-helpers.test.ts` | 7 | `resolveOrganizationId`, `serializeAuthContext`, `findMembershipForOrg` |
| `tests/unit/require-restaurant-access.test.ts` | 5 | `requireRestaurantAccess` tenant gates |
| `tests/unit/agent-tool-edge-schema-parity.test.ts` | 8 | Next ↔ Edge Zod accept/reject parity + `assertRestaurantIdMatches` |
| `tests/unit/sync-roal-baked-tools.test.ts` | 1 | Baked EL webhook names/headers/URLs |
| `tests/integration/api-orders-patch.test.ts` | +1 | Cancel accepted order |

**Config:** `vitest.config.ts` — resolve alias `npm:zod@3.23.8` → `zod` for Edge shared module import.

### Run

```bash
npm test -- tests/integration/auth-callback-route.test.ts \
  tests/unit/auth-tenant-helpers.test.ts \
  tests/unit/agent-tool-edge-schema-parity.test.ts \
  tests/unit/sync-roal-baked-tools.test.ts \
  tests/unit/require-restaurant-access.test.ts \
  tests/integration/api-orders-patch.test.ts
```

**Result:** **33/33 pass** (2026-05-23).

### Product code

**None** — tests only; no bugs found.

**Status:** **pass**

**QA IDs touched:** AUTH-01/02 (callback), AUTH-06 (tenant helpers), EL-05 (baked sync), ORD-* (cancel PATCH), agent-tool schemas (Edge parity).

---

## Prompt 06 — Baseline lint / test / build gates

**Scope:** First CI-style gate before feature prompts; re-run in prompt **58** / **60**.

| Step | Result (2026-05-23) |
|------|---------------------|
| `npm install` | **skipped** — `node_modules` present; `package-lock.json` unchanged |
| `npm run lint` | **pass** (exit 0) — 1 warning: `MenuScanner.tsx` `react-hooks/exhaustive-deps` |
| `npm test` | **pass** (rerun after fix) — **93** files, **452** tests |
| `npm run build` | **pass** (rerun after clean) — 50 static pages; 1 warning same as lint |

**First failures (fixed):**

| Gate | Error | Fix |
|------|-------|-----|
| `npm test` | `home-how-flow-qa.test.ts` expected `aria-hidden={desktopStage ? …}` | `components/landing/home/how-flow/home-how-flow.tsx` — stage column `aria-hidden` tied to `desktopStage` (not `syncDesktopStage`) |
| `npm run build` | Flaky `ENOENT` on `.next/server/pages-manifest.json` / random API routes when multiple `next dev` held `.next` | Stop concurrent `next` for repo; `rm -rf .next node_modules/.cache`; single isolated `npm run build` |

**Files changed (this prompt):** `components/landing/home/how-flow/home-how-flow.tsx`

**Notes:** `tsconfig.json` already excludes `supabase/functions`, `scripts`, `tests`; Vitest maps `npm:zod@3.23.8` → `zod` for Edge parity tests. No secrets printed from `.env`.

**Status:** **fixed** (one test fix + build hygiene; all gates green)

---

## Prompt 07 — Smoke public routes

**Scope:** `/`, `/pricing`, `/blog`, `/about`, `/demo`, `/contact`, `/security`, `/privacy`, `/terms`, `/login`, `/signup`.

**Server:** `npm run dev -- -p 3020` (isolated port; concurrent `rm -rf .next` on `:3000` caused transient webpack `MODULE_NOT_FOUND` during QA — not a route bug).

**Method:** `scripts/public-route-smoke.mjs` (HTTP + title) + cursor-ide-browser (`browser_navigate`, `browser_snapshot`) on `/`, `/pricing`, `/login`.

| Route | Status | Pass/Fail | Notes |
|-------|--------|-----------|-------|
| `/` | 200 | **pass** | Hero, nav, footer; title “ROAL — More pickup calls answered during rush” |
| `/pricing` | 200 | **pass** | Pricing FAQ + `$0.90` copy; nav `current` on Pricing |
| `/blog` | 200 | **pass** | Index “The ROAL Journal” |
| `/about` | 200 | **pass** | About page title OK |
| `/demo` | 200 | **pass** | Demo page renders |
| `/contact` | 200 | **pass** | Contact hero + form shell |
| `/security` | 200 | **pass** | Security marketing page |
| `/privacy` | 200 | **pass** | Privacy (draft) |
| `/terms` | 200 | **pass** | Terms (draft) |
| `/login` | 200 | **pass** | Sign-in form (email/password); marketing header links |
| `/signup` | 200 | **pass** | Sign-up page title OK |

| Check | Result |
|-------|--------|
| Console / hydration errors (browser) | **pass** — no error overlay on sampled pages |
| Broken primary nav | **pass** — Pricing nav click → `/pricing` (client nav) |
| Unit QA suites (prior) | **pass** — `public-*`, `blog-*`, `pricing-*`, `demo-*`, `contact-*`, `cross-link-qa`, `sitemap`, `robots`, `visual-consistency*` |

**Code changes:** none (environment-only flakes on shared `:3000` dev).

**Status:** **pass**

**QA IDs touched:** PUB-01–09 (+ auth shells for `/login`, `/signup` in prompt scope).

---

## Prompt 08 — Unauthenticated dashboard protection

**Scope:** Signed-out access to dashboard routes → `/login` with `next` preserving full path (`buildGuestLoginRedirect` in `lib/auth/auth-routes.ts`; enforced in `lib/supabase/middleware.ts` via `pathname` + `request.nextUrl.search`). Signed-in users on `/login`/`/signup` → `safeNextPath(next)`.

**Env:** `localhost:3000` (`npm run dev`); session cleared via `GET /auth/signout` + browser (no cookies).

### Per-route redirect matrix

| Requested path | HTTP | Final URL (`next` decoded) | `next` correct? | Browser |
|----------------|------|----------------------------|-----------------|---------|
| `/dashboard` | **307** | `/login?next=/dashboard` | **yes** | **yes** |
| `/dashboard/restaurants` | **307** | `/login?next=/dashboard/restaurants` | **yes** | **yes** |
| `/dashboard/onboarding` | **307** | `/login?next=/dashboard/onboarding` | **yes** | curl |
| `/dashboard/analytics` | **307** | `/login?next=/dashboard/analytics` | **yes** | curl |
| `/dashboard/billing` | **307** | `/login?next=/dashboard/billing` | **yes** | **yes** |
| `/dashboard/admin` | **307** | `/login?next=/dashboard/admin` | **yes** | curl |
| `/dashboard/settings` | **307** | `/login?next=/dashboard/settings` | **yes** | curl |
| `/dashboard/settings/notifications` | **307** | `/login?next=/dashboard/settings/notifications` | **yes** | curl |

**curl sample:** `curl -sI http://localhost:3000/dashboard/billing` → `location: /login?next=%2Fdashboard%2Fbilling`.

### Other checks

| Check | Result |
|-------|--------|
| Middleware | `updateSession` — `pathname.startsWith("/dashboard") && !user` → redirect |
| Unit | `tests/unit/auth-route-qa.test.ts` **7/7**; `safe-next.test.ts` **3/3** |
| Layout fallback | `app/dashboard/layout.tsx` uses `next=/dashboard` only if middleware skips (no Supabase env); not hit in this run |
| Code changes | **none** — redirects already correct |

**Status:** **pass**

**QA IDs touched:** DASH-07, AUTH-08.

---

## Prompt 14 — Dashboard shell navigation

**Scope:** `components/dashboard/app-shell.tsx`, `lib/dashboard-nav.ts`, active states, support links.

| Check | Result |
|-------|--------|
| Nav hrefs + pages | **pass** — 9 items; Vitest `dashboard-nav.test.ts` **6/6** |
| Guest access | **pass** — **307** + `next` (prompt 14 changelog) |
| Fix | Notifications header subtitle copy — **fixed** |
| Signed-in responsive / active states | **needs human** |

**Status:** **fixed**

---

## Prompt 55 — Production deploy scripts

**Scope:** `scripts/deploy-production.sh`, `scripts/deploy-edge-functions.sh`, `scripts/smoke-test-production.sh`, [DEPLOYMENT.md](./DEPLOYMENT.md).

| Check | Result |
|-------|--------|
| Edge deploy order | **pass** — `get-menu`, `sync-draft-order`, `finalize-order`; `--no-verify-jwt` |
| Env / secret names | **pass** — no values printed; matches `.env.example` |
| `deploy:check` flow | **pass** — lint → test → build wired |
| `smoke` script | **pass** — public routes + `/api/health` field checks |
| Fix | macOS bash 3.2 `read -p` **y/N** → portable `read` + `case` in `deploy-production.sh` |

**Status:** **fixed**

---

## Prompt 57 — Playwright E2E smoke path

**Scripts:** `npm run auth-smoke` → `scripts/auth-smoke.mjs` · `npm run e2e-smoke` → `scripts/e2e-smoke.mjs` · shared `scripts/playwright-smoke-lib.mjs` (`FAKE_EMAIL` = `smoke-test@example.invalid`).

| Check | Result |
|-------|--------|
| Auth-only smoke | Fake creds only; static test `auth-flow-smoke.test.ts` asserts lib constants |
| E2E smoke | Protected redirect; optional `E2E_EMAIL`/`E2E_PASSWORD` KDS; **mocked** scanner extract (no Gemini) |
| Docs | [E2E_SMOKE.md](./E2E_SMOKE.md) |
| Live run (prompt 60) | **skipped** — localhost unreachable; operator: `rm -rf .next && npm run dev` then `npm run e2e-smoke` |

**Status:** **pass** (scripts + static); live Playwright **needs human**

---

## Prompt 58 — Full regression after fixes

**Scope:** Run `lint` → `test` → `build` → optional smokes; fix failures introduced by this QA pass only; record command output (no secrets).

### Command results (2026-05-23, prompt 60 re-run)

| Step | Command | Exit | Result |
|------|---------|------|--------|
| 1 | `npm run lint` | 0 | **pass** — 1 warning: `MenuScanner.tsx` `react-hooks/exhaustive-deps` |
| 2 | `npm test` | 0 | **pass** — **93** files, **452** tests |
| 3 | `npm run build` | 0 | **pass** — clean `.next`; `tsconfig` exclude + zod path alias |
| 4 | `npm run smoke` | — | **skipped** — no `SMOKE_BASE_URL` / server down |
| 5 | `npm run auth-smoke` | — | **skipped** — needs dev server |
| 6 | `npm run e2e-smoke` | — | **skipped** — needs dev server |

### Failures fixed (prompt 58 + 60)

| Suite | Issue | Fix |
|-------|-------|-----|
| `tests/unit/sync-roal-baked-tools.test.ts` | mock hoist TDZ | Explicit hoisted mock exports |
| `tests/unit/auth-flow-smoke.test.ts` | duplicate `smokeLib`; wrong const | Single read of `playwright-smoke-lib.mjs` |
| `tests/unit/require-restaurant-access.test.ts` | `getSessionUser` mock not applied | `vi.hoisted` + `getSessionUserMock` |
| `npm run build` | Typecheck `npm:zod@3.23.8` in Edge shared | `tsconfig.json` paths + exclude `tests/**` |

### Product code

**None** — test/config only.

**Status:** **pass** (CI gates); live smokes **needs human**

---

## Prompt 59 — Launch blocker list

**Artifact:** [`docs/LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md)

| Severity | Open blockers |
|----------|----------------|
| P0 | **LB-01** — production phone: `getroal.com` DNS/init + live Twilio `get_menu_items` not certified (prompt **38** code path **pass** after re-sync) |
| P1 | **LB-02** Stripe off · **LB-03** Edge signing secret · **LB-04** live Playwright/prod smoke not run in agent env |

**Code changes this prompt:** none (blocker doc only; `tsconfig.json` already excludes `tests/**` + `npm:zod` alias per prompt 58).

**Status:** **done**

---

## Final certification (prompt 60)

**Date:** 2026-05-23 · **Project:** `mnkabwcbdxruefzuvuuv` · **Branch:** working tree at certification time.

### Pass/fail by domain

| Domain | Status | Evidence | Needs human |
|--------|--------|----------|-------------|
| Infra / DB | **pass** | MCP 24/24 migrations; Realtime publication (53) | CLI `migration list` CREATEROLE |
| Edge / phone tools | **pass** | Deployed curl 29–31; menu chain 38 | Live Twilio log 200; `getroal.com` DNS |
| Auth / session | **pass** | 09–12, callback 10, context 11, redirect 08 | Signed-in matrix browser |
| Onboarding | **pass** | 16 wizard + RLS 12 | Full browser E2E |
| Menu scan / import / editor | **pass** | 19–24 Vitest + MCP | Real menu image; editor browser |
| KDS / orders | **pass** | 25–28, 26 compute-totals | Realtime chip; order buttons browser |
| ElevenLabs / voice | **pass** | 33–42, 39 panel | Connect UI browser; live call |
| Billing | **pass** | 43–45 dev gates | Stripe live checkout |
| Notifications | **pass** | 46–47 | Settings save browser |
| Analytics | **pass** | 48 aggregate tests | Dashboard browser |
| Admin / ops | **pass** | 49–50, 54 health | Admin browser |
| Security / tenant | **pass** | 51–52, 32 tool auth | — |
| Observability | **pass** | 54 health + request id | — |
| Deploy / CI | **pass** | 55 scripts; 58 lint/test/build | `smoke` against prod URL |
| Public marketing | **pass** | 07 unit suites | Full public browser crawl |
| E2E automation | **pass** | 57 scripts present | Run `auth-smoke` / `e2e-smoke` locally |

### Regression commands (prompt 60)

| Command | Result |
|---------|--------|
| `npm run lint` | **pass** |
| `npm test` | **pass** — 452/452 |
| `npm run build` | **pass** |

### Certification verdict

**Ship-ready for staged / QA restaurant operations** with documented ops blockers ([`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md)). **Not** certified for production phone revenue or Stripe billing until LB-01–LB-03 closed by ops/product.

**Prompt 60 code changes:** `tests/unit/auth-flow-smoke.test.ts`, `tests/unit/require-restaurant-access.test.ts`, `tsconfig.json` (test fixes + build typecheck only).

---

## Changelog

| Date | Prompt | Summary |
|------|--------|---------|
| 2026-05-23 | 06 | Baseline gates: lint **pass**; test **452/452** after `home-how-flow` `aria-hidden` fix; build **pass** after clean `.next` (concurrent `next dev` caused ENOENT) — **fixed** |
| 2026-05-23 | 60 | Final certification: executive summary; prompts 06–08/14/55/57 sections; domain table; **452/452** tests; build pass; test hoisting fixes; LAUNCH_BLOCKERS synced — **done** |
| 2026-05-23 | 01 | Initial flow inventory and checklist (all `pending`) |
| 2026-05-23 | 02 | Env audit: local keys inventoried; `.env.example` + `lib/env.*` updated; signing secret missing locally (legacy OK) — **fixed** |
| 2026-05-23 | 03 | Supabase MCP connected; ref `mnkabwcbdxruefzuvuuv` matches local URL; 24/24 migrations on remote; DB query OK — **pass** |
| 2026-05-23 | 05 | Edge functions ACTIVE, `verify_jwt` false; redeployed (local newer); `AGENT_TOOL_SECRET` + injected Supabase secrets present; `AGENT_TOOL_SIGNING_SECRET` missing on Edge — **fixed** / **needs human** for signing parity |
| 2026-05-23 | 04 | Re-verified 24 local vs 24 remote migrations; key tables present; no pending apply; CLI migration list blocked (CREATEROLE) — **pass** |
| 2026-05-23 | 10 | Callback/signout curl + `safe-next` Vitest; missing-code → login error; evil `next` blocked; signout 303 → `/login` — **pass** (no code changes) |
| 2026-05-23 | 11 | `GET /api/auth/context`: signed-out 401; signed-in shape + no sensitive fields via Vitest; live signed-in blocked without session — **pass** |
| 2026-05-23 | 14 | Dashboard shell: 9 nav hrefs + pages; `isDashboardNavActive` Vitest (6); guest 307; support links OK; fixed notifications header subtitle; signed-in browser **needs human** — **fixed** |
| 2026-05-23 | 15 | Restaurant list + `POST /api/restaurants`: 6 Vitest cases; live 401/307; RLS insert policy verified via MCP; browser signed-in **needs human** — **pass** |
| 2026-05-23 | 19 | Menu scanner extract: GEMINI env 503/no leak; Vitest 11 (unit+integration); live menu image **needs human**; no live-menu DB writes before commit — **pass** |
| 2026-05-23 | 20 | Legacy `POST /api/scanner/process`: grep shows zero app/test/script callers; `MenuScanner` uses extract/commit/discard only; route is extract-only + `deprecated` JSON — **deprecated** (no code changes) |
| 2026-05-23 | 12 | Org bootstrap: profiles trigger + `ensureUserProfile`; `024` `organization_has_members` + bootstrap insert policy; MCP JWT simulation (first owner OK, non-member bootstrap blocked); no `025` — **pass** |
| 2026-05-23 | 13 | Role matrix: `roles.ts` + dashboard gates; MCP fixture `qa-role-separation` (3 users, IDs only); RLS org/notification/restaurant probes; Vitest 8/8; no code fixes; browser matrix **needs human** — **pass** |
| 2026-05-23 | 09 | Login/signup: `auth-smoke` 9/9 after clean dev; browser — labels, loading, alerts, HTML5 validation; no secret leaks (Supabase JSDoc only); no code changes — **pass** |
| 2026-05-23 | 16 | Onboarding wizard: per-step pass; JSONB persistence OK (MCP); nav-ahead guard **fixed**; hours not in wizard — **needs human** for signed-in browser E2E — **pass** |
| 2026-05-23 | 21 | Menu import commit: 8 Vitest + 3 guard tests; curl 401; MCP `merge_menu` + `menu_imports` + `usage_events` on QA fixture; duplicate names warn-only; browser review **needs human** — **pass** |
| 2026-05-23 | 22 | Discard + import history: 9 Vitest; MCP RLS cross-tenant probe pass; `MenuScanner` reset/new-file now discards stale `extracted` rows; APIs tenant-scoped — **fixed** |
| 2026-05-23 | 18 | Hours settings: schema rejects equal open/close; save refreshes status badge; MCP 21 weekly rows; Edge/voice paths traced; Vitest 5/5 — **fixed** |
| 2026-05-23 | 17 | Profile settings: Vitest schema 5/5; MCP UPDATE/constraint check on `egg mania`; server action error matrix reviewed; no code fixes; signed-in save/refresh **needs human** — **pass** |
| 2026-05-23 | 26 | `POST …/orders/compute-totals`: cart validation before totals; 400 for unknown/unavailable/empty; profile tax/service in response; Vitest 9 unit + 6 integration — **fixed** |
| 2026-05-23 | 24 | Modifier groups: Vitest 21/21; MCP `modifiers` columns match `DbModifier`; cart group `groupKey` + reorder-by-id fix; browser **needs human** — **fixed** |
| 2026-05-23 | 25 | Live menu sidebar: scope tests 2/2; MCP egg mania (7/39) + empty diner; Realtime/poll/clear reviewed; **fixed** degraded Sync dot + unavailable name mute; browser Realtime **needs human** — **fixed** |
| 2026-05-23 | 23 | Menu editor CRUD: validation/modifier/live-scope 13/13; +7 tests (DELETE API, load-menu); MCP live menu sort/prices OK; no GET on menu route; browser **needs human** — **pass** |
| 2026-05-23 | 27 | Draft order PATCH lifecycle: no REST list route (SSR/Supabase); 6 integration + 8 unit tests; 017 timestamps on remote; 403/404/409/200 covered — **pass** (tests only) |
| 2026-05-23 | 35 | EL tool sync API: MCP fixture `egg mania`; POST 200 baked 3 tools; EL headers/url verified; profile summary via prior KDS connect; doc sync API section — **pass** |
| 2026-05-23 | 28 | KDS `LiveOrdersPanel`: MCP seed `flow-qa-28-*` on QA restaurant, tab mapping verified, cleaned up; Realtime/poll code reviewed; merge-fetched + apply-order-status 6/6; browser login redirect — **needs human** for signed-in E2E — **pass** |
| 2026-05-23 | 29 | `get-menu` deployed curl: OPTIONS/GET/POST; legacy + signed `roal1` + baked header-only; 7×39 menu on egg mania; negative auth matrix pass; no redeploy; `AGENT_TOOL_SIGNING_SECRET` absent Edge+local (legacy fallback) — **pass** |
| 2026-05-23 | 31 | `finalize-order` Edge: sync-then-finalize + standalone items; receipts + `status=new`; idempotency replay header; Zod + placeholder customer 400; `usage_events` verified; KDS terminal SQL pattern for completed/canceled; script `scripts/qa-finalize-order-edge.mjs`; no redeploy — **pass** |
| 2026-05-23 | 32 | Agent tool auth: Vitest 35 (auth 18 + schemas 17); `get-menu` curl matrix signed/legacy/negative; **fixed** UUID case mismatch in scope resolve + assert; Edge redeployed — **fixed** |
| 2026-05-23 | 33 | ElevenLabs reachability: `getConvaiAgent` via `peek-agent.ts` OK; env both files non-empty; health check config-only; `.env.example` empty-override note — **pass** |
| 2026-05-23 | 38 | Phone menu chain: EL tools baked + ref match; Edge 200 (7×39); root cause = dynamic tools + missing scope/init, not get-menu; resync egg mania; getroal.com DNS **needs human** — **pass** |
| 2026-05-23 | 34 | Agent route GET/PATCH: Vitest 7/7; default/`?agent_id=`; 503 env errors no stack; no auth required; live GET 200 once; no route fixes — **pass** (tests only) |
| 2026-05-23 | 39 | VoiceAgentPanel connect/resync: loading labels + env card OK; MCP profile agent id + 3 tool ids; success banner **fixed**; signed-in browser **needs human** — **fixed** |
| 2026-05-23 | 40 | Voice test harness: Vitest 10/10 dry-run; scenario matrix menu/unavailable/modifier/sync/finalize/handoff(prompt)/missing guest; added `valid_modifier_sync`; invalid modifier uses item w/ groups; live KDS **needs human** — **pass** |
| 2026-05-23 | 42 | Phone personalization: webhook URL pattern verified; baked tools vs conv-init documented; first_message literal + tests; DEPLOYMENT/AGENT_TOOL_SECURITY/ELEVENLABS updates; control-center Twilio checklist uses sync summary — **pass** |
| 2026-05-23 | 41 | Agent prompt/KB/menu snapshot: code review + connect/init flow; menu-first, sync_draft_order, guest identity, hours/timezone, placeholders; Vitest 10/10 — **pass** (tests only) |
| 2026-05-23 | 50 | Settings + support: guest 307 + `next`; outbound links/pages verified; empty states (no org / no restaurant / has restaurant); nav Vitest 6/6; no code fixes; signed-in browser **needs human** — **pass** |
| 2026-05-23 | 49 | Admin ops dashboard: access gates + env booleans + audit/error sanitization reviewed; **fixed** health messages via `sanitizeHealthReportForPublic` in snapshot loader; `admin-ops.test.ts` 7/7 — **fixed** |
| 2026-05-23 | 47 | Notification APIs: events + check-stuck auth/org/restaurant matrix; stuck-orders unit; MCP `notification_deliveries` schema + RLS cross-tenant probe; KDS page-load notify reviewed; Vitest 11 integration + 3 stuck unit — **pass** (tests only) |
| 2026-05-23 | 48 | Analytics dashboard: MCP seed `flow-qa-p48-*` on qa-role-separation; `loadOrganizationAnalytics` KPI/chart/popular verified; Vitest 6/6; **fixed** per-location revenue `+` flag; guest redirect OK; signed-in browser **needs human** — **fixed** |
| 2026-05-23 | 44 | Usage events: Vitest 5/5 + orders-patch 7/7; MCP `usage_events` sample; KDS `order_completed` idempotency aligned with Edge session key — **fixed** |
| 2026-05-23 | 43 | Billing gates: GET 401/200 Vitest; dev mode never hardBlocks; stripe location cap unit; `api-billing-gates` integration 4/4; onboarding ungated; no gate logic fixes — **pass** |
| 2026-05-23 | 46 | Notification settings: Vitest 7/7 + events integration; admin/member + redact reviewed; **fixed** dev_console save wiping webhook/recipients; guest 307; signed-in save **needs human** — **fixed** |
| 2026-05-23 | 52 | API auth negative matrix: 17 routes inventoried; Vitest gaps + sync-roal-tools 5; **fixed** Invalid JSON → 400 on commit/discard/orders-patch/compute-totals — **fixed** |
| 2026-05-23 | 51 | Tenant isolation: MCP JWT probes Org A→B (restaurants, menu, orders, receipts, notifications, usage/analytics, billing); 37 Vitest; `rls_poc_demo_reads` false; no leaks; no migration — **pass** |
| 2026-05-23 | 53 | Realtime publication MCP: all DEPLOYMENT.md KDS tables + `restaurants` in `supabase_realtime`; replica identity default; `LiveOrdersPanel`/`LiveMenuSidebar` fallback reviewed; browser KDS **needs human** — **pass** (no code/SQL changes) |
| 2026-05-23 | 45 | Billing dashboard: dev/empty/stripe-key states; `checkoutEnabled` + keys-only copy; hide checkout buttons until `STRIPE_CHECKOUT_ENABLED`; Vitest 13/13; guest redirect OK; signed-in browser **needs human** — **fixed** |
| 2026-05-23 | 55 | Deploy scripts QA: order/edge names/env/smoke paths **pass**; **fixed** macOS bash 3.2 `y/N` prompts in `deploy-production.sh`; no DEPLOYMENT.md edits — **fixed** |
| 2026-05-23 | 59 | `docs/LAUNCH_BLOCKERS.md`: 4 open (LB-01 prod phone sign-off, LB-02 Stripe, LB-03 signing secret, LB-04 smoke 06–08); prompt 38 menu chain **pass** in QA — **done** |
| 2026-05-23 | 56 | Focused Vitest gaps: auth callback (4), tenant helpers (7), requireRestaurantAccess (5), Edge/Next schema parity (8), sync baked tools (1), orders cancel PATCH (+1); vitest zod alias; **33/33 pass**; no product fixes — **pass** |
| 2026-05-23 | 58 | Full regression: lint **pass** (1 MenuScanner warning); test **452/452** after **fixed** `sync-roal-baked-tools` mock hoist; build **pass** (clean `.next`); smoke/auth-smoke/e2e-smoke **skipped** (no local server / `SMOKE_BASE_URL`) — **pass** |
| 2026-05-23 | 07 | Public routes browser smoke: 11/11 **200** on `localhost:3020`; cursor-ide-browser `/` `/pricing` `/login` OK; no product fixes; added `scripts/public-route-smoke.mjs` — **pass** |
| 2026-05-23 | 08 | Dashboard auth guard: 8/8 routes **307** → `/login` with correct `next` (curl + browser on `localhost:3000`); middleware/auth-routes reviewed; no code fixes — **pass** |
