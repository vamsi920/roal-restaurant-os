# Agent tool security (ElevenLabs → /api/agent-tools)

ROAL voice-agent tools (`get-menu`, `get-restaurant-info`, `get-caller-history`, `submit-reservation-request`, `sync-draft-order`, `finalize-order`, `get-order-status`) are Next.js route handlers under `/api/agent-tools/*` (handlers in `lib/agent-tools/server/`) and accept authenticated webhook calls from ElevenLabs. This document describes the production auth and validation design.

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

The tool routes verify:

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

Strict **Zod** schemas in `lib/agent-tools/schemas.ts` (shared by the routes and the test harness):

| Tool | Request schema | Response schema |
|------|----------------|-----------------|
| `get_menu_items` | `GetMenuQuerySchema` / `GetMenuPostBodySchema` | `GetMenuResponseSchema` |
| `get_restaurant_info` | `GetRestaurantInfoQuerySchema` / `GetRestaurantInfoPostBodySchema` | `GetRestaurantInfoResponseSchema` |
| `get_caller_history` | `GetCallerHistoryRequestSchema` | `GetCallerHistoryResponseSchema` |
| `submit_reservation_request` | `SubmitReservationRequestSchema` | `SubmitReservationResponseSchema` |
| `sync_draft_order` | `SyncDraftOrderRequestSchema` | `SyncDraftOrderResponseSchema` |
| `finalize_order` | `FinalizeOrderRequestSchema` | `FinalizeOrderResponseSchema` |
| `get_order_status` | `GetOrderStatusRequestSchema` | `GetOrderStatusResponseSchema` |

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

After Zod parsing, `sync_draft_order` and `finalize_order` validate the cart against the live menu (`lib/orders/validate-cart.ts`, tool routes: `lib/agent-tools/server/order-validate.ts`):

- Stale or unknown `item_id` / name mismatch  
- Sold-out (`is_available: false`) items  
- Invalid or missing modifiers (per group `min_selection` / `max_selection`)  
- Quantities outside 1–99  
- Placeholder guest name/phone on finalize  

Failures return **HTTP 422** (`order_validation_failed`) or **400** (`customer_validation_failed`) with per-line `issues[].suggestion`. Valid lines are stored with canonical `item_id`, `name`, `quantity`, and `customizations`.

`get_restaurant_info` is read-only. It returns scoped business facts for the agent: open/closed status, address fields, phone, website, pickup/delivery flags, prep-time estimate, and active operator FAQ entries.

`get_caller_history` is read-only. It requires authenticated restaurant scope plus a caller phone or stated name, reads only completed `phone_order_receipts`, and returns compact returning-guest context instead of full receipts or prices.

`submit_reservation_request` is write-only request intake. It requires authenticated restaurant scope, real callback details, party size, requested date, and requested time. It stores a staff-confirmation request and does not claim a confirmed reservation.

`get_order_status` is read-only. It still requires authenticated restaurant scope and one lookup identifier (`session_id`, `customer_phone`, or `customer_name`), but returns only the latest scoped order status summary and item count instead of full cart contents.

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
| `Authorization` | Yes | `roal1.*` token or legacy secret |
| `x-roal-restaurant-id` | Baked tools | Restaurant UUID (must match token/body) |
| `x-roal-idempotency-key` | Optional on write tools | Replay protection for draft/finalize retries |
| `Content-Type` | POST | `application/json` |

## Secret rotation

### Rotate signing secret (recommended path)

1. Generate a new `AGENT_TOOL_SIGNING_SECRET` (32+ random bytes).
2. Set it in the Next.js env (Netlify + local `.env.local`) and redeploy. The tools run in the same app, so there is no second secret store.
3. A `AGENT_TOOL_SIGNING_SECRET_PREVIOUS` grace window is **not** implemented — tokens minted with the old secret stop working on deploy, so plan a short maintenance window.
4. Run **Re-sync** (or Connect) for **each** restaurant (`npm run resync:elevenlabs-all`) so ElevenLabs receives new `roal1.*` tokens.

### Rotate legacy `AGENT_TOOL_SECRET`

1. Set the new secret in the Next.js env and redeploy.
2. Re-sync all agents (updates ElevenLabs headers).

### Compromise response

1. Rotate `AGENT_TOOL_SIGNING_SECRET` and `AGENT_TOOL_SECRET`.  
2. Re-sync every connected agent.  
3. Review `draft_orders` / `phone_order_receipts` for suspicious `session_id` patterns.  
4. Clear old `agent_tool_idempotency` documents if needed (Firebase console → Firestore → `agent_tool_idempotency`, or a one-off script using `getDb().from("agent_tool_idempotency").delete().lt("created_at", <iso>)`).

## Deploy checklist

1. `AGENT_TOOL_SIGNING_SECRET` set on Netlify; `NEXT_PUBLIC_APP_URL` is the public https origin (or `ROAL_AGENT_TOOLS_BASE_URL` for a tunnel / staging host).
2. Deploy the app (tools ship with it). No database migration is needed for idempotency — `agent_tool_idempotency` docs are keyed `restaurant_id__idempotency_key`.
3. On each restaurant KDS: **Re-sync** voice agent.

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `AGENT_TOOL_SIGNING_SECRET` | Next.js | HMAC for `roal1.*` tokens |
| `AGENT_TOOL_SECRET` | Next.js | Legacy global bearer; signing fallback |
| `ROAL_AGENT_TOOLS_BASE_URL` | Next.js | Public https origin baked into tool URLs (defaults to `NEXT_PUBLIC_APP_URL`) |

Never expose `FIREBASE_SERVICE_ACCOUNT` (or any other server key) to ElevenLabs.

## Twilio phone calls (tools vs conversation variables)

After **Connect agent to this restaurant**, ROAL **bakes** `restaurant_id` into tool URLs and `x-roal-restaurant-id` so **tool calls do not depend** on Twilio session dynamic variables (see prompt 29 / `syncRoalElevenLabsTools`).

Separately, ElevenLabs may still require `restaurant_name` (and related vars) at **call start** for `first_message` if the agent uses `{{restaurant_name}}` templates. ROAL mitigates this by PATCHing a **literal** `first_message` on Connect and by PATCHing the **conversation-init** webhook:

`{NEXT_PUBLIC_APP_URL}/api/integrations/elevenlabs/conversation-init` (optional `?secret=` when `ELEVENLABS_CONVERSATION_INIT_SECRET` is set).

That route returns `conversation_initiation_client_data` with `restaurant_id` / `restaurant_name` looked up from `restaurant_profiles.elevenlabs_agent_id`. Full setup: [ELEVENLABS.md](./ELEVENLABS.md) § Twilio / phone calls.
