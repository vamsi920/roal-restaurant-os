# ElevenLabs ↔ Supabase (ROAL) — Server Tools

Wire your conversational agent to **menu truth** in Postgres and **live draft orders** on the dashboard using Supabase Edge Functions as the HTTP middleman.

## Deployed URLs (after `supabase functions deploy`)

Replace `<project-ref>` with your Supabase project ref (e.g. `mnkabwcbdxruefzuvuuv`):

| Function | URL |
|----------|-----|
| **get_menu_items** (code: `get-menu`) | `https://<project-ref>.supabase.co/functions/v1/get-menu` |
| **get_restaurant_info** (code: `get-restaurant-info`) | `https://<project-ref>.supabase.co/functions/v1/get-restaurant-info` |
| **get_caller_history** (code: `get-caller-history`) | `https://<project-ref>.supabase.co/functions/v1/get-caller-history` |
| **submit_reservation_request** (code: `submit-reservation-request`) | `https://<project-ref>.supabase.co/functions/v1/submit-reservation-request` |
| **sync_draft_order** (code: `sync-draft-order`) | `https://<project-ref>.supabase.co/functions/v1/sync-draft-order` |
| **finalize_order** (code: `finalize-order`) | `https://<project-ref>.supabase.co/functions/v1/finalize-order` |
| **get_order_status** (code: `get-order-status`) | `https://<project-ref>.supabase.co/functions/v1/get-order-status` |

## Secrets (Supabase Dashboard → Edge Functions → Secrets, or CLI)

**Preferred (production):** `AGENT_TOOL_SIGNING_SECRET` — same value as Next.js. Minted as `Authorization: Bearer roal1.*` on KDS **Connect**.

**Optional:** `AGENT_TOOL_SECRET` — legacy global bearer for unmigrated dynamic tools only.

Auto-injected by Supabase (do **not** paste service role into ElevenLabs):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

One-shot parity (local or new env — never commit secret values):

```bash
npm run ensure:signing-parity   # writes .env.local if missing, mirrors to Edge, re-syncs agents
npm run qa:lb03-signing-parity    # verify signed token → get-menu 200
```

If local: link project and run `supabase secrets set …` from repo root.

## Deploy functions

