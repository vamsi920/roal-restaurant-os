# ROAL — Restaurant Operational Abstraction Layer

Multi-tenant SaaS for restaurants: menu scan (Gemini) → review/commit, live KDS with Supabase Realtime, ElevenLabs phone orders via signed Edge tools, billing gates, analytics, and admin ops.

## Stack

- Next.js 14 (App Router, TypeScript)
- Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)
- Google Gemini (menu extraction)
- ElevenLabs Conversational AI + Supabase Edge tools
- Vitest for unit and API tests

## Quick start

```bash
cp .env.example .env
# Minimum: NEXT_PUBLIC_SUPABASE_*, GEMINI_API_KEY
# Recommended: SUPABASE_SERVICE_ROLE_KEY (KDS + server routes)
npm install
npm run dev
```

Open <http://localhost:3000> → sign up at `/signup` → complete onboarding or add a membership (see [docs/AUTH.md](docs/AUTH.md)).

Apply database migrations once (linked Supabase project):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/AUTH.md](docs/AUTH.md) | Sessions, roles, protected routes |
| [docs/RLS.md](docs/RLS.md) | Production RLS model and dev paths |
| [docs/TENANT_SCHEMA.md](docs/TENANT_SCHEMA.md) | Organizations, memberships, legacy POC org |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Wizard steps and helpers |
| [docs/ELEVENLABS.md](docs/ELEVENLABS.md) | Edge tool URLs, Connect agent, Netlify parity |
| [docs/AGENT_TOOL_SECURITY.md](docs/AGENT_TOOL_SECURITY.md) | `roal1.*` tokens, validation, idempotency |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Migrations `001`–`024`, Edge deploy, env, smoke tests |
| [docs/TESTING.md](docs/TESTING.md) | `npm test`, layout, CI notes |
| [docs/E2E_SMOKE.md](docs/E2E_SMOKE.md) | Manual browser smoke checklist |
| [docs/ENTERPRISE_READINESS.md](docs/ENTERPRISE_READINESS.md) | Maturity scorecard and gaps |

## Env vars (summary)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Realtime (RLS-scoped) |
| `GEMINI_API_KEY` | Menu scanner |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: health DB ping, menu clear, KDS fallbacks |
| `ELEVENLABS_API_KEY` | Voice agent connect/sync (server only) |
| `AGENT_TOOL_SIGNING_SECRET` | Per-restaurant Edge tool tokens (set on Edge too) |

Full list: [.env.example](.env.example) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Menu scan flow

```
POST /api/scanner/extract  → Gemini + menu_import row (review)
POST /api/scanner/commit   → merge_menu RPC after operator approval
POST /api/scanner/discard  → abandon import

Legacy: POST /api/scanner/process (deprecated; does not auto-merge)
```

Live menu updates via Realtime on `categories`, `items`, `modifiers`.

## Voice orders

Edge Functions: `get-menu`, `sync-draft-order`, `finalize-order`.  
KDS: **Connect agent to this restaurant** bakes URLs + `roal1.*` bearer. See [docs/ELEVENLABS.md](docs/ELEVENLABS.md).

## Commands

```bash
npm run dev              # local app
npm test                 # Vitest (no live Supabase required)
npm run lint && npm run build
npm run deploy:check     # ci + build; optional db push + edge deploy
npm run deploy:edge      # deploy three Edge functions
SMOKE_BASE_URL=https://your-app npm run smoke
```

## Production

- RLS: [docs/RLS.md](docs/RLS.md) — migration `009` (+ tenant `008`, membership bootstrap `024`)
- Deploy: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Health: `GET /api/health` (public; booleans only, no secrets)

## Project layout (high level)

```
app/                    # routes (marketing, dashboard, api)
components/             # UI including landing, KDS, admin
lib/                    # auth, billing, notifications, observability, …
supabase/migrations/    # 001–024 SQL
supabase/functions/     # ElevenLabs tools
tests/                  # unit + integration (Vitest)
docs/                   # runbooks (see table above)
```
