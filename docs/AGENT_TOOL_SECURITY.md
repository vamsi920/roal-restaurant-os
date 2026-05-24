# Agent tool security (ElevenLabs → Supabase Edge)

ROAL voice-agent tools (`get-menu`, `sync-draft-order`, `finalize-order`) accept authenticated webhook calls from ElevenLabs. This document describes the production auth and validation design.

## Authentication modes

| Mode | `Authorization` header | Scope | When used |
|------|------------------------|-------|-----------|
| **Signed token (preferred)** | `Bearer roal1.<payload>.<sig>` | Single `restaurant_id` (+ optional `agent_id`) | After **Connect agent to this restaurant** on the KDS |
| **Legacy global secret** | `Bearer <AGENT_TOOL_SECRET>` | Any connected restaurant | Dynamic (non-baked) tools; migration fallback |

### Signed token (`roal1.*`)

- Minted in Next.js on **Connect / Re-sync** via `mintAgentToolToken()`.
- Claims: `rid` (restaurant UUID), `exp` / `iat`, `jti`, optional `aid` (ElevenLabs agent id).
- Signed with **HMAC-SHA256** using `AGENT_TOOL_SIGNING_SECRET`, or `AGENT_TOOL_SECRET` if signing secret is unset.
- Default TTL: **90 days** (re-sync refreshes tokens in ElevenLabs tool headers).

Edge verifies:

1. Signature and expiry  
2. Token `rid` matches `restaurant_id` from query/body/header (`x-roal-restaurant-id`)  
3. If token includes `aid`, it matches `restaurant_profiles.elevenlabs_agent_id`

### Legacy secret

- Timing-safe compare to `AGENT_TOOL_SECRET`.
- **Requires** `restaurant_profiles.elevenlabs_agent_id` (agent connected on KDS).
- `restaurant_id` must be consistent across body, query, and `x-roal-restaurant-id` when more than one is present.

## Restaurant ownership

Before any write/read:

1. Restaurant row exists.  
2. Signed: token restaurant matches request identifiers.  
3. Legacy: profile has a connected ElevenLabs agent id.

This blocks arbitrary UUID probing with a leaked global secret once agents are per-restaurant.

## Request validation (Zod)

Strict **Zod** schemas in `supabase/functions/_shared/agent-tool-zod.ts` (mirrored in `lib/agent-tools/schemas.ts` for the test harness):

| Tool | Request schema | Response schema |
|------|----------------|-----------------|
| `get_menu_items` | `GetMenuQuerySchema` / `GetMenuPostBodySchema` | `GetMenuResponseSchema` |
| `sync_draft_order` | `SyncDraftOrderRequestSchema` | `SyncDraftOrderResponseSchema` |
| `finalize_order` | `FinalizeOrderRequestSchema` | `FinalizeOrderResponseSchema` |

Failed requests return **HTTP 400** with:

```json
{
  "error": "validation_failed",
  "code": "validation_failed",
  "message": "sync_draft_order request failed validation.",
  "issues": [
    {
      "path": "session_id",
      "code": "too_small",
      "message": "session_id is required",
      "suggestion": "Use the ElevenLabs conversation id as session_id..."
    }
  ],
  "recovery_hint": "Use a stable session_id before sync_draft_order or finalize_order."
}
```

Unknown JSON keys are rejected (`.strict()`). `restaurant_id` in the body must match the authenticated scope. Missing `session_id`, `customer_name`, or `customer_phone` are never accepted silently.

## Deterministic order validation

After Zod parsing, `sync_draft_order` and `finalize_order` validate the cart against the live menu (`lib/orders/validate-cart.ts`, Edge: `_shared/order-validate.ts`):

- Stale or unknown `item_id` / name mismatch  
- Sold-out (`is_available: false`) items  
- Invalid or missing modifiers (per group `min_selection` / `max_selection`)  
- Quantities outside 1–99  
- Placeholder guest name/phone on finalize  

Failures return **HTTP 422** (`order_validation_failed`) or **400** (`customer_validation_failed`) with per-line `issues[].suggestion`. Valid lines are stored with canonical `item_id`, `name`, `quantity`, and `customizations`.

## Replay / idempotency

For `sync_draft_order` and `finalize_order`:

- Send **`x-roal-idempotency-key`** (or JSON `idempotency_key`), max 128 chars.  
- Same `(restaurant_id, key)` within **24 hours** returns the cached JSON response.  
- Response header: `x-roal-idempotent-replay: true` on cache hits.

