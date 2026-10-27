# ElevenLabs ↔ ROAL — Server Tools

Wire your conversational agent to **menu truth** and **live draft orders** on the dashboard. The tools are plain Next.js route handlers in this app (`app/api/agent-tools/*`) that read and write Firestore through `getDb()` — no separate edge runtime or database project.

## Tool URLs

`<base>` is the app's **public https origin**: `ROAL_AGENT_TOOLS_BASE_URL` if set, else `NEXT_PUBLIC_APP_URL` (see `lib/agent-tools/base-url.ts`).

| Tool (ElevenLabs name) | URL |
|------|-----|
| **get_menu_items** (route: `get-menu`) | `<base>/api/agent-tools/get-menu` |
| **get_restaurant_info** (route: `get-restaurant-info`) | `<base>/api/agent-tools/get-restaurant-info` |
| **get_caller_history** (route: `get-caller-history`) | `<base>/api/agent-tools/get-caller-history` |
| **submit_reservation_request** (route: `submit-reservation-request`) | `<base>/api/agent-tools/submit-reservation-request` |
| **sync_draft_order** (route: `sync-draft-order`) | `<base>/api/agent-tools/sync-draft-order` |
| **finalize_order** (route: `finalize-order`) | `<base>/api/agent-tools/finalize-order` |
| **get_order_status** (route: `get-order-status`) | `<base>/api/agent-tools/get-order-status` |

### Public https requirement

ElevenLabs calls the tools from the public internet, so `<base>` must be a public **https** URL. Production builds refuse to bake a non-https base.

- **Production (Netlify):** set `NEXT_PUBLIC_APP_URL=https://your-domain.com`; nothing else needed.
- **Local dev:** `localhost` is unreachable from ElevenLabs. Start a tunnel to your dev server and point the tools at it:

```bash
npm run dev
ngrok http 3000                      # or: cloudflared tunnel --url http://localhost:3000
# .env.local
ROAL_AGENT_TOOLS_BASE_URL=https://<your-tunnel-host>
```

Then run **Connect agent to this restaurant** (or **Sync now**) so the agent's tools are re-baked with the tunnel URL. Re-sync whenever the tunnel URL changes.

## Secrets (Next.js env only)

**Preferred (production):** `AGENT_TOOL_SIGNING_SECRET` — minted as `Authorization: Bearer roal1.*` per restaurant on KDS **Connect** and verified by the same app. Because the tools run in the Next.js app, there is no second place to copy the secret to.

**Optional:** `AGENT_TOOL_SECRET` — legacy global bearer for unmigrated dynamic tools only.

Never paste `FIREBASE_SERVICE_ACCOUNT` or any server key into ElevenLabs; the tools only ever receive the `roal1.*` bearer and the baked `x-roal-restaurant-id` header.

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

Runs on the Next.js server against Firestore (or the demo store). When the init payload includes `conversation_id`, `session_id`, or Twilio `call_sid`, ROAL also upserts an `agent_call_events` row with `status = active` and `outcome = in_progress`; the post-call webhook later closes the same session with outcome, transcript, and recording metadata.

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

**Deploy:** tool changes ship with the normal app deploy (Netlify).

After changing env or the public origin (`NEXT_PUBLIC_APP_URL` / `ROAL_AGENT_TOOLS_BASE_URL`), run **Connect agent to this restaurant** again so ElevenLabs picks up headers and schemas.

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
- For delivery, collect and pass `delivery_address` before calling `finalize_order`; the tool schema rejects delivery finalization without it.
- `delivery_instructions` is optional and should only contain notes the caller actually stated.
- The KDS live order cards and order detail modal show delivery address/instructions so staff can fulfill the order without reading transcripts.

## Netlify checklist (live KDS)

The hosted dashboard and the voice agent tools are the **same** app and the **same** Firestore project, so there is no project-parity problem anymore.

1. **Netlify → Site → Environment variables:** `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_APP_URL`, `ELEVENLABS_API_KEY`, `AGENT_TOOL_SIGNING_SECRET` (see [DEPLOYMENT.md](./DEPLOYMENT.md)).
2. **Redeploy** after any change to `NEXT_PUBLIC_*` — Next.js inlines them at **build** time.
3. **ElevenLabs tool URLs** (from **Connect agent to this restaurant**) must start with your production `NEXT_PUBLIC_APP_URL`. If they still point at an old tunnel or the old Supabase host, re-run Connect.
4. **Prompt / first message / tool schema updates** ship from this repo's server code, but ElevenLabs stores a copy on the agent — run **Connect agent to this restaurant** again after deploying ROAL so the agent receives the latest profile and tool definitions.