From the repo root (with [Supabase CLI](https://supabase.com/docs/guides/cli) logged in and project linked):

```bash
supabase link --project-ref <project-ref>
supabase secrets set AGENT_TOOL_SIGNING_SECRET='<same-as-nextjs>'
# optional legacy fallback:
supabase secrets set AGENT_TOOL_SECRET='<legacy-global-bearer>'
supabase functions deploy get-menu --no-verify-jwt
supabase functions deploy get-restaurant-info --no-verify-jwt
supabase functions deploy sync-draft-order --no-verify-jwt
supabase functions deploy finalize-order --no-verify-jwt
supabase functions deploy get-order-status --no-verify-jwt
```

`--no-verify-jwt`: the Supabase **gateway** still expects your **publishable anon key** in the `apikey` header on every request. ROAL’s synced ElevenLabs tools send **`apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>`** plus **`Authorization: Bearer <roal1 signed token>`** (minted on Connect) for the Edge handler’s own check.

Repo `supabase/config.toml` sets `verify_jwt = false` for `get-menu`, `get-restaurant-info`, `sync-draft-order`, `finalize-order`, and `get-order-status` so deploys match CLI `--no-verify-jwt`.

## Conversation dynamic variables

For agents synced **without** a restaurant id (legacy), tools may still expect `restaurant_id` / `restaurant_name` as conversation variables.

| Variable | Example | Purpose |
|----------|---------|---------|
| `restaurant_id` | UUID from KDS URL | Legacy dynamic tools; **baked** tools embed this in URLs / headers instead |
| `restaurant_name` | `Joe's Diner` | Placeholders + spoken name in **first_message** (literal text after Connect — no `{{restaurant_name}}` templates). Fallback is `the restaurant`. |

On the ROAL KDS restaurant page, **Connect agent to this restaurant** runs tool sync + order-taker profile. That sync **bakes** this restaurant into webhook URLs and the `x-roal-restaurant-id` header so **Twilio phone calls do not need** those variables for tools. It PATCHes `dynamic_variable_placeholders`, a **literal** `first_message`, and the order-taker prompt.

### Twilio / phone calls (required)

Inbound Twilio calls fail with `Missing required dynamic variables in first message: {'restaurant_name'}` when the agent still has `{{restaurant_name}}` in **first_message** and ElevenLabs cannot resolve variables at call start.

1. Run **Connect agent to this restaurant** on the KDS (re-sync after deploy).
2. In ElevenLabs → your agent → **Phone** → **Personalization**, set the webhook URL to:
   - `{NEXT_PUBLIC_APP_URL}/api/integrations/elevenlabs/conversation-init` (no trailing slash on the origin)
   - Example: `https://your-domain.com/api/integrations/elevenlabs/conversation-init`
   - **Connect agent to this restaurant** PATCHes this URL automatically when `NEXT_PUBLIC_APP_URL` (or `VERCEL_URL`) is set.
3. Optional: set `ELEVENLABS_CONVERSATION_INIT_SECRET` in ROAL `.env` and append `?secret=<same>` to the ElevenLabs URL (or send header `x-roal-conversation-init-secret`).

The webhook looks up `restaurant_profiles.elevenlabs_agent_id` and returns:

```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "restaurant_id": "<uuid>",
    "restaurant_name": "Joe's Diner"
  }
}
```

Requires `SUPABASE_SERVICE_ROLE_KEY` on the Next.js server so the lookup can run. When the init payload includes `conversation_id`, `session_id`, or Twilio `call_sid`, ROAL also upserts an `agent_call_events` row with `status = active` and `outcome = in_progress`; the post-call webhook later closes the same session with outcome, transcript, and recording metadata.

## Post-call webhooks (transcripts + outcomes)

Enable ElevenLabs post-call webhooks in the ElevenLabs workspace settings and point the webhook URL to:

```text
{NEXT_PUBLIC_APP_URL}/api/integrations/elevenlabs/post-call-webhook
```

Set the generated HMAC secret as `ELEVENLABS_WEBHOOK_SECRET` on the ROAL hosting provider. The endpoint validates the `ElevenLabs-Signature` header, accepts `post_call_transcription`, `post_call_audio`, and `call_initiation_failure`, resolves the restaurant from the `restaurant_id` dynamic variable or saved `restaurant_profiles.elevenlabs_agent_id`, then upserts `agent_call_events`.

Conversation-init events make the Command center show a real active phone call as soon as the call starts. Post-call events make the Call history / Command center pages use real ElevenLabs conversation ids, transcript summaries, handoff flags, and failure outcomes. They do not replace the server tools above; tools still answer business questions, create drafts, receipts, and order-status lookups during the call.

**CLI (same as KDS Connect):** from repo root with `.env` + `.env.local`:

```bash
export ROAL_SYNC_RESTAURANT_ID=<uuid>
export ROAL_SYNC_RESTAURANT_NAME="Your Restaurant"
export NEXT_PUBLIC_APP_URL=https://your-production-domain.com
npm run elevenlabs:connect
```

Writes `ELEVENLABS_CONVERSATION_INIT_SECRET` to `.env.local` if missing and PATCHes the agent (tools, literal `first_message`, placeholders, Twilio personalization webhook).

**Deploy:** after pulling this behavior, redeploy `get-menu`, `sync-draft-order`, `finalize-order`, and `get-order-status` so the header fallback is live.

After changing env or Supabase URL, run **Connect agent to this restaurant** again so ElevenLabs picks up headers and schemas.

## Pickup vs delivery order fields

`sync_draft_order` and `finalize_order` support fulfillment context:

```json
{
  "session_id": "conversation-id",
  "status": "draft",
  "fulfillment_type": "delivery",
  "delivery_address": "123 Market St Apt 4B, San Francisco, CA 94105",
  "delivery_instructions": "Ring the side gate buzzer",
  "items": [{ "name": "Margherita Pizza", "quantity": 1 }]
}
```

- Use `fulfillment_type: "pickup"` or `"delivery"` after the guest chooses.
- For delivery, collect and pass `delivery_address` before calling `finalize_order`; the Edge schema rejects delivery finalization without it.
- `delivery_instructions` is optional and should only contain notes the caller actually stated.
- The KDS live order cards and order detail modal show delivery address/instructions so staff can fulfill the order without reading transcripts.

## Netlify checklist (live KDS + Realtime)

The hosted dashboard and the voice agent must point at the **same** Supabase project.

1. **Netlify → Site → Environment variables:** set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to this project’s values (Supabase Dashboard → **Project Settings → API**).  
2. **Redeploy** after any change to `NEXT_PUBLIC_*` — Next.js inlines them at **build** time.  
3. **ElevenLabs tool URLs** (from **Connect agent to this restaurant**) must use the same `<project-ref>.supabase.co` host as step 1. If the dashboard reads project A while tools write to project B, live carts stay empty and Realtime will never match.  
4. **Supabase → Database → Publications:** confirm `draft_orders` and `phone_order_receipts` are in the `supabase_realtime` publication (repo migrations add them).  
5. **Prompt / first message / tool schema updates** ship from this repo’s server code, but ElevenLabs stores a copy on the agent — run **Connect agent to this restaurant** again after deploying ROAL so the agent receives the latest profile and tool definitions.

If the Realtime websocket fails in the browser (network, extensions, or config), the KDS **Phone orders** panel falls back to **Polling every 6s** until the socket reconnects; fix env parity first if carts never match production calls.

## Tool 1 — `get_menu_items` (Server Tool)

- **Name (ElevenLabs):** `get_menu_items`
- **Description:** Fetches the current restaurant menu (categories, items, modifiers, prices, availability). Call **immediately** when the session starts (before or while the guest answers pickup/delivery)—**without** telling them you are loading or pulling up the menu. Call again when the guest asks what you serve if the menu may have changed.
- **Method:** `GET` or `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/get-menu`
- **Headers:** `Authorization: Bearer <roal1 signed token or AGENT_TOOL_SECRET>` · `apikey: <Supabase anon / publishable key>` · `x-roal-restaurant-id: <uuid>` (baked)  
  `Content-Type: application/json` (for POST)

**GET:** append query `?restaurant_id=<uuid>&restaurant_name=<optional+encoded>`

**POST body:**

```json
{ "restaurant_id": "uuid-here" }
```

**Response shape:** `{ restaurant, categories: [ { id, name, sort_order, items: [ { id, name, description, price, is_available, modifiers: [...] } ] } ] }`

## Tool 2 — `get_restaurant_info` (Server Tool)

- **Name (ElevenLabs):** `get_restaurant_info`
- **Description:** Fetches live business facts for non-order questions: open/closed status, address/directions fields, phone, website, pickup/delivery modes, prep-time estimate, and active operator FAQ entries.
- **Method:** `GET` or `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/get-restaurant-info`
- **Headers:** `Authorization: Bearer <roal1 signed token or AGENT_TOOL_SECRET>` · `apikey: <Supabase anon / publishable key>` · `x-roal-restaurant-id: <uuid>` (baked)

Use this when guests ask about hours, directions, parking, wait/prep time, policies, reservations, catering, or other business facts. The response intentionally does not expose order/cart data.

## Tool 3 — `get_caller_history` (Server Tool)

- **Name (ElevenLabs):** `get_caller_history`
- **Description:** Looks up this restaurant's completed pickup receipts by caller phone or name. Use only after the guest states their phone/name or asks for their usual.
- **Method:** POST
- **Body:** `customer_phone` preferred; `customer_name` allowed only if the caller stated it.
- **Safety:** Response includes only compact returning-guest context, last item names, and favorite item names. It does not expose full receipt JSON, prices, or cross-restaurant data. The agent must offer the usual as an option and must still get explicit confirmation.

## Tool 4 — `submit_reservation_request` (Server Tool)

- **Name (ElevenLabs):** `submit_reservation_request`
- **Description:** Saves a table reservation request after the guest states name, callback phone, party size, requested date, and requested time.
- **Method:** POST
- **Body:** `customer_name`, `customer_phone`, `party_size`, `requested_date`, `requested_time`; optional `session_id`, `conversation_id`, `notes`.
- **Safety:** This creates a staff request only. The agent must say staff will confirm and must not say the reservation is confirmed.

## Tool 5 — `sync_draft_order` (Server Tool)

- **Name (ElevenLabs):** `sync_draft_order`
- **Description:** Updates the live order row for this call. Call whenever the guest adds/changes items or modifiers; use `draft` while ordering, `confirmed` when they finalize.
- **Method:** `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/sync-draft-order`
- **Headers:** `Authorization: Bearer <roal1 token or AGENT_TOOL_SECRET>` · `x-roal-restaurant-id` (baked) · optional `x-roal-idempotency-key`  
  `Content-Type: application/json`

**Body:**

```json
{
  "restaurant_id": "uuid",
  "session_id": "<use ElevenLabs conversation id or stable call id>",
  "status": "draft",
  "items": [
    {
      "name": "Burger",
      "quantity": 1,
      "customizations": ["no onions", "extra cheese"]
    }
  ]
}
```

`status` must be `"draft"` or `"confirmed"`. Rows upsert on `(restaurant_id, session_id)`; dashboard can subscribe to `draft_orders` via Realtime.

Optional fields (stored on the same row when provided — only if the caller actually said them; never invent):

- `customer_name` (string)
- `customer_phone` (string)

## Tool 6 — `finalize_order` (Server Tool)

- **Name (ElevenLabs):** `finalize_order`
- **Description:** Marks the order confirmed and records guest name and phone. Call after `sync_draft_order` has built the cart (or pass `items` here).
- **Method:** `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/finalize-order`
- **Headers:** `Authorization: Bearer <roal1 token or AGENT_TOOL_SECRET>` · `x-roal-restaurant-id` (baked) · optional `x-roal-idempotency-key` · `Content-Type: application/json`

**Body:**

```json
{
  "restaurant_id": "uuid",
  "session_id": "<same id used in sync_draft_order>",
  "customer_name": "Jordan Lee",
  "customer_phone": "+1-555-0100",
  "items": []
}
```

If `items` is empty or omitted, the function reuses the last saved line items for that `(restaurant_id, session_id)` row. If there are no saved items, the request fails with `400`.

## Tool 7 — `get_order_status` (Server Tool)

- **Name (ElevenLabs):** `get_order_status`
- **Description:** Looks up a recent pickup order when a caller asks whether it is ready, being prepared, completed, or canceled. Prefer `customer_phone`; use `session_id` when the caller is asking about the current call/order.
- **Method:** `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/get-order-status`
- **Headers:** `Authorization: Bearer <roal1 token or AGENT_TOOL_SECRET>` · `x-roal-restaurant-id` (baked) · `Content-Type: application/json`

**Body:**

```json
{
  "restaurant_id": "uuid",
  "customer_phone": "+1-555-0100",
  "session_id": "<optional conversation id>",
  "customer_name": "<optional guest name>"
}
```

At least one of `session_id`, `customer_phone`, or `customer_name` is required. Response includes `found`, `status`, `status_label`, `message`, `item_count`, timestamps, and safe caller/order identifiers for speech.

## Next.js “Local demo” (this repo)

On each restaurant KDS (`/dashboard/restaurants/[id]`):

- **Phone orders (KDS)** — `draft_orders` for live carts + `phone_order_receipts` for completed orders (written on `finalize_order`); both scoped by `restaurant_id`, Realtime + periodic refresh in the UI.
- **ElevenLabs panel** — calls `GET /api/integrations/elevenlabs/agent` using your **server** env `ELEVENLABS_API_KEY` (and optional `ELEVENLABS_AGENT_ID` or `?agent_id=`). Shows the Edge tool URLs for that restaurant.

Set in `.env` / `.env.local` (see [.env.example](../.env.example)):

```bash
ELEVENLABS_API_KEY=your-key
ELEVENLABS_AGENT_ID=...   # optional default agent
```

To **change** agent settings from code, `PATCH /api/integrations/elevenlabs/agent?agent_id=…` with a JSON body per [ElevenLabs PATCH agent](https://elevenlabs.io/docs/api-reference/agents/update) (advanced: prompts, tools, LLM, etc.).

### Tool sync API (operator / CI)

`POST /api/integrations/elevenlabs/sync-roal-tools` runs the same logic as **Connect agent to this restaurant** (`lib/sync-elevenlabs-roal-tools.ts`): create or update the ROAL webhook tools (`get_menu_items`, `get_restaurant_info`, `get_caller_history`, `submit_reservation_request`, `sync_draft_order`, `finalize_order`, `get_order_status`) and attach their ids to the agent `prompt.tool_ids`.

**Body (JSON):**

```json
{
  "agent_id": "agent_…",
  "restaurant_id": "<uuid>",
  "restaurant_name": "Spoken name"
}
```

`agent_id` may also be omitted when `ELEVENLABS_AGENT_ID` is set, or passed as `?agent_id=`. When `restaurant_id` is present, tools are **baked** (`x-roal-restaurant-id`, menu URL query, no `restaurant_id` in POST bodies). When omitted, tools use ElevenLabs dynamic variables (legacy).

**Auth:** optional `ELEVENLABS_SYNC_TOKEN` — if set, require `Authorization: Bearer <token>`. No dashboard session on this route (use KDS **Connect** / `connectVoiceAgentAction` to persist `elevenlabs_last_sync_summary` on `restaurant_profiles`).

**CLI:** `npm run elevenlabs:tools` (dynamic, env default agent) · `npm run elevenlabs:connect` (baked + profile + Twilio webhook) · `npm run resync:elevenlabs-all` (all linked restaurants) · `npm run list:elevenlabs-restaurants`.

## System prompt — tool usage policy (paste into agent)

```
Tool usage policy:
1. Call get_menu_items immediately at session start (no loading phrases to the guest). Opening already names the restaurant and asks pickup vs delivery.
2. If the guest gives a phone/name early or asks for their usual, call get_caller_history. Offer prior/favorite items only as an option; never assume the order.
3. If the guest wants a table reservation, collect name, callback phone, party size, date, and time; call submit_reservation_request and say staff will confirm.
4. Every time the guest adds, removes, or changes an item or modifier, immediately call sync_draft_order with the full current items array and status "draft". Do not wait until the end of the call.
5. When the guest is done ordering, give a concise recap (items + quantities + one total if prices are known), then ask for real name and phone. Call finalize_order only with values they actually said.
6. Validation: If the guest orders something not in the last get_menu_items response, say it is not available and suggest the closest menu option. Never pass placeholder or invented name/phone to finalize_order.
7. If a guest asks whether an order is ready, ask for the order phone/name if needed, call get_order_status, and speak only the returned status/message.
```

Pass **`restaurant_id`** into the session via [dynamic variables](https://elevenlabs.io/docs) or your API session payload so the model always has the correct UUID (one agent config, many restaurants).

## Tool authentication (production)

ROAL uses **per-restaurant signed tokens** (`Authorization: Bearer roal1.*`) minted when you **Connect agent to this restaurant**. Edge also accepts the legacy global `AGENT_TOOL_SECRET` for dynamic (non-baked) tool configs.

Full design, idempotency, ownership checks, and **secret rotation**: [docs/AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md).

Set in Next.js and Supabase Edge secrets:

```bash
AGENT_TOOL_SIGNING_SECRET='long-random-string'   # preferred
AGENT_TOOL_SECRET='legacy-fallback'              # optional during migration
```

After rotation or first deploy, **Re-sync** each restaurant so ElevenLabs tool headers pick up the new bearer token.

## Verify in ElevenLabs

1. Deploy all Edge functions; run `npm run ensure:signing-parity` (or set `AGENT_TOOL_SIGNING_SECRET` on Next.js + Edge).
2. KDS → **Connect agent to this restaurant** (or `npm run elevenlabs:connect` with `ROAL_SYNC_RESTAURANT_ID`).
3. Run `npm run qa:lb01-phone-stack` and `npm run qa:get-menu-elevenlabs` against QA restaurant.
4. Start a test conversation; confirm **Logs** show HTTP **200** on `get_menu_items`.

## Database

Migrations `003_draft_orders.sql` onward create `public.draft_orders` and related order tables with Realtime for KDS. Full list: [DEPLOYMENT.md](./DEPLOYMENT.md) §1.
