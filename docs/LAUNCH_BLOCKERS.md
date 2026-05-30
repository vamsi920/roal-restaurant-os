# Launch blockers

**Decision date:** 2026-05-30 · Launch finalization **40/40** + post-push recheck

Operator docs: [`DEPLOYMENT.md`](./DEPLOYMENT.md) · [`ELEVENLABS.md`](./ELEVENLABS.md) · [`TESTING.md`](./TESTING.md) · [`FINAL_LAUNCH_READINESS.md`](./FINAL_LAUNCH_READINESS.md)

---

## Launch decision (38/40)

| Question | Answer |
|----------|--------|
| **Code / CI ready?** | **Yes** — `npm run build` pass, `npx tsc --noEmit --pretty false` pass, focused voice/provision/menu-sync/phone-order QA green |
| **Pilot onboarding (signup → menu → KDS → test order, no live line)?** | **Yes** — product + Supabase + Edge verified; latest `main` pushed through `8bea5a2` |
| **Production day-one with live forwarded guest calls on `getroal.com`?** | **No** — **LB-01 (P0) open** |

### Why production phone onboarding is not ready

**LB-01 (P0) remains open.** From this QA host, `getroal.com` still does not resolve (DNS **NXDOMAIN / empty A/CNAME**, HTTP **000**, 2026-05-30 12:20 EDT). Until production hosting + DNS are live:

- Twilio / ElevenLabs personalization webhook cannot hit production `conversation-init`
- Live inbound call → `get_menu_items` **200** is not signed off in ElevenLabs logs
- Restaurants cannot safely forward rush-hour traffic to the production stack

**Product code is not the blocker** — automated phone-stack QA is **11/13**, with all code/tool layers passing. **Ops + human** must deploy/point DNS, re-sync agents if the production origin changes, and run one live Twilio test.

---

## Active blockers

| id | severity | title | owner | status | close when |
|----|----------|-------|-------|--------|------------|
| **LB-01** | **P0** | Production phone stack not signed off | **ops + human** | **open** | See [LB-01 actions](#lb-01--production-phone-stack-p0) |
| **LB-04** | P1 | Production deploy smoke not run | **ops + eng** | **open** (blocked by hosting) | See [LB-04 actions](#lb-04--production-deploy-smoke-p1) |

### LB-01 — Production phone stack (P0)

**Automated (local / QA) — code layers pass** (`npm run qa:lb01-phone-stack`, 2026-05-30):

| Layer | Result |
|-------|--------|
| Baked ROAL tools (3/3) | **pass** |
| ElevenLabs-exact `get_menu_items` | **HTTP 200**, 7 categories |
| Personalization webhook configured | **pass** (URL targets `NEXT_PUBLIC_APP_URL` + conversation-init) |
| `conversation-init` | **200** on local dev with `restaurant_id` match |
| Signing parity (LB-03) | **closed** — `npm run qa:lb03-signing-parity` **5/5** |
| Production DNS / HTTP | **fail** — `getroal.com` unresolved; production app HTTP skipped |

**Human actions to close (owner: ops + human):**

1. Deploy Next.js to production; point **`getroal.com`** (or update `NEXT_PUBLIC_APP_URL` to live origin).
2. Set production env on host + Supabase Edge: `npm run ensure:signing-parity` (or match `AGENT_TOOL_SIGNING_SECRET` manually); `npm run resync:elevenlabs-all`.
3. Re-run `npm run qa:lb01-phone-stack` — expect prod DNS + HTTP pass.
4. Place **one inbound Twilio test call** → confirm ElevenLabs logs show `get_menu_items` **HTTP 200**.

### LB-04 — Production deploy smoke (P1)

**Local — pass** (dev on `:3020`):

| Command | Result |
|---------|--------|
| `SMOKE_BASE_URL=http://localhost:3020 npm run smoke` | **6/6** |
| `public-route-smoke.mjs` | **11/11** |
| `auth-smoke` | **9/9** |
| `e2e-smoke` | **15/15** (signed-in skipped without `E2E_*`) |
| `npm run qa:deploy-smoke` | **6/8** |

**Production — fail:** `getroal.com` DNS/connect **000** → `SMOKE_BASE_URL=https://getroal.com npm run smoke` **0/5** (rechecked 2026-05-30).

**Actions to close (owner: ops + eng, after LB-01 step 1):**

1. `SMOKE_BASE_URL=https://getroal.com npm run smoke` → **6/6**
2. Optional: `E2E_EMAIL=… E2E_PASSWORD=… E2E_BASE_URL=https://getroal.com npm run e2e-smoke`
3. `npm run qa:deploy-smoke` → **8/8**
4. Manual checklist: [`DEPLOYMENT.md`](./DEPLOYMENT.md) §7

---

## Closed

| id | title | closed |
|----|-------|--------|
| **LB-03** | `AGENT_TOOL_SIGNING_SECRET` missing on Edge | **2026-05-23** (prompt 20/40) — local + Edge parity; `npm run qa:lb03-signing-parity` **5/5**; agents re-synced. Other envs: run `npm run ensure:signing-parity` before go-live. |

---

## Downgraded (not launch blockers)

| id | title | severity | note |
|----|-------|----------|------|
| **LB-02** | Self-serve Stripe checkout not shipped | P2 | **Pilot OK** — `STRIPE_CHECKOUT_ENABLED=false`; manual billing UI honest; onboarding unblocked. Re-open only if self-serve paid signup required before GA. |

---

## Non-blockers

Grouped for launch sign-off — no owner action required before **staged pilot** onboarding:

| Area | Status |
|------|--------|
| Uncommitted launch tree | **Closed** — launch tree pushed to `origin/main` through `8bea5a2`; only this doc update may be newer locally |
| Signed-in browser E2E | Optional — set `E2E_EMAIL` / `E2E_PASSWORD` or `scripts/bootstrap-e2e-smoke-user.mjs` |
| Demo MP4 / contact form persistence | Cosmetic |
| `MenuScanner` exhaustive-deps lint warning | Accepted |
| Privacy/terms draft pages | Pilot OK; counsel review before GA |
| Email/SMS notification delivery | Dev console only; providers not wired — pilot uses dashboard |
| Self-serve Stripe (LB-02) | Downgraded |

**Launch finalization 40/40:** pushed to `origin/main`; LB-01 still blocks production forwarded guest calls — see [`FINAL_LAUNCH_READINESS.md`](./FINAL_LAUNCH_READINESS.md) § Post-push readiness recheck.
