# ROAL Enterprise Readiness

**Last updated:** 2026-05-19 (final regression QA #34)  
**Repo:** `restaurant-agent` — Next.js 14 + Supabase + Gemini + ElevenLabs  
**Verdict:** **Sellable managed pilot / early SaaS** — auth, tenancy, RLS, onboarding, menu ops, KDS, voice, billing gates (dev + Stripe-ready), analytics, notifications, observability, tests, and deployment runbook are in place. **Not** full self-serve enterprise without live Stripe, WAF rate limits, and automated E2E in CI.

---

## Final regression (2026-05-19)

| Check | Result |
|-------|--------|
| `npm run lint` | Pass (no ESLint warnings) |
| `npm test -- --run` | Pass — **34 files, 154 tests** |
| `npm run build` | Pass — Next.js 14.2.35 production build |
| Supabase migrations (remote `mnkabwcbdxruefzuvuuv`) | **24 applied** — `001` through `023` + `fix_membership_bootstrap_rls` (`024`) |
| Supabase Edge Functions (same project) | **ACTIVE:** `get-menu` (v5), `sync-draft-order` (v6), `finalize-order` (v6); `verify_jwt: false` (custom tool auth) |

**Post-QA deploy reminder:** Re-run `./scripts/deploy-edge-functions.sh` after any change to `supabase/functions/` or shared `_shared/` auth/schema code so remote versions match the repo.

**Manual product smoke:** [E2E_SMOKE.md](./E2E_SMOKE.md) · curl subset: `SMOKE_BASE_URL=… npm run smoke`

---

## Executive summary

| Area | Maturity | Notes |
|------|----------|-------|
| Core product (menu + KDS + voice) | **High** | Scan → review → commit, kitchen queue, ElevenLabs tools |
| Multi-tenant SaaS | **Medium–High** | Orgs, memberships, RLS; admin ops for org admins |
| Production security | **Medium** | RLS + signed tool tokens; public health sanitized |
| Go-to-market | **Medium** | Landing, pricing, demo, security, contact |
| Billing / usage | **Medium** | Plans, gates, meters; Stripe live + invoices TBD |
| Tests / CI | **Medium–High** | 154 Vitest tests; manual E2E checklist; no Playwright in CI |
| Observability | **Medium** | `/api/health`, audit logs, request IDs, admin snapshot |
| Deployment | **Medium–High** | Runbook, deploy/smoke scripts; remote DB in sync |

**Remaining stop-ship for wide self-serve SaaS:**

1. **CDN/WAF rate limiting** on `/api/scanner/*` and auth routes.
2. **Live Stripe** — checkout, webhooks, customer portal, real invoices.
3. **CI pipeline** — `lint` + `test` + `build` on every PR (commands verified locally).
4. **Playwright (or equivalent)** in CI — manual path exists in [E2E_SMOKE.md](./E2E_SMOKE.md).

---

## What ships today

### Stack

- Next.js 14 App Router, TypeScript, Tailwind, Vitest
- Supabase: Postgres (migrations `001`–`024`), Realtime, Storage (`menu-uploads`), Edge Functions
- Gemini menu extraction with Zod + **review/commit** flow
- ElevenLabs agent sync, signed `roal1.*` tool auth, voice control center + test harness

### Product flows

| Flow | Route / surface |
|------|-----------------|
| Marketing | `/`, `/pricing`, `/demo`, `/security`, `/contact` |
| Auth | `/login`, `/signup`, `/auth/callback`, protected `/dashboard/*` |
| Onboarding | `/dashboard/onboarding` wizard |
| Restaurants | `/dashboard/restaurants`, org-scoped create |
| KDS | `/dashboard/restaurants/[id]` — menu RT, scanner, orders, voice |
| Menu editor | `/dashboard/restaurants/[id]/menu` |
| Settings | Profile, hours, notifications |
| Billing | `/dashboard/billing` — plan, usage, gates |
| Analytics | `/dashboard/analytics` — KPIs, trends, popular items |
| Admin ops | `/dashboard/admin` — health, sync, errors (org admin only) |
| Support | `/dashboard/support` — runbooks |

### Security (current)

```
User → Supabase Auth JWT → RLS (org / membership / role)
ElevenLabs → Edge (signed roal1 token or legacy bearer) → service role → scoped restaurant_id
Next.js API → session checks + billing gates + audit on key mutations
GET /api/health → sanitized env flags only (no secret values)
```

See `docs/RLS.md`, `docs/AGENT_TOOL_SECURITY.md`, `docs/DEPLOYMENT.md`.

### Tests & quality

- `npm test` — 154 Vitest tests
- `npm run lint` / `npm run build` — green on 2026-05-19 regression
- `docs/TESTING.md`, `docs/E2E_SMOKE.md`

### Deployment

- `docs/DEPLOYMENT.md` — `supabase db push`, Edge deploy, env checklist
- `npm run deploy:check`, `deploy:edge`, `smoke`

---

## Area scorecard

| Area | Score | Status |
|------|-------|--------|
| Auth / tenancy | **4/5** | Auth UI, orgs, RLS, restaurant access helpers |
| Onboarding | **4/5** | Wizard + progress; profile + hours feed agent |
| Billing | **3/5** | Plans, gates, usage; Stripe live + invoices TBD |
| Menu ops | **4/5** | Editor, import review, audits, hours |
| Voice reliability | **4/5** | Control center, harness, Zod on Edge, signed tokens |
| Order ops | **4/5** | Kitchen statuses, actions, totals, detail modal |
| Security | **3.5/5** | RLS + tokens; rate limits + SOC2 narrative TBD |
| Observability | **3.5/5** | Health (sanitized), audit, admin snapshot |
| Tests | **3.5/5** | 154 automated; manual E2E doc; no Playwright CI |
| Deployment | **4/5** | Runbook + scripts; remote migrations aligned |
| Marketing / UX | **4/5** | Full funnel |
| Support | **3.5/5** | In-app runbooks |

---

## Known gaps (final)

### P0 — Before wide self-serve launch

| Gap | Effort | Notes |
|-----|--------|-------|
| CDN/WAF rate limits | S | Edge/CDN on scanner + auth |
| Stripe live billing | M | Checkout, webhooks, portal |
| GitHub Actions CI | S | `lint`, `test`, `build` on PR |
| Playwright in CI | M | Automate [E2E_SMOKE.md](./E2E_SMOKE.md) |

### P1 — Operator excellence

| Gap | Effort | Notes |
|-----|--------|-------|
| Email/SMS notifications | M | Providers stubbed; dev console only |
| Scanner batch / PDF | M | Single-image flow today |
| Audit log UI | M | `audit_logs` table; admin shows recent errors only |
| Edge redeploy discipline | S | Redeploy functions after tool/auth/schema changes |

### P2 — Enterprise

| Gap | Effort | Notes |
|-----|--------|-------|
| SSO (SAML/OIDC) | L | Supabase Enterprise or custom |
| SOC2 / security pack | L | Policies + pen test narrative |

### QA wave (#15–#34) — addressed in repo

Analytics dedupe, notification redaction, health secret sanitization, admin ops gate, billing gate math, agent tool auth/idempotency, usage metering on failed tools, voice harness scenarios, docs/runbook alignment — covered by code + tests above. **Not** a substitute for production monitoring or pen testing.

---

## Recommended go-to-market

**Now:** Managed pilot — menu review, one agent per location, weekly `/api/health` + admin ops.

**Next:** Self-serve Starter when Stripe + rate limits + CI E2E are green.

---

## File reference

| Concern | Primary files |
|---------|----------------|
| Auth / RLS | `lib/auth/`, `009_production_rls_policies.sql`, `024_fix_membership_bootstrap_rls.sql` |
| Billing | `lib/billing/`, `021_organization_billing.sql` |
| Notifications | `lib/notifications/`, `022_notifications.sql` |
| Observability | `lib/observability/`, `app/api/health/route.ts`, `023_audit_logs.sql` |
| Edge tools | `supabase/functions/`, `docs/ELEVENLABS.md` |
| Deployment | `docs/DEPLOYMENT.md`, `scripts/deploy-*.sh` |
| Tests / E2E | `tests/`, `docs/TESTING.md`, `docs/E2E_SMOKE.md` |

---

## Changelog

| Date | Event |
|------|--------|
| 2026-05-18 | Initial audit; enterprise build tasks #2–#40 |
| 2026-05-19 | Docs QA (#32), E2E checklist (#33), QA fixes (#15–#31) |
| 2026-05-19 | Final regression (#34): lint/test/build green; remote migrations + Edge verified |
