# Feature readiness audit

**Date:** 2026-05-30  
**Pass:** Launch finalization **37/40**  
**Project:** Supabase `mnkabwcbdxruefzuvuuv` (yourturn)  
**Primary app URL (env):** `https://getroal.com` (`NEXT_PUBLIC_APP_URL`)

Operator cross-links: [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md) · [`FINAL_LAUNCH_READINESS.md`](./FINAL_LAUNCH_READINESS.md) · [`LOMAN_FEATURE_GAP.md`](./LOMAN_FEATURE_GAP.md) · [`TESTING.md`](./TESTING.md) · [`DEPLOYMENT.md`](./DEPLOYMENT.md)

---

## Executive summary

| Layer | Status |
|-------|--------|
| **Product (pilot onboarding)** | **Ready** — signup → org → locations → menu → hours → voice agent connect/sync → KDS → test harness |
| **Voice tool chain (automated)** | **Ready** — baked ElevenLabs tools → Edge `get-menu` / `sync-draft-order` / `finalize-order` / `get-order-status`; signing parity closed (LB-03) |
| **Production live calls** | **Not ready (P0)** — **LB-01** open: production host/DNS + one signed-off Twilio call |
| **Loman-style command center** | **Partial** — strong on orders/KDS/menu/voice ops; conversation-init active-call rows, post-call webhook ingestion, call intent/action classification, staff handoff alerts/inbox, distinct voicemail inbox, call outcomes, call-history and order-detail transcript/recording links, peak-hour, rush-window, by-location call analytics, order-status lookup, upsell rule config, attach-rate, attributed upsell revenue, observed ticket lift, deterministic treatment/control upsell lift, override-aware shared-template cascade, and field-level diff visibility for customized inherited menus added; gaps remain on live transcript streaming, ROAL-hosted recording storage, experiment confidence tooling, and operator-approved per-field inherited menu updates |

**Bottom line:** Safe for **staged pilot** on a deployed host with env + Edge secrets. **Not** safe to forward rush-hour production phone traffic until **LB-01** closes.

---

## Implemented features (shipped in repo)

### Auth, tenancy, security

- Supabase Auth: login, signup, callback, sign-out, `next` redirect safety (`lib/auth/*`, `middleware.ts`)
- Organizations, memberships, roles (owner / admin / member), RLS on tenant tables (`008`–`009`, `024`)
- Restaurant-scoped dashboard access (`lib/auth/context-server.ts`, `requireRestaurantAccess` patterns)
- Agent tool auth: signed `roal1.*` tokens + legacy secret fallback (`lib/agent-tools/*`, Edge `_shared/agent-tool-auth.ts`)
- Tenant isolation probes + Vitest/live QA (`scripts/sql/tenant-isolation-probe.sql`, `npm run qa:tenant-isolation`)
- API route auth matrix covered in [`FLOW_QA_REPORT.md`](./FLOW_QA_REPORT.md)

### Operator dashboard

