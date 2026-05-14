# ElevenLabs ↔ Supabase (ROAL) — Server Tools

Wire your conversational agent to **menu truth** in Postgres and **live draft orders** on the dashboard using Supabase Edge Functions as the HTTP middleman.

## Deployed URLs (after `supabase functions deploy`)

Replace `<project-ref>` with your Supabase project ref (e.g. `mnkabwcbdxruefzuvuuv`):

| Function | URL |
|----------|-----|
| **get_menu_items** (code: `get-menu`) | `https://<project-ref>.supabase.co/functions/v1/get-menu` |
| **sync_draft_order** (code: `sync-draft-order`) | `https://<project-ref>.supabase.co/functions/v1/sync-draft-order` |
| **finalize_order** (code: `finalize-order`) | `https://<project-ref>.supabase.co/functions/v1/finalize-order` |

## Secrets (Supabase Dashboard → Edge Functions → Secrets, or CLI)

Required for both functions:

```bash
supabase secrets set AGENT_TOOL_SECRET='your-long-random-secret'
```

Already injected by Supabase for Edge Functions (do **not** paste the service role into ElevenLabs):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If local: link project and run `supabase secrets set ...` from the repo root.

## Deploy functions

From `/Users/vamsi/Desktop/restaurant-agent` (with [Supabase CLI](https://supabase.com/docs/guides/cli) logged in and project linked):

```bash
supabase link --project-ref <project-ref>
supabase secrets set AGENT_TOOL_SECRET='<same-secret-you-use-in-elevenlabs>'
supabase functions deploy get-menu --no-verify-jwt
supabase functions deploy sync-draft-order --no-verify-jwt
supabase functions deploy finalize-order --no-verify-jwt
```

`--no-verify-jwt`: the Supabase **gateway** still expects your **publishable anon key** in the `apikey` header on every request. ROAL’s synced ElevenLabs tools send **`apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>`** (from your Next server env when you use **Connect agent to this restaurant** on the KDS page) plus **`Authorization: Bearer <AGENT_TOOL_SECRET>`** for the Edge handler’s own check.

Repo `supabase/config.toml` sets `verify_jwt = false` for `get-menu`, `sync-draft-order`, and `finalize-order` so deploys match CLI `--no-verify-jwt`.

## Conversation dynamic variables

For agents synced **without** a restaurant id (legacy), tools may still expect `restaurant_id` / `restaurant_name` as conversation variables.

| Variable | Example | Purpose |
|----------|---------|---------|
| `restaurant_id` | UUID from KDS URL | Legacy dynamic tools; **baked** tools embed this in URLs / headers instead |
| `restaurant_name` | `Joe's Diner` | Placeholders + `{{restaurant_name}}` in the agent first message (set when you **Connect agent to this restaurant**). Fallback text is `the restaurant` if unset. |

On the ROAL KDS restaurant page, **Connect agent to this restaurant** runs tool sync + order-taker profile. That sync **bakes** this restaurant into webhook URLs and the `x-roal-restaurant-id` header so **Twilio phone calls do not need** those variables for tools. It still sets `dynamic_variable_placeholders` for prompts and legacy use.

**Deploy:** after pulling this behavior, redeploy `get-menu`, `sync-draft-order`, and `finalize-order` so the header fallback is live.

After changing env or Supabase URL, run **Connect agent to this restaurant** again so ElevenLabs picks up headers and schemas.

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
- **Description:** Fetches the current restaurant menu (categories, items, modifiers, prices, availability). Call after pickup/delivery and contact details (per ROAL prompt), or when the guest asks what you serve.
- **Method:** `GET` or `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/get-menu`
- **Headers:** `Authorization: Bearer <AGENT_TOOL_SECRET>` · `apikey: <Supabase anon / publishable key>`  
  `Content-Type: application/json` (for POST)

**GET:** append query `?restaurant_id=<uuid>&restaurant_name=<optional+encoded>`

**POST body:**

```json
{ "restaurant_id": "uuid-here" }
```

**Response shape:** `{ restaurant, categories: [ { id, name, sort_order, items: [ { id, name, description, price, is_available, modifiers: [...] } ] } ] }`

## Tool 2 — `sync_draft_order` (Server Tool)

- **Name (ElevenLabs):** `sync_draft_order`
- **Description:** Updates the live order row for this call. Call whenever the guest adds/changes items or modifiers; use `draft` while ordering, `confirmed` when they finalize.
- **Method:** `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/sync-draft-order`
- **Headers:** `Authorization: Bearer <AGENT_TOOL_SECRET>`  
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

## Tool 3 — `finalize_order` (Server Tool)

- **Name (ElevenLabs):** `finalize_order`
- **Description:** Marks the order confirmed and records guest name and phone. Call after `sync_draft_order` has built the cart (or pass `items` here).
- **Method:** `POST`
- **URL:** `https://<project-ref>.supabase.co/functions/v1/finalize-order`
- **Headers:** `Authorization: Bearer <AGENT_TOOL_SECRET>` · `Content-Type: application/json`

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

## Next.js “Local demo” (this repo)

On each restaurant KDS (`/dashboard/restaurants/[id]`):

- **Phone orders (KDS)** — `draft_orders` for live carts + `phone_order_receipts` for completed orders (written on `finalize_order`); both scoped by `restaurant_id`, Realtime + periodic refresh in the UI.
- **ElevenLabs panel** — calls `GET /api/integrations/elevenlabs/agent` using your **server** env `ELEVENLABS_API_KEY` (and optional `ELEVENLABS_AGENT_ID` or `?agent_id=`). Shows the three Edge tool URLs for that restaurant.

Set in `.env` (see repo `.env.example`; remove `.env.local` if you want `.env` values to win):

```bash
ELEVENLABS_API_KEY=xi-...
ELEVENLABS_AGENT_ID=...   # optional default agent
```

To **change** agent settings from code, `PATCH /api/integrations/elevenlabs/agent?agent_id=…` with a JSON body per [ElevenLabs PATCH agent](https://elevenlabs.io/docs/api-reference/agents/update) (advanced: prompts, tools, LLM, etc.).

## System prompt — tool usage policy (paste into agent)

```
Tool usage policy:
1. Opening uses the restaurant name from session placeholders. After pickup/delivery, ask for the guest's real name and callback number, then call get_menu_items so you only sell items that exist today.
2. Every time the guest adds, removes, or changes an item or modifier, immediately call sync_draft_order with the full current items array and status "draft". Do not wait until the end of the call.
3. When the guest confirms the order is complete and you have their real name and phone from the call, call finalize_order with customer_name, customer_phone, and the same session_id. If the cart is already in sync_draft_order, you may omit the items array.
4. Validation: If the guest orders something not in the last get_menu_items response, say it is not available and suggest the closest menu option. Never pass placeholder or invented name/phone to finalize_order.
```

Pass **`restaurant_id`** into the session via [dynamic variables](https://elevenlabs.io/docs) or your API session payload so the model always has the correct UUID (one agent config, many restaurants).

## API / signed URL (optional hardening)

- **Today:** ElevenLabs calls the Edge Function URL with `Authorization: Bearer AGENT_TOOL_SECRET`. Rotate the secret if leaked.
- **Better:** Your Next.js backend issues short-lived signed tokens; Edge verifies that instead of a static secret. ElevenLabs would then call your backend URL, which proxies to Supabase with the secret server-side.

## Verify in ElevenLabs

1. Deploy all three Edge functions and set `AGENT_TOOL_SECRET`.
2. In **Tools → Server tool**, create `get_menu_items`, `sync_draft_order`, and `finalize_order` with URLs and headers above.
3. Start a test conversation with a valid `restaurant_id` in the tool request (or static query for smoke test).
4. Open **Logs** in ElevenLabs and confirm HTTP 200 and JSON body from `get-menu`.

## Database

Migration `003_draft_orders.sql` creates `public.draft_orders` with Realtime enabled for dashboard subscriptions.
