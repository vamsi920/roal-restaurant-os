# Production deployment runbook

End-to-end guide for deploying ROAL (Next.js + Supabase + Edge Functions + ElevenLabs). No secrets are stored in this document—use your password manager and Supabase/Netlify dashboards.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) logged in (`supabase login`)
- Node.js 20+ and `npm ci`
- Hosting for Next.js (Vercel, Netlify, or Node `npm run start` behind a reverse proxy)
- Supabase project (production, not local Docker unless you self-host)
- Google AI Studio API key (menu scanner)
- ElevenLabs API key (voice agent connect/sync)

## Deployment order

Run in this order on every production release:

```text
1. Apply Postgres migrations     → supabase db push
2. Set / rotate secrets          → hosting env + Edge secrets
3. Deploy Edge Functions         → scripts/deploy-edge-functions.sh
4. Build & deploy Next.js        → npm run build (+ host deploy)
5. Post-deploy smoke tests       → scripts/smoke-test-production.sh
6. Per restaurant: Connect agent → KDS → voice panel (ElevenLabs sync)
```

Helper (interactive checks):

```bash
./scripts/deploy-production.sh
```

---

## 1. Supabase migrations

All SQL lives in `supabase/migrations/`. Apply to the linked remote project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Migration inventory

Apply in filename order via `supabase db push` (do not cherry-pick files):

| File | Purpose |
|------|---------|
| `001`–`007` | Core menu schema, `merge_menu` / `clear_restaurant_menu`, draft orders, receipts |
| `008_organizations_tenant` | Organizations, profiles, memberships, `restaurants.organization_id` |
| `009_production_rls_policies` | Member-scoped RLS (replaces dev-open policies from `001`–`008`) |
| `010_onboarding` | Org/restaurant onboarding progress |
| `011_restaurant_profiles` | Tax/service fee, ElevenLabs sync fields |
| `012_restaurant_hours` | Weekly hours JSON |
| `013`–`014` | Menu item / modifier sort order |
| `015_menu_import_audits` | Import history + Storage bucket `menu-uploads` |
| `016`–`017` | Kitchen order statuses + timestamps |
| `018_elevenlabs_agent_on_profile` | Agent id on profile |
| `019_agent_tool_idempotency` | Tool replay cache |
| `020_usage_events` | Usage metering |
| `021_organization_billing` | Plans / subscription columns |
| `022_notifications` | Notification settings + delivery log |
| `023_audit_logs` | Audit trail |
| `024_fix_membership_bootstrap_rls` | First-owner membership insert policies |

After push, confirm in Supabase Dashboard → **Database → Migrations** that the remote list matches local `supabase/migrations/`.

### Realtime publication

Migrations add tables to `supabase_realtime` for live KDS:

- `categories`, `items`, `modifiers`
- `draft_orders`
- `phone_order_receipts`

Verify: **Database → Publications → supabase_realtime** includes those tables. If missing:

```sql
alter publication supabase_realtime add table public.draft_orders;
alter publication supabase_realtime add table public.phone_order_receipts;
```

### Storage

Migration `015` creates private bucket `menu-uploads`. Confirm **Storage → menu-uploads** exists in production.

### Auth URLs

**Authentication → URL configuration**

| Setting | Production value |
|---------|------------------|
| Site URL | `https://your-domain.com` |
| Redirect URLs | `https://your-domain.com/auth/callback` |

---

## 2. Edge Function deploy

Six functions power ElevenLabs server tools:

| Function | Path |
|----------|------|
| `get-menu` | `/functions/v1/get-menu` |
| `get-restaurant-info` | `/functions/v1/get-restaurant-info` |
| `get-caller-history` | `/functions/v1/get-caller-history` |
| `submit-reservation-request` | `/functions/v1/submit-reservation-request` |
| `sync-draft-order` | `/functions/v1/sync-draft-order` |
| `finalize-order` | `/functions/v1/finalize-order` |
| `get-order-status` | `/functions/v1/get-order-status` |