- **Locations list** — cards, stats (agent, menu count, last order), fast paths to Orders / Menu / Agent (`app/dashboard/restaurants/page.tsx`)
- **Create restaurant** — modal, billing gate, auto voice provision attempt (`CreateRestaurantButton.tsx`, `POST /api/restaurants`)
- **Per-location workspace** — desktop rail + mobile bottom nav (6 destinations), KDS orders home (`RestaurantWorkspaceRail.tsx`)
- **Menu setup** — Gemini menu scan, import review/commit, live menu editor, modifiers, import history, explicit **Publish to voice**, copy menu from another org location, reusable org menu templates, default new-location inheritance, local override tracking, field-level diff visibility for customized inherited menus, and controlled push to inherited locations (`MenuScanner.tsx`, `MenuEditor.tsx`, `MenuCopyFromLocation.tsx`, `MenuAutoSyncStatusPanel.tsx`)
- **Restaurant profile, FAQ knowledge, upsell rules & hours** — timezone, address, pickup/delivery flags, operator FAQ/policy answers, add-on/combo suggestion rules, weekly hours + exceptions (`RestaurantProfileSettings.tsx`, `RestaurantHoursSettings.tsx`, `restaurant_knowledge_entries`, `restaurant_upsell_rules`)
- **Live Agent** — connect/resync ElevenLabs agent, tool bake, menu auto-sync, launch checklist, command center snapshot, test call harness (`agent/page.tsx`, `VoiceAgentPanel.tsx`)
- **Call history / command center** — session list from operational data + `agent_call_events` when present, with owner-readable intent labels, next-action labels, active/order/action/evidence summary cards, sanitized post-call transcript lines, reservation request linkage, voicemail filter/inbox, and recording links when ElevenLabs supplies a safe audio URL (`/dashboard/restaurants/[id]/calls`)
- **Staff follow-up inbox** — voicemail messages are separated into a callback inbox; handoff/callback/manager/escalation calls appear above call history with caller, reason, outcome, session, and transcript summary (`RestaurantCallHistoryPanel.tsx`)
- **ElevenLabs call ingestion** — conversation-init marks active calls; HMAC-verified post-call endpoint stores transcription/audio/failure events into `agent_call_events` (`/api/integrations/elevenlabs/conversation-init`, `/api/integrations/elevenlabs/post-call-webhook`)
- **Analytics** — org rollup + per-location sessions/revenue, post-call outcome counts, FAQ/no-order calls by location, peak call hours, day/hour rush windows, by-location call conversion, configured upsell attach rate, attributed offer revenue, observed ticket lift, deterministic treatment/control upsell lift (`/dashboard/analytics`, `/dashboard/restaurants/[id]/analytics`)
- **Onboarding wizard** — profile → menu → voice agent (provision + retry) → test call → go live (`components/onboarding/*`, pass **28**)
- **Launch checklist** — real profile/menu/hours/agent/tools/webhook/test-call gates (`lib/restaurant-launch/*`, pass **27**)
- **Operational notifications** — state-transition and call-escalation events (provision failure, menu sync failure, stuck orders, go-live, staff handoff requested) (`lib/notifications/operational-events.ts`, pass **32**)
- **Billing (pilot)** — plan gates, usage events, honest UI when Stripe checkout off (`lib/billing/*`)
- **Admin ops** — platform health snapshot for admins (`/dashboard/admin`)
- **Settings / support** — notifications prefs, support page

### Voice / ElevenLabs

- Seven ConvAI webhook tools: `get_menu_items`, `get_restaurant_info`, `get_caller_history`, `submit_reservation_request`, `sync_draft_order`, `finalize_order`, `get_order_status` (`lib/sync-elevenlabs-roal-tools.ts`)
- Per-restaurant tool bake (restaurant id in URL/headers)
- **Conversation-init** personalization webhook + active-call row upsert (`app/api/integrations/elevenlabs/conversation-init/route.ts`)
- Dedicated agent provision lifecycle on `restaurant_profiles` (migration **025**)
- Menu auto-sync after content changes (`lib/voice-agent/after-menu-content-mutation.ts`)
- Hours-aware menu (`ordering_allowed` in `get-menu`); **sync/finalize blocked when closed** (403 `restaurant_closed`)
- Handoff rule columns on profile (migration **027**) and operator FAQ knowledge entries (migration **028**); prompt wiring in `lib/elevenlabs/agent-prompt.ts`

### Edge (Supabase Functions)

| Function | Role | JWT |
|----------|------|-----|
| `get-menu` | Menu + hours for agent | `verify_jwt = false` (custom `roal1` auth in handler) |
| `get-restaurant-info` | Live business facts: hours, address, prep time, FAQ entries | same |
| `sync-draft-order` | Draft cart → KDS | same |
| `finalize-order` | Finalize → queue + receipt + usage | same |
| `get-order-status` | Caller asks if pickup is ready / being prepared / completed | same |

Shared: `_shared/agent-tool-auth.ts`, `_shared/record-usage.ts`, `_shared/restaurant-hours.ts`, Zod validation.

### Data model (high level)

- Core: `restaurants`, `categories`, `menu_items`, `modifier_groups`, `draft_orders`, `phone_order_receipts`
- Ops: `restaurant_profiles`, `restaurant_weekly_hours`, `restaurant_hours_exceptions`, `usage_events`, `audit_logs`
- Voice: provision + menu sync status on profile (**025**), `agent_call_events` (**026**), handoff columns (**027**), FAQ knowledge entries (**028**), upsell rules (**029**)
- Onboarding: `restaurant_onboarding` (**010**)

### Public marketing (out of pass 37 scope)

- Landing, pricing, blog, about, demo, contact, security, privacy, terms — QA’d in prior public launch passes; **not** redesigned in passes 35–36.

### Recent UX fixes (pass **36**)

- Mobile workspace bottom nav: dynamic column count for **6** tabs (was `grid-cols-5` → wrapped “Plan”)
- Missing **Calls** icon on mobile rail
- Live Agent: removed duplicate mobile menu-sync hero; clearer env-default agent ID hint
- Create-restaurant modal title contrast (`text-ink`)

