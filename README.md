# ROAL — The AI phone host for restaurants

Paste a restaurant link, talk to its AI phone host in the browser a minute later, claim it, forward the number. Multi-tenant SaaS: magic onboarding (website/Maps link → host builds itself), menu scan (OpenAI) → review/commit, live KDS, ElevenLabs phone orders via signed agent tools served by this app, call history + transcripts, unanswered-question FAQ inbox, billing gates, analytics, and admin ops.

## Stack

- Next.js 14 (App Router, TypeScript), deployed on Netlify
- Firebase Auth (Google + email/password) with httpOnly session cookies
- Cloud Firestore via the Firebase Admin SDK (server only) — `lib/db` keeps a small query-builder API over it
- Demo mode: no keys → local demo owner + in-memory store (persisted to `.data/demo-db.json`)
- OpenAI gpt-5.4-mini via Chat Completions (menu, website and call-insight extraction)
- ElevenLabs Conversational AI, calling the app's own `/api/agent-tools/*` routes
- Vitest for unit and API tests

## Quick start (demo mode — no keys)

```bash
npm install
npm run dev
```

Open <http://localhost:3000> → **Sign in** → **Continue as demo owner**. You are the demo owner ("Maria Rossi") with a seeded demo restaurant. Nothing leaves your machine: data lives in memory and is saved to `.data/demo-db.json` (delete the file to reset; `ROAL_DEMO_DB_FILE=off` to keep it in memory only).

Optional extras in demo mode: `OPENAI_API_KEY` (menu scan), `ELEVENLABS_API_KEY` + `ELEVENLABS_AGENT_ID` (voice agent), `GOOGLE_PLACES_API_KEY` (restaurant lookup). Copy `.env.example` to `.env.local` and fill in what you need.

## Going live (Firebase)

1. Follow [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md): create a Firebase project, enable Email/Password + Google sign-in, create Firestore, copy the web config into `NEXT_PUBLIC_FIREBASE_*`, and paste a service-account JSON (one line) into `FIREBASE_SERVICE_ACCOUNT`.
2. Deploy the locked-down Firestore rules: `npx firebase-tools deploy --only firestore:rules`.
3. Set the same env vars on Netlify ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)). There are no database migrations — collections are created on first write.

As soon as both `NEXT_PUBLIC_FIREBASE_API_KEY` and `FIREBASE_SERVICE_ACCOUNT` are set, demo mode switches off and real accounts + Firestore are used.

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) | Founder steps: Firebase project, auth providers, Firestore, keys, rules |
| [docs/AUTH.md](docs/AUTH.md) | Session cookies, Google + email/password, demo mode, roles |
| [docs/TENANT_SCHEMA.md](docs/TENANT_SCHEMA.md) | Firestore collections, document ids, tenant scoping |
| [docs/MAGIC_ONBOARDING.md](docs/MAGIC_ONBOARDING.md) | Try-a-call trial pipeline, claim flow, persona, FAQ inbox |
| [docs/ELEVENLABS.md](docs/ELEVENLABS.md) | Agent tool URLs (`/api/agent-tools/*`), Connect agent, tunnels |
| [docs/AGENT_TOOL_SECURITY.md](docs/AGENT_TOOL_SECURITY.md) | `roal1.*` tokens, validation, idempotency |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Netlify + Firebase env, rules deploy, smoke tests |
| [docs/TESTING.md](docs/TESTING.md) | `npm test`, layout, CI notes |
| [docs/E2E_SMOKE.md](docs/E2E_SMOKE.md) | Manual browser smoke checklist |
| [docs/COMPETITOR_FEATURES.md](docs/COMPETITOR_FEATURES.md) | What we borrowed from competitors (internal) |
| [docs/ENTERPRISE_READINESS.md](docs/ENTERPRISE_READINESS.md) | Maturity scorecard and gaps |

## Env vars (summary)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` | Firebase web config for browser sign-in (blank = demo mode) |
| `FIREBASE_SERVICE_ACCOUNT` | Server-only service-account JSON on one line: Firestore + session cookies |
| `ROAL_DEMO_MODE=1` | Force demo mode (even in production builds) |
| `ROAL_DEMO_DB_FILE` | Demo store file (default `.data/demo-db.json`; `off` = memory only) |
| `NEXT_PUBLIC_APP_URL` | Public origin (canonicals, Twilio webhook, default agent-tools base) |
| `ROAL_AGENT_TOOLS_BASE_URL` | Public https origin ElevenLabs calls for tools (tunnel in local dev) |
| `OPENAI_API_KEY` | Menu scanner |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` | Voice agent connect/sync (server only) |
| `AGENT_TOOL_SIGNING_SECRET` | Per-restaurant `roal1.*` agent tool tokens |

Full list: [.env.example](.env.example) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Menu scan flow

```
POST /api/scanner/extract  → OpenAI + menu_imports doc (review)
POST /api/scanner/commit   → merge menu after operator approval
POST /api/scanner/discard  → abandon import

Legacy: POST /api/scanner/process (deprecated; does not auto-merge)
```

## Voice orders

ElevenLabs webhook tools call this app: `/api/agent-tools/get-menu`, `sync-draft-order`, `finalize-order`, `get-order-status`, `get-restaurant-info`, `get-caller-history`, `submit-reservation-request`.
KDS: **Connect agent to this restaurant** bakes the URLs + a `roal1.*` bearer into the agent. ElevenLabs must reach a public https origin — in local dev use a tunnel and `ROAL_AGENT_TOOLS_BASE_URL`. See [docs/ELEVENLABS.md](docs/ELEVENLABS.md).

## Commands

```bash
npm run dev              # local app (demo mode without Firebase keys)
npm test                 # Vitest (in-memory db; no Firebase needed)
npm run lint && npm run build
npm run deploy:check     # ci + build; optional Firestore rules deploy
SMOKE_BASE_URL=https://your-app npm run smoke
npx firebase-tools deploy --only firestore:rules
```

## Production

- Firestore rules deny all client access; the server (Admin SDK) is the only reader/writer, and tenant scoping lives in `lib/auth/context-server.ts`.
- Deploy: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Health: `GET /api/health` (public; booleans only, no secrets)

## Project layout (high level)

```
app/                    # routes (marketing, dashboard, api, api/agent-tools)
components/             # UI including landing, KDS, admin
lib/db/                 # getDb(): Firestore or in-memory demo store; schema.ts = collections
lib/firebase/           # Admin + client SDK singletons
lib/auth/               # session cookies, demo mode, tenant access
lib/agent-tools/        # ElevenLabs tool tokens, base URL, handlers
tests/                  # unit + integration (Vitest)
docs/                   # runbooks (see table above)
firebase.json           # Firestore rules + indexes for firebase-tools
```