From repo root (project linked):

```bash
./scripts/deploy-edge-functions.sh
```

Or manually:

```bash
supabase secrets set AGENT_TOOL_SIGNING_SECRET='…'   # same value as Next.js
# optional legacy fallback during migration:
# supabase secrets set AGENT_TOOL_SECRET='…'

supabase functions deploy get-menu --no-verify-jwt
supabase functions deploy get-restaurant-info --no-verify-jwt
supabase functions deploy get-caller-history --no-verify-jwt
supabase functions deploy submit-reservation-request --no-verify-jwt
supabase functions deploy sync-draft-order --no-verify-jwt
supabase functions deploy finalize-order --no-verify-jwt
supabase functions deploy get-order-status --no-verify-jwt
```

`verify_jwt = false` is set in `supabase/config.toml` because auth is **custom** (`roal1.*` token or `AGENT_TOOL_SECRET`) inside the handler—not Supabase user JWTs. The Supabase gateway still requires the **anon key** in the `apikey` header.

See [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md) and [ELEVENLABS.md](./ELEVENLABS.md).

### Edge secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Required | Notes |
|--------|----------|-------|
| `SUPABASE_URL` | Auto-injected | Do not override unless self-hosting |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Service role for writes |
| `AGENT_TOOL_SIGNING_SECRET` | **Yes** (preferred) | Must match Next.js |
| `AGENT_TOOL_SECRET` | Optional | Legacy bearer fallback |
| `STRIPE_SECRET_KEY` | If billing gates | Only for voice limit checks in Edge |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | If Stripe configured | Paired with above for Edge billing gate |

---

## 3. Environment variable checklist

Copy [.env.example](../.env.example) and set values on your **hosting provider** (not in git).

### Required — Next.js (build + runtime)

| Variable | Expose to browser? | Purpose |
|----------|-------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Realtime (RLS-scoped) |
| `GEMINI_API_KEY` | **No** | Menu scanner |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Server routes, health DB ping, menu clear |

### Required — voice / ElevenLabs (server only)

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | Connect agent, sync tools, patch agent |
| `ELEVENLABS_AGENT_ID` | Default agent when not set per restaurant |
| `ELEVENLABS_WEBHOOK_SECRET` | HMAC secret for ElevenLabs post-call transcript/outcome webhooks |

### Strongly recommended

| Variable | Purpose |
|----------|---------|
| `AGENT_TOOL_SIGNING_SECRET` | Mint `roal1.*` tokens on Connect agent |
| `NEXT_PUBLIC_APP_URL` | Canonical URLs, billing redirects, **Twilio personalization webhook** (`{APP_URL}/api/integrations/elevenlabs/conversation-init`) |
| `RESTAURANT_AGENT_TIMEZONE` | Agent prompt clock context |

### Optional

| Variable | Purpose |
|----------|---------|
| `GEMINI_MODEL` | Override Gemini model alias |
| `AGENT_TOOL_SECRET` | Legacy tool bearer (migrate off when possible) |
| `ELEVENLABS_SYNC_TOKEN` | Protect `POST /api/integrations/elevenlabs/sync-roal-tools` |
| `ELEVENLABS_CONVERSATION_INIT_SECRET` | Optional shared secret on `GET/POST …/conversation-init` (Connect appends `?secret=` to the ElevenLabs Phone URL) |
| `ROAL_ORDER_KB` | Set `0` to skip ElevenLabs knowledge doc |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing UI |
| `STRIPE_SECRET_KEY` | Billing + Edge voice limits |
| `STRIPE_WEBHOOK_SECRET` | Future Stripe webhooks |

### Never set in browser / never commit

- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `AGENT_TOOL_SIGNING_SECRET` / `AGENT_TOOL_SECRET`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`

---

## 4. Build command

```bash
npm ci
npm run lint
npm test
npm run build
```

Production start (self-hosted Node):

```bash
npm run start
# listens on PORT (default 3000)
```

### Hosting notes

**Vercel / Netlify**

- Framework preset: **Next.js**
- Build command: `npm run build`
- Output: Next.js default (`.next`)
- Netlify reads the repo [`netlify.toml`](../netlify.toml): build command `npm run build`, publish directory `.next`, Node `20`.
- Set all env vars in the dashboard **before** build; `NEXT_PUBLIC_*` are inlined at build time.
- Redeploy after any `NEXT_PUBLIC_*` change.

**Environment parity**

- Dashboard, Edge Functions, and ElevenLabs tool URLs must use the **same** Supabase `project-ref`.
- After deploy, open KDS → **Connect agent to this restaurant** so ElevenLabs receives baked URLs and signed tokens.

**Node / Docker**

- Use Node 20 LTS
- Run `npm run build` in CI; ship `.next` + `node_modules` or multi-stage Docker build
- Set `NODE_ENV=production`

---

## 5. Realtime configuration

Client: `getBrowserSupabase()` subscribes to `postgres_changes` on menu tables and `draft_orders` / `phone_order_receipts` (see `LiveMenuSidebar`, `LiveOrdersPanel`).

Checklist:

1. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match production project.
2. Tables are in `supabase_realtime` publication (see §1).
3. RLS allows authenticated members to `SELECT` rows they should see (`009_production_rls_policies.sql`).
4. Browser can open WebSocket to `wss://<project-ref>.supabase.co/realtime/v1` (no corporate firewall block).

If Realtime fails, KDS **Phone orders** falls back to polling every 6s and emits a `realtime_degraded` notification (hourly cap).

---

## 6. Secret rotation

Rotate on a schedule or after any suspected leak. Order matters.

### A. `AGENT_TOOL_SIGNING_SECRET` (preferred)

1. Generate new secret (≥32 random bytes, base64 or hex).
2. Set on **hosting** (Next.js) and **Supabase Edge secrets** to the **same** new value.
3. Deploy Edge Functions (`./scripts/deploy-edge-functions.sh`).
4. Redeploy Next.js.
5. For **each** restaurant: KDS → **Re-sync** (or Connect) to push new `Authorization: Bearer roal1.…` headers to ElevenLabs.
6. Remove old secret from password manager archives after confirming calls work.

### B. `AGENT_TOOL_SECRET` (legacy)

Same as above if still used. Prefer migrating to signed tokens only, then unset legacy secret on Edge and Next.js.

### C. `SUPABASE_SERVICE_ROLE_KEY`

1. Supabase Dashboard → **Settings → API → service_role → Roll key** (or create new project key if your plan supports rotation).
2. Update hosting env + confirm Edge auto-injected key (re-link project if self-managed).
3. Redeploy Next.js. No ElevenLabs re-sync required.

### D. `GEMINI_API_KEY` / `ELEVENLABS_API_KEY`

1. Create new key in provider console; disable old key after cutover.
2. Update hosting env only; redeploy Next.js.

### E. Supabase anon key

Rarely rotated. If required: update `NEXT_PUBLIC_SUPABASE_ANON_KEY`, rebuild frontend, update ElevenLabs tool `apikey` header via **Re-sync**.

Document rotation date and owner in your internal ops log (not in git).

---

## 7. Smoke-test checklist

**Automated (recommended):**

```bash
# Local dev on :3020 (or set SMOKE_BASE_URL)
npm run qa:deploy-smoke

# Production — after DNS/hosting live (LB-04 cleared)
SMOKE_BASE_URL=https://your-domain.com npm run qa:deploy-smoke
# or legacy bash script:
SMOKE_BASE_URL=https://your-domain.com npm run smoke
```

Manual checklist (full product path): **[E2E_SMOKE.md](./E2E_SMOKE.md)**.

Abbreviated deploy checks:

### Platform