---

## Remaining limitations vs Loman-style platform

Full matrix: [`LOMAN_FEATURE_GAP.md`](./LOMAN_FEATURE_GAP.md). Summary:

| Loman pillar | ROAL status | Main gap |
|--------------|-------------|----------|
| Phone orders → kitchen | **Partial** | Pickup path strong + delivery address/instructions capture + owner-readable call/cart/ticket/kitchen timeline in order details; no delivery dispatch or POS ticket |
| FAQs / knowledge | **Partial** | Menu + profile + hours + operator FAQ/policy entries; FAQ/no-order call counts by location; no per-entry FAQ analytics |
| **Live calls + transcript** | **Partial** | Conversation-init creates active `agent_call_events` rows; the live orders page subscribes to `agent_call_events` for active-call indicators and post-call evidence refresh; Call History and order details show post-call transcript lines; no word-by-word live transcript streaming UI |
| Unified command center | **Partial** | Calls page now groups active calls, orders won, action-needed calls, transcripts, recordings, reservations, and staff handoffs; KDS order details show phone-order timelines plus stored call evidence; still no live transcript stream |
| Menu/hours/FAQ updates | **Present / partial** | Scan, editor, hours, knowledge entries, auto-sync plus explicit Publish to voice |
| Upsell / ticket lift | **Partial** | Dashboard upsell rules feed the prompt; attach-rate, attributed offer revenue, observed ticket lift, and deterministic treatment/control lift exist; no confidence interval or operator experiment control yet |
| Analytics (peak, conversion) | **Partial** | Session/revenue analytics; peak call + rush-window cards from post-call events; upsell attach rate, attributed revenue, observed lift, and deterministic controlled lift; no full heatmap or confidence tooling |
| Staff handoff | **Partial** | Profile handoff fields + prompt + post-call staff/voicemail notification + voicemail/follow-up inboxes; no ROAL-hosted voicemail recording storage, limited transfer automation |
| Multi-location | **Partial** | Org analytics + per-store workspace + copy menu between locations + reusable/default org menu templates for new-location inheritance + visible inherited-template ancestry/re-apply + controlled push to inherited locations; customized stores receive missing brand categories/items without overwriting local items and expose field-level preserved override counts; no per-field approval UI / regional routing |

**Explicitly excluded (by design):** POS integrations, phone payment capture, reservation POS sync — see `LOMAN_FEATURE_GAP.md` § Excluded.

**Suggested build order (from gap doc):** real-time call streaming → hosted recording storage / transfer v2 → per-field inherited menu approval UI → upsell experiment confidence + operator controls.

---

## QA commands run (passes 33–37)

All commands assume repo root and:

```bash
# Load secrets locally (never commit .env / .env.local)
npx tsx --env-file=.env --env-file=.env.local <script>
# or: node --env-file=.env --env-file=.env.local <script>
```

Optional: `QA_RESTAURANT_ID=<uuid>` (default QA restaurant: egg mania fixture id in scripts).

### Pass 33 — Focused Vitest (2026-05-30)

```bash
npm test -- tests/unit/restaurant-launch-checklist.test.ts \
  tests/unit/operational-events.test.ts \
  tests/unit/tenant-isolation-query-scope.test.ts \
  tests/integration/tenant-isolation-onboarding-actions.test.ts \
  tests/unit/tenant-isolation-live-qa.test.ts \
  tests/unit/elevenlabs-conversation-init.test.ts \
  tests/integration/api-elevenlabs-conversation-init.test.ts \
  tests/integration/restaurant-create-auto-provision.test.ts \
  tests/unit/voice-agent-harness.test.ts \
  tests/unit/validate-cart-items.test.ts
```

**Result:** **106/106** pass (after integration mock fix for `loadProfileOperationalSnapshot`).

### Pass 34 — Production build

```bash
npm run build
```

**Result:** **Pass** (compile, lint, types, static pages).

### Pass 35 — Live voice / Edge QA