The KDS **Phone orders** panel polls the server for live carts and tickets; if polling fails repeatedly it shows a degraded badge until requests succeed again.

## Tool 1 — `get_menu_items` (Server Tool)

- **Name (ElevenLabs):** `get_menu_items`
- **Description:** Fetches the current restaurant menu (categories, items, modifiers, prices, availability). Call **immediately** when the session starts (before or while the guest answers pickup/delivery)—**without** telling them you are loading or pulling up the menu. Call again when the guest asks what you serve if the menu may have changed.
- **Method:** `GET` or `POST`
- **URL:** `<base>/api/agent-tools/get-menu`
- **Headers:** `Authorization: Bearer <roal1 signed token or AGENT_TOOL_SECRET>` · `x-roal-restaurant-id: <uuid>` (baked)  
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
- **URL:** `<base>/api/agent-tools/get-restaurant-info`
- **Headers:** `Authorization: Bearer <roal1 signed token or AGENT_TOOL_SECRET>` · `x-roal-restaurant-id: <uuid>` (baked)

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
- **URL:** `<base>/api/agent-tools/sync-draft-order`
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

`status` must be `"draft"` or `"confirmed"`. Rows upsert on `(restaurant_id, session_id)`; the dashboard picks them up on its next live poll.

Optional fields (stored on the same row when provided — only if the caller actually said them; never invent):

- `customer_name` (string)
- `customer_phone` (string)

## Tool 6 — `finalize_order` (Server Tool)

- **Name (ElevenLabs):** `finalize_order`
- **Description:** Marks the order confirmed and records guest name and phone. Call after `sync_draft_order` has built the cart (or pass `items` here).
- **Method:** `POST`
- **URL:** `<base>/api/agent-tools/finalize-order`
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
- **URL:** `<base>/api/agent-tools/get-order-status`
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

- **Phone orders (KDS)** — `draft_orders` for live carts + `phone_order_receipts` for completed orders (written on `finalize_order`); both scoped by `restaurant_id`, refreshed by live polling in the UI.
- **ElevenLabs panel** — calls `GET /api/integrations/elevenlabs/agent` using your **server** env `ELEVENLABS_API_KEY` (and optional `ELEVENLABS_AGENT_ID` or `?agent_id=`). Shows the agent tool URLs for that restaurant.

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

ROAL uses **per-restaurant signed tokens** (`Authorization: Bearer roal1.*`) minted when you **Connect agent to this restaurant**. The tool routes also accept the legacy global `AGENT_TOOL_SECRET` for dynamic (non-baked) tool configs.

Full design, idempotency, ownership checks, and **secret rotation**: [docs/AGENT_TOOL_SECURITY.md](./AGENT_TOOL_SECURITY.md).

Set in the Next.js env (local `.env.local` and Netlify):

```bash
AGENT_TOOL_SIGNING_SECRET='long-random-string'   # preferred
AGENT_TOOL_SECRET='legacy-fallback'              # optional during migration
```

After rotation or first deploy, **Re-sync** each restaurant so ElevenLabs tool headers pick up the new bearer token.

## Verify in ElevenLabs

1. Deploy the app with `AGENT_TOOL_SIGNING_SECRET` and a public https `NEXT_PUBLIC_APP_URL` (or a tunnel in `ROAL_AGENT_TOOLS_BASE_URL` locally).
2. KDS → **Connect agent to this restaurant** (or `npm run elevenlabs:connect` with `ROAL_SYNC_RESTAURANT_ID`).
3. Run `npm run qa:lb01-phone-stack` and `npm run qa:get-menu-elevenlabs` against QA restaurant.
4. Start a test conversation; confirm **Logs** show HTTP **200** on `get_menu_items`.

## Database

Draft orders, receipts and call events live in the Firestore collections `draft_orders`, `phone_order_receipts` and `agent_call_events` (see [TENANT_SCHEMA.md](./TENANT_SCHEMA.md)). No migrations are needed.
