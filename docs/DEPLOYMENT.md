# Production deployment runbook

End-to-end guide for deploying ROAL (Next.js on Netlify + Firebase Auth + Cloud Firestore + ElevenLabs). No secrets are stored in this document — use your password manager and the Firebase / Netlify dashboards.

## Prerequisites

- Node.js 20+ and `npm ci`
- A Firebase project set up per **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** (Spark / free plan is fine)
- Netlify site connected to the repo (`netlify.toml`: `npm run build`, Node 20)
- Google AI Studio API key (menu scanner)
- ElevenLabs API key (voice agent connect/sync)

## Deployment order

```text
1. Firebase project ready        → docs/FIREBASE_SETUP.md (once)
2. Firestore rules deployed      → npx firebase-tools deploy --only firestore:rules
3. Set / rotate env on Netlify   → §2 below
4. Build & deploy                → git push (Netlify) or npm run build && npm run start
5. Post-deploy smoke tests       → npm run qa:deploy-smoke / npm run smoke
6. Per restaurant: Connect agent → KDS → voice panel (ElevenLabs sync)
```

There are **no database migrations**. Collections are created on first write; their defaults, unique keys and cascades live in code (`lib/db/schema.ts`). There is no separate edge/tool deployment either — the ElevenLabs tools are routes in this app (`/api/agent-tools/*`) and ship with every deploy.

Helper (lint + tests + build, then optional rules deploy):

```bash
./scripts/deploy-production.sh     # same as npm run deploy:check
```

---

## 1. Firestore rules

`firestore.rules` denies every client read and write: browsers never talk to Firestore, only the server does (Admin SDK, which bypasses rules). Tenant scoping is enforced in server code (`lib/auth/context-server.ts`). Deploy the rules once per project and whenever the file changes:

```bash
cp .firebaserc.example .firebaserc        # set "default" to your project id
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

`firestore.indexes.json` is intentionally empty — the data layer only pushes down equality / `in` filters (no composite indexes needed) and sorts in memory. Deploy it with `--only firestore` if you ever add one.

### Files

The scanner keeps the extracted menu on the `menu_imports` document; original photos are not stored (no Cloud Storage bucket needed on the free plan).

---

## 2. Environment variable checklist

Set on **Netlify → Site configuration → Environment variables** (and in `.env.local` for local live testing). `NEXT_PUBLIC_*` values are inlined at **build** time — redeploy after changing them.

### Required — Firebase

| Variable | Where it comes from |
|----------|---------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase → Project settings → Your apps → Web app config `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same config, `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same config, `projectId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same config, `appId` |
| `FIREBASE_SERVICE_ACCOUNT` | Project settings → Service accounts → Generate new private key; the whole JSON on **one line**. Server only. |

If `NEXT_PUBLIC_FIREBASE_API_KEY` or `FIREBASE_SERVICE_ACCOUNT` is missing, the app is in **demo mode**. Production builds then refuse sign-in instead of silently using demo data, unless `ROAL_DEMO_MODE=1` is set on purpose (e.g. a public demo site).

### Required — app + voice

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public origin, e.g. `https://getroal.com` (canonicals, Twilio webhook, agent tool URLs) |
| `OPENAI_API_KEY` | Menu scanner |
| `ELEVENLABS_API_KEY` | Voice agent connect/sync (server only) |
| `ELEVENLABS_AGENT_ID` | Template agent cloned per restaurant |
| `AGENT_TOOL_SIGNING_SECRET` | Mints per-restaurant `roal1.*` tool tokens (long random string) |

### Strongly recommended

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_WEBHOOK_SECRET` | Post-call webhook HMAC |
| `ELEVENLABS_CONVERSATION_INIT_SECRET` | Protects the Twilio personalization webhook |
| `GOOGLE_PLACES_API_KEY` | Restaurant lookup in magic onboarding |
| `RESTAURANT_AGENT_TIMEZONE` | Agent clock, e.g. `America/Chicago` |

### Optional

| Variable | Purpose |
|----------|---------|
| `ROAL_AGENT_TOOLS_BASE_URL` | Override the public https origin ElevenLabs calls for tools (tunnels, staging) |
| `ROAL_DEMO_MODE=1` | Force demo mode |
| `ROAL_DEMO_DB_FILE` | Demo store file (`off` = memory only) |
| `AGENT_TOOL_SECRET` | Legacy global tool bearer |
| `ELEVENLABS_TRIAL_AGENT_ID`, `TRIAL_DAILY_CALL_CAP` | Try-a-call trial |
| `ELEVENLABS_AGENT_PHONE_NUMBER_ID` | Outbound owner test calls |
| `PLATFORM_ADMIN_EMAIL` | Platform admin console access |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Planned billing |

### Never set in browser / never commit

- `FIREBASE_SERVICE_ACCOUNT` (never `NEXT_PUBLIC_`), `.firebaserc` is git-ignored
- `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, `AGENT_TOOL_SIGNING_SECRET`, Stripe secrets

Full annotated list: [`.env.example`](../.env.example).

---

## 3. Build command

```bash
npm ci
npm run lint
npm test
npm run build
npm run start   # listens on PORT (default 3000) when not on Netlify
```

### Hosting notes

- **Netlify** builds with `npm run build` (Next.js runtime plugin). Route handlers that use the Admin SDK run on Node (`export const runtime = "nodejs"`); `middleware.ts` only checks cookie presence.
- Add the production domain to **Firebase → Authentication → Settings → Authorized domains**, or Google sign-in popups fail.
- ElevenLabs must reach `NEXT_PUBLIC_APP_URL` over **https**; production builds refuse to bake a non-https tool base.

---

## 4. Secret rotation