| Command | Result | Notes |
|---------|--------|-------|
| `npm run qa:lb03-signing-parity` | **5/5** | Local + Edge `AGENT_TOOL_SIGNING_SECRET`; `roal1` → get-menu **200** |
| `npm run qa:get-menu-elevenlabs` | **6/6** | ElevenLabs-exact GET; 7 categories / 39 items |
| `npm run qa:voice-agent-panel` | **8/8** | Connect + resync; tools baked; literal `first_message` |
| `npm run qa:lb01-phone-stack` | **10/13** | Tools + get_menu sim **200**; **fail:** prod DNS `getroal.com` NXDOMAIN; conversation-init no prod/local responder |
| `npm run qa:draft-finalize-elevenlabs` | **2/11** | **fail:** `403 restaurant_closed` (outside open hours America/Chicago); not an auth regression |

### Pass 36 — Dashboard Playwright inspection

```bash
PORT=3020 npm run dev   # separate terminal
node --env-file=.env --env-file=.env.local scripts/qa-dashboard-pass36-inspect.mjs http://localhost:3020
```

**Result:** **14/14** automated layout checks (mobile 390×844, desktop 1440×900): locations, create modal, workspace, menu, agent, location + org analytics. Layout fixes applied (see above).

**Related (not re-run in 37):** `npm run qa:dashboard-responsive-sweep` — broader dashboard routes; `npm run qa:tenant-isolation` — RLS live probe (pass **30**).

### Pass 37 — This document

No new automated suite; consolidates evidence from passes 27–36 and [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md).

### Reference — full QA inventory (`package.json`)

| Script | Purpose |
|--------|---------|
| `npm run qa:lb01-phone-stack` | Production phone stack + tool bake + get_menu simulation |
| `npm run qa:lb03-signing-parity` | Signing secret parity + signed get-menu |
| `npm run qa:get-menu-elevenlabs` | Synced tool GET |
| `npm run qa:draft-finalize-elevenlabs` | Synced sync + finalize (requires open hours) |
| `npm run qa:voice-agent-panel` | Connect/resync regression |
| `npm run qa:voice-agent-provision` | Dedicated agent provision |
| `npm run qa:menu-auto-sync` | Menu change → agent sync |
| `npm run qa:phone-order-kds` | Phone order → KDS flow |
| `npm run qa:tenant-isolation` | Tenant RLS live |
| `npm run qa:notifications-live` | Notification settings + dispatch |
| `npm run qa:analytics-live` | Analytics loaders |
| `npm run qa:owner-journey` | End-to-end owner path |
| `npm run smoke` | Production HTTP smoke (needs live `SMOKE_BASE_URL`) |
| `npm test` | Vitest full suite |

---

## Supabase migrations

**Repo:** `supabase/migrations/001` … `031` (31 files).

| # | File | Summary |
|---|------|---------|
| 001 | `001_init_schema.sql` | Base schema |
| 002–007 | merge/clear menu, draft orders, receipts, RLS | Menu + orders foundation |
| 008–009 | organizations, production RLS | Multi-tenant |
| 010 | `010_onboarding.sql` | Onboarding state |
| 011 | `011_restaurant_profiles.sql` | Profile |
| 012 | `012_restaurant_hours.sql` | Hours |
| 013–016 | menu sort, modifiers, imports, order status | Menu + KDS |
| 017–018 | timestamps, ElevenLabs agent on profile | Ops |
| 019–020 | idempotency, usage_events | Agent tools + metering |
| 021 | `021_organization_billing.sql` | Billing |
| 022–024 | notifications, audit, membership RLS fix | Ops + security |
| **025** | `025_restaurant_profile_voice_agent_lifecycle.sql` | Provision + menu auto-sync status columns |
| **026** | `026_agent_call_events.sql` | `agent_call_events` + RLS |
| **027** | `027_restaurant_handoff_rules.sql` | Handoff + closed-hours message columns |
| **028** | `028_restaurant_knowledge_entries.sql` | Operator FAQ / policy knowledge for agent prompt |
| **029** | `029_restaurant_upsell_rules.sql` | Operator add-on / combo suggestion rules for agent prompt |
| **030–031** | notification enum/default updates | Staff handoff event + launch notification enum sync |

**Remote (pass 32, 2026-05-30):** Migrations **025**, **026**, **027** applied to project **`mnkabwcbdxruefzuvuuv`** via Supabase MCP `apply_migration` (were missing before that pass). Prior migrations **001–024** were already aligned per [`FINAL_LAUNCH_READINESS.md`](./FINAL_LAUNCH_READINESS.md). Migrations **028** and **029** were applied via Supabase MCP for FAQ knowledge and upsell rule editors. Migrations **030** and **031** were applied via Supabase MCP for launch notification enum/default alignment and `staff_handoff_requested`.

**Verify on deploy:**

