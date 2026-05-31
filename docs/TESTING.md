# Testing

ROAL uses [Vitest](https://vitest.dev/) for unit and integration-style tests. Tests run in Node (no browser) and use the `@/` path alias.

## Commands

```bash
npm test              # run all tests once (CI-friendly)
npm run test:watch    # watch mode
npm run test:coverage # text + html report in coverage/
```

Typical CI gate (matches `scripts/deploy-production.sh`):

```bash
npm run lint && npm test && npm run build
```

## Layout

```
tests/
  fixtures/       # Shared menu UUIDs and sample rows
  unit/           # Pure lib/ logic and sanitizers
  integration/    # API route handlers (mocked auth/Supabase)
vitest.config.ts
```

## What is covered

| Area | Examples |
|------|----------|
| Orders | Status transitions, cart validation, PATCH API |
| Agent tools | Zod schemas, auth scope, idempotency, order-status lookup |
| Billing | Gate evaluation, dev vs Stripe blocks |
| Notifications | Provider selection, redaction, delivery rows |
| Analytics | Aggregation, conversion %, FAQ/no-order location counts, menu-scan dedupe |
| Observability | Health sanitization, request IDs, log redaction |
| Admin ops | Role gate, ops error sanitization |
| Voice | Control center, harness scenarios, prompt rules, display-error redaction |
| ElevenLabs webhooks | Conversation-init active-call rows, HMAC signature validation, post-call event parsing, call-event outcome precedence, recording URL extraction |
| Staff handoff notifications | Post-call voicemail/handoff flag parsing, `staff_handoff_requested` notification idempotency |
| Call history / voicemail / follow-up inbox | Outcome rows, voicemail/handoff flag labels, voicemail inference, voicemail filter, transcript-summary and transcript-line surfacing, recording URL/duration links |
| Upsell analytics | Rule scoping, eligible-order detection, attach-rate calculation, attributed offer revenue, observed ticket lift, deterministic treatment/control lift |
| Restaurant profile / FAQ / upsell | Profile schema, handoff rules, knowledge text parsing, upsell rule parsing |
| Multi-location menus | Menu snapshot copy payload, additive inherited template payloads, field-level override diffs, target replacement path, agent auto-sync hook |
| Onboarding / nav | Wizard helpers, dashboard nav active state |

Integration tests mock `requireAuthContext`, `requireRestaurantAccess`, and `createServerSupabase` — no live database or API keys.

## Adding tests

1. Prefer **unit tests** under `tests/unit/` for `lib/` (no mocks).
2. For API routes, import the handler and mock auth/Supabase like `tests/integration/api-health.test.ts`.
3. Reuse UUIDs from `tests/fixtures/menu.ts` for Zod UUID rules.

## CI

`npm test` is safe in CI without Supabase credentials.

## Manual E2E smoke

Full browser checklist (signup → KDS → voice harness → dashboards): **[E2E_SMOKE.md](./E2E_SMOKE.md)**.

Quick automated curl checks: `SMOKE_BASE_URL=… npm run smoke` (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

### Playwright smoke

```bash
npm run dev   # fresh bundle if chunk 404s: rm -rf .next && npm run dev
npm run auth-smoke    # login/signup UI only (fake credentials)
npm run e2e-smoke     # auth + redirect + optional KDS (see E2E_SMOKE.md)
```

Optional signed-in KDS: `E2E_EMAIL=… E2E_PASSWORD=… npm run e2e-smoke` (never commit). Base URL: `E2E_BASE_URL` or argv.

Full checklist: **[E2E_SMOKE.md](./E2E_SMOKE.md)**.

## Launch QA scripts (live / HTTP)

Run from repo root with `.env.local` loaded (see `package.json` scripts). Most need `npm run dev` on `:3020`.

| Script | Scope |
|--------|--------|
| `npm run qa:deploy-smoke` | Health, public routes, auth entry |
| `npm run qa:responsive-sweep` | Layout at mobile/tablet/desktop |
| `npm run qa:a11y-perf` | Landmarks, hydration, reduced-motion |
| `npm run qa:error-states` | Sanitized user-facing errors |
| `npm run qa:auth-security` | Redirect guard, API 401 |
| `npm run qa:tenant-isolation` | Cross-org RLS probe |
| `npm run qa:notifications-live` | Settings + dispatch APIs |
| `npm run qa:analytics-live` | KPIs + empty states |
| `npm run qa:admin-ops-live` | Admin gate + health |
| `npm run qa:lb01-phone-stack` | Twilio + ElevenLabs wiring |
| `npm run qa:lb03-signing-parity` | Signed token → get-menu |
| `npm run qa:get-menu-elevenlabs` | Tool payload shape |
| `npm run qa:draft-finalize-elevenlabs` | Draft/finalize path; restaurant-info and status lookup are covered by schemas, health probes, and harness tests |
| `npm run ensure:signing-parity` | Write + mirror signing secret |

Deploy order and post-cutover smoke: **[DEPLOYMENT.md](./DEPLOYMENT.md)**. Blockers: **[LAUNCH_BLOCKERS.md](./LAUNCH_BLOCKERS.md)**.

## Not in scope (automated suite)

- Supabase Edge Functions (Deno) — smoke via `GET /api/health` + deployed curl
- Live Gemini / ElevenLabs in Playwright (scanner step mocks extract; harness not auto-run)
- Live Gemini / ElevenLabs API calls in Vitest
- Live `get_restaurant_info` / `get_caller_history` / `submit_reservation_request` / `get_order_status` phone lookup scripts — currently covered by schema parity, harness simulation, and health checks