### A. `AGENT_TOOL_SIGNING_SECRET` (preferred)

1. Set the new value on Netlify and redeploy.
2. **Re-sync** every restaurant (`npm run resync:elevenlabs-all` or KDS **Sync now**) so ElevenLabs tool headers get freshly minted `roal1.*` tokens.

### B. `AGENT_TOOL_SECRET` (legacy)

Rotate the same way; only dynamic (non-baked) tools use it.

### C. `FIREBASE_SERVICE_ACCOUNT`

1. Firebase → Project settings → Service accounts → **Generate new private key**.
2. Replace the env value (one line) on Netlify and in `.env.local`; redeploy.
3. Google Cloud console → IAM → Service accounts → the Firebase Admin SDK account → **Keys**: delete the old key.

Existing session cookies stay valid (they are signed by Firebase, not by the key).

### D. `OPENAI_API_KEY` / `ELEVENLABS_API_KEY`

Replace on Netlify, redeploy; for ElevenLabs re-run Connect if the workspace changed.

### E. Firebase web config

The `NEXT_PUBLIC_FIREBASE_*` values are public identifiers, not secrets; abuse is limited by Authorized domains and the deny-all Firestore rules.

---

## 5. Smoke-test checklist

**Automated (recommended):**

```bash
# Local dev on :3020 (or set SMOKE_BASE_URL)
npm run qa:deploy-smoke

# Production
SMOKE_BASE_URL=https://your-domain.com npm run qa:deploy-smoke
# or the bash script:
SMOKE_BASE_URL=https://your-domain.com npm run smoke
```

Manual checklist (full product path): **[E2E_SMOKE.md](./E2E_SMOKE.md)**.

### Platform

- [ ] `GET /api/health` → `status` is `healthy` or `degraded` (not `unhealthy`)
- [ ] `checks.database.details.firestore` is true (false = demo store)
- [ ] `checks.env_public.details.firebase_configured` is true
- [ ] `checks.agent_tools.details.public_https_origin` is true
- [ ] `npm test` passed for this release (Vitest; no Firebase required)

### Auth & dashboard

- [ ] Sign up with email/password and with Google → `/dashboard`
- [ ] Sign out, sign back in, "remember me" off → session ends with the browser
- [ ] Create restaurant (org admin); open KDS `/dashboard/restaurants/[id]`

### Menu

- [ ] Upload menu image → extract → commit
- [ ] Second browser tab shows menu updates within one poll cycle

### Voice & orders

- [ ] Connect ElevenLabs agent on KDS voice panel; tool URLs start with `NEXT_PUBLIC_APP_URL/api/agent-tools/`
- [ ] Test harness or live call: `get_menu_items` returns menu
- [ ] `get_restaurant_info` returns hours/address/prep-time facts
- [ ] `get_caller_history` returns returning-guest context or a safe not-found response
- [ ] `submit_reservation_request` saves a request and tells the guest staff must confirm
- [ ] `sync_draft_order` appears on KDS live cart
- [ ] `finalize_order` → receipt + kitchen queue
- [ ] `get_order_status` returns latest kitchen status for a known phone/session
- [ ] Accept → complete order; notification delivery log (dev console mode)

### Admin

- [ ] `/dashboard/admin` (platform admin) loads health + sync status
- [ ] `/dashboard/analytics` shows usage when events exist

### Billing / gates

- [ ] `/dashboard/billing` loads plan (pilot: success-based pricing; self-serve checkout **off** in code)

**Blockers:** [LAUNCH_BLOCKERS.md](./LAUNCH_BLOCKERS.md).

---

## 6. Operator QA scripts (pre-cutover)

Live scripts read `.env` + `.env.local`. Scripts that inspect data need `FIREBASE_SERVICE_ACCOUNT` (the notifications / analytics / admin-ops QA scripts refuse to run against the demo store). Dev server on `:3020` for live HTTP checks.

| Script | Purpose |
|--------|---------|
| `npm run deploy:check` | Lint + tests + build, optional rules deploy |
| `npm run qa:deploy-smoke` | Health + public routes + auth entry |
| `npm run qa:responsive-sweep` | Mobile/tablet/desktop layout |
| `npm run qa:a11y-perf` | A11y landmarks + hydration |
| `npm run qa:error-states` | Sanitized error copy |
| `npm run qa:auth-security` | Open redirect + API 401 + no server secrets in client modules |
| `npm run qa:phone-order-kds` | Signed tool calls: draft → finalize → kitchen queue |
| `npm run qa:lb01-phone-stack` | Phone stack (personalization webhook, baked tools) |
| `npm run resync:elevenlabs-all` | Re-sync all linked agents |

Full matrix: [TESTING.md](./TESTING.md).

## Rollback

| Layer | Rollback |
|-------|----------|
| App (incl. agent tools) | Netlify → Deploys → publish the previous deploy, or redeploy a prior git tag |
| Firestore rules | `git checkout <sha> -- firestore.rules && npx firebase-tools deploy --only firestore:rules` |
| Data | Firestore has no schema migrations; fix forward. For disaster recovery enable scheduled exports (Blaze plan) or point-in-time recovery. |

---

## Related docs

- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) — one-time Firebase project setup
- [ELEVENLABS.md](./ELEVENLABS.md) — tool URLs, tunnels, Netlify checklist
- [AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md) — tokens, validation
- [TENANT_SCHEMA.md](./TENANT_SCHEMA.md) — collections + tenant scoping
- [AUTH.md](./AUTH.md) — auth flows
- [TESTING.md](./TESTING.md) — `npm test`
- [LAUNCH_BLOCKERS.md](./LAUNCH_BLOCKERS.md) — open blockers