```bash
# After linking project / DB password
npx supabase migration list
# or run scripts/sql/tenant-isolation-probe.sql in SQL editor
```

---

## Edge functions deployed

**Pass 32 (2026-05-30)** — deployed via `npm run deploy:edge` / `scripts/deploy-edge-functions.sh` to **`mnkabwcbdxruefzuvuuv`**:

| Function | Deployed version (pass 32) | Config |
|----------|----------------------------|--------|
| `get-menu` | **v10** | `verify_jwt = false` |
| `sync-draft-order` | **v11** | `verify_jwt = false` |
| `finalize-order` | **v11** | `verify_jwt = false` |
| `get-order-status` | Deployed after pass 32 | `verify_jwt = false` |
| `get-restaurant-info` | Deployed in pass 38 | `verify_jwt = false` |
| `get-caller-history` | Deployed in pass 39 | `verify_jwt = false` |
| `submit-reservation-request` | New in pass 40 | `verify_jwt = false` |

**Secrets required on Edge:** `AGENT_TOOL_SIGNING_SECRET` (and related Supabase keys). Run `npm run ensure:signing-parity` before go-live.

**Not separate Edge functions:** Auth and usage recording live in `_shared/` and ship inside the functions above.

**Re-deploy after handler changes:**

```bash
npm run deploy:edge
npm run resync:elevenlabs-all   # rebake tools after secret/URL changes
```

---

## Live-call blockers still open

From [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md) (updated through pass **38** decision table; still accurate for pass **37**):

| ID | Severity | Status | Blocker |
|----|----------|--------|---------|
| **LB-01** | **P0** | **Open** | Production phone stack not signed off: **`getroal.com` unreachable** from QA (DNS/connect); Twilio → ElevenLabs personalization → `conversation-init` not proven on prod; no human Twilio call with `get_menu_items` **200** in ElevenLabs logs |
| **LB-04** | P1 | **Open** (blocked by LB-01) | `SMOKE_BASE_URL=https://getroal.com npm run smoke` fails; `qa:deploy-smoke` production URLs fail |
| **LB-03** | P1 | **Closed** | Signing secret parity — `npm run qa:lb03-signing-parity` **5/5** |
| **LB-02** | P2 | **Downgraded** | Self-serve Stripe not required for pilot |

### LB-01 close checklist (ops + human)

1. Deploy Next.js; point **`getroal.com`** DNS (or set `NEXT_PUBLIC_APP_URL` to live origin).
2. Production env + Edge: `npm run ensure:signing-parity`; `npm run resync:elevenlabs-all`.
3. `npm run qa:lb01-phone-stack` → prod DNS + HTTP + conversation-init **pass**.
4. One **inbound Twilio test call** → ElevenLabs logs show `get_menu_items` **HTTP 200**.

### Conditional QA failures (not code blockers)

| Issue | When | Mitigation |
|-------|------|------------|
| `qa:draft-finalize-elevenlabs` **403** | Restaurant **closed** per weekly hours | Re-run during open hours (or temporarily adjust QA location hours) |
| `conversation-init` fail in lb01 | Prod down + dev server not on `:3020` | Start `PORT=3020 npm run dev` for local probe |

---

## Passes 27–36 (feature work referenced)

| Pass | Deliverable |
|------|-------------|
| 27 | `RestaurantLaunchChecklist` on onboarding + Live Agent |
| 28 | Guided onboarding: provision + retry voice agent; multi-location selector |
| 29 | Operational notifications on state transition only |
| 30 | Tenant isolation SQL probe + Vitest/live QA |
| 31 | Migrations 025–027 applied remote |
| 32 | Edge functions redeployed (v10/v11) |
| 33 | Focused Vitest **106/106** |
| 34 | `npm run build` pass |
| 35 | Live QA suite (table above) |
| 36 | Dashboard Playwright + mobile rail / agent UX fixes |

---

## Sign-off pointers

| Audience | Document |
|----------|----------|
| Launch decision | [`LAUNCH_BLOCKERS.md`](./LAUNCH_BLOCKERS.md) |
| 60-prompt flow evidence | [`FLOW_QA_REPORT.md`](./FLOW_QA_REPORT.md) |
| Loman competitive gaps | [`LOMAN_FEATURE_GAP.md`](./LOMAN_FEATURE_GAP.md) |
| Deploy steps | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| ElevenLabs runbook | [`ELEVENLABS.md`](./ELEVENLABS.md) |

---

*Pass 37/40 — documentation only.*