Table: `public.agent_tool_idempotency` (migration `019_agent_tool_idempotency.sql`).

ElevenLabs retries and duplicate webhooks should reuse the same key per logical tool call (e.g. conversation id + tool name + cart revision).

## Headers reference

| Header | Required | Purpose |
|--------|----------|---------|
| `apikey` | Yes (Supabase gateway) | Publishable anon key |
| `Authorization` | Yes | `roal1.*` token or legacy secret |
| `x-roal-restaurant-id` | Baked tools | Restaurant UUID (must match token/body) |
| `x-roal-idempotency-key` | Optional | Replay protection on POST tools |
| `Content-Type` | POST | `application/json` |

## Secret rotation

### Rotate signing secret (recommended path)

1. Generate a new `AGENT_TOOL_SIGNING_SECRET` (32+ random bytes).  
2. Set in **both** places:
   - Next.js env (Netlify/local)  
   - Supabase Edge secrets: `supabase secrets set AGENT_TOOL_SIGNING_SECRET='...'`  
3. Keep the **old** secret in Edge only as `AGENT_TOOL_SIGNING_SECRET_PREVIOUS` is **not** implemented yet — plan a short maintenance window.  
4. Run **Re-sync** (or Connect) for **each** restaurant so ElevenLabs receives new `roal1.*` tokens.  
5. Remove the old value from Next.js and Edge after all agents are re-synced.

### Rotate legacy `AGENT_TOOL_SECRET`

1. Set new secret in Supabase Edge and Next.js.  
2. Re-sync all agents (updates ElevenLabs headers).  
3. Revoke the old secret in Supabase immediately after sync completes.

### Compromise response

1. Rotate `AGENT_TOOL_SIGNING_SECRET` and `AGENT_TOOL_SECRET`.  
2. Re-sync every connected agent.  
3. Review `draft_orders` / `phone_order_receipts` for suspicious `session_id` patterns.  
4. Truncate `agent_tool_idempotency` if needed:  
   `delete from public.agent_tool_idempotency where created_at < now() - interval '1 day';`

## Deploy checklist

```bash
supabase db push   # applies 019_agent_tool_idempotency
supabase secrets set AGENT_TOOL_SIGNING_SECRET='...'
# optional legacy fallback during migration:
supabase secrets set AGENT_TOOL_SECRET='...'
supabase functions deploy get-menu --no-verify-jwt
supabase functions deploy sync-draft-order --no-verify-jwt
supabase functions deploy finalize-order --no-verify-jwt
```

Then on each restaurant KDS: **Re-sync** voice agent.

## Optional: Next.js proxy (not required)

You may front Edge with `/api/agent-tools/...` so ElevenLabs never holds even a per-restaurant token. ROAL’s default is **direct Edge + signed token** to avoid extra latency. See `docs/ELEVENLABS.md` for URLs.

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `AGENT_TOOL_SIGNING_SECRET` | Next.js + Edge | HMAC for `roal1.*` tokens |
| `AGENT_TOOL_SECRET` | Next.js + Edge | Legacy global bearer; signing fallback |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js → ElevenLabs `apikey` header | Supabase gateway only |

Never expose `SUPABASE_SERVICE_ROLE_KEY` to ElevenLabs.

## Twilio phone calls (tools vs conversation variables)

After **Connect agent to this restaurant**, ROAL **bakes** `restaurant_id` into Edge tool URLs and `x-roal-restaurant-id` so **tool calls do not depend** on Twilio session dynamic variables (see prompt 29 / `syncRoalElevenLabsTools`).

Separately, ElevenLabs may still require `restaurant_name` (and related vars) at **call start** for `first_message` if the agent uses `{{restaurant_name}}` templates. ROAL mitigates this by PATCHing a **literal** `first_message` on Connect and by PATCHing the **conversation-init** webhook:

`{NEXT_PUBLIC_APP_URL}/api/integrations/elevenlabs/conversation-init` (optional `?secret=` when `ELEVENLABS_CONVERSATION_INIT_SECRET` is set).

That route returns `conversation_initiation_client_data` with `restaurant_id` / `restaurant_name` looked up from `restaurant_profiles.elevenlabs_agent_id`. Full setup: [ELEVENLABS.md](./ELEVENLABS.md) § Twilio / phone calls.