- [ ] `GET /api/health` → `status` is `healthy` or `degraded` (not `unhealthy`)
- [ ] `checks.supabase_db.ok` is true
- [ ] `checks.edge_get_menu`, `edge_get_restaurant_info`, `edge_get_caller_history`, `edge_submit_reservation_request`, `edge_sync_draft_order`, `edge_finalize_order`, `edge_get_order_status` reachable
- [ ] `npm test` passed for this release (Vitest; no live DB required)

### Auth & dashboard

- [ ] Sign up / login → `/dashboard/restaurants`
- [ ] Create restaurant (org admin)
- [ ] Open KDS `/dashboard/restaurants/[id]`

### Menu & Realtime

- [ ] Upload menu image → extract → commit
- [ ] Second browser tab shows menu updates (Realtime) or within one poll cycle

### Voice & orders

- [ ] Connect ElevenLabs agent on KDS voice panel
- [ ] Test harness or live call: `get_menu_items` returns menu
- [ ] Test harness or live call: `get_restaurant_info` returns hours/address/prep-time facts
- [ ] Test harness or live call: `get_caller_history` returns returning-guest context for a known phone/name, or a safe not-found response
- [ ] Test harness or live call: `submit_reservation_request` saves a request and tells the guest staff must confirm
- [ ] `sync_draft_order` appears on KDS live cart
- [ ] `finalize_order` → receipt + kitchen queue
- [ ] `get_order_status` returns latest kitchen status for a known phone/session
- [ ] Accept → complete order; notification delivery log (dev console mode)

### Admin

- [ ] `/dashboard/admin` (org admin) loads health + sync status
- [ ] `/dashboard/analytics` shows usage when events exist

### Billing / gates

- [ ] `/dashboard/billing` loads plan (pilot: success-based pricing; self-serve checkout **off** in code)
- [ ] With Stripe keys configured: limits enforced when over quota (staging test org)

**Blockers:** [LAUNCH_BLOCKERS.md](./LAUNCH_BLOCKERS.md) — prod smoke blocked until **LB-04** (DNS/hosting).

---

## 8. Operator QA scripts (pre-cutover)

Requires `.env.local` + linked Supabase unless noted. Dev server on `:3020` for live HTTP checks.

| Script | Purpose |
|--------|---------|
| `npm run deploy:check` | Env + migration count gate |
| `npm run qa:deploy-smoke` | Health + public routes + auth entry |
| `npm run qa:responsive-sweep` | Mobile/tablet/desktop layout |
| `npm run qa:a11y-perf` | A11y landmarks + hydration |
| `npm run qa:error-states` | Sanitized error copy |
| `npm run qa:auth-security` | Open redirect + API 401 |
| `npm run qa:tenant-isolation` | Cross-org leak probe |
| `npm run ensure:signing-parity` | Signing secret Next ↔ Edge |
| `npm run resync:elevenlabs-all` | Re-sync all linked agents |

Full matrix: [TESTING.md](./TESTING.md). Launch status: [FINAL_LAUNCH_READINESS.md](./FINAL_LAUNCH_READINESS.md).

## Rollback

| Layer | Rollback |
|-------|----------|
| Next.js | Redeploy previous hosting build / git tag |
| Edge | `supabase functions deploy <name> --version <previous>` or redeploy from prior git SHA |
| Database | **Avoid** down migrations in prod; forward-fix with new migration |

---

## Related docs

- [FINAL_LAUNCH_READINESS.md](./FINAL_LAUNCH_READINESS.md) — launch queue + QA results
- [LAUNCH_BLOCKERS.md](./LAUNCH_BLOCKERS.md) — open blockers (LB-01, LB-04)
- [ELEVENLABS.md](./ELEVENLABS.md) — tool URLs, headers, Netlify parity
- [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md) — tokens, validation
- [RLS.md](./RLS.md) — tenant policies
- [TESTING.md](./TESTING.md) — `npm test`
- [AUTH.md](./AUTH.md) — auth flows
