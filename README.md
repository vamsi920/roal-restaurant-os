# ROAL — Restaurant Operational Abstraction Layer

A multi-tenant platform that scans restaurant menu photos with Gemini 1.5 Pro
Vision, atomically merges them into a Supabase Postgres database, and renders
the live menu on a KDS-style dashboard in real time via Supabase Realtime.

## Stack

- Next.js 14 (App Router, TypeScript, Server Components)
- Tailwind CSS + Headless UI + Framer Motion
- Supabase (Postgres + Realtime + RPC)
- Google Gemini 1.5 Pro Vision (`@google/generative-ai`)
- ElevenLabs Conversational AI (voice) + Supabase Edge tools — see [docs/ELEVENLABS.md](docs/ELEVENLABS.md)
- Zod for response validation

## Quick start

```bash
cp .env.example .env
# Fill in GEMINI_API_KEY at minimum. If `.env.local` exists, Next.js will override
# duplicate keys from `.env`—delete or rename `.env.local` to use only `.env`.
npm install
npm run dev
```

Open <http://localhost:3000>. You will be redirected to
`/dashboard/restaurants`.

## Env vars

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable anon key |
| `GEMINI_API_KEY` | Google Generative AI API key |
| `GEMINI_MODEL` | Optional override if Google retires a model alias |
| `ELEVENLABS_API_KEY` | Server-only: fetch/patch Conv AI agent from Next.js API |
| `ELEVENLABS_AGENT_ID` | Optional default agent id for `/api/integrations/elevenlabs/agent` |

> The Supabase project ships with RLS policies that allow unauthenticated
> reads/writes (dev mode). Lock these down before going to production.

## Database

Migrations live in `supabase/migrations/`:

- `001_init_schema.sql` — tables, indexes, RLS, Realtime publication
- `002_merge_menu_rpc.sql` — atomic `merge_menu(uuid, jsonb)` function
- `003_draft_orders.sql` — `draft_orders` for voice agent live sync + Realtime
- `004_menu_delete_rls.sql` — delete policy on `categories` (clear menu)
- `005_draft_orders_customer.sql` — guest name/phone on `draft_orders`
- `006_clear_menu_rpc.sql` — `clear_restaurant_menu` RPC (optional anon clear path)
- `007_phone_order_receipts.sql` — append receipts for finalized phone orders (KDS **Completed** tab) + Realtime

**ElevenLabs Server Tools** (Edge Functions): see [docs/ELEVENLABS.md](docs/ELEVENLABS.md).

Schema:

```
restaurants (id, name, created_at)
  └── categories (id, restaurant_id, name, sort_order)
        └── items (id, category_id, name, description, price,
                   is_available, raw_menu_data)
              └── modifiers (id, item_id, group_name, modifier_name,
                             extra_price, min_selection, max_selection)

draft_orders (id, restaurant_id, session_id, status draft|confirmed,
              items jsonb, customer_name, customer_phone, updated_at)
              — unique (restaurant_id, session_id)

phone_order_receipts (id, restaurant_id, session_id, items jsonb,
                      customer_name, customer_phone, created_at)
                      — unique (restaurant_id, session_id); upsert on finalize_order
```

For the KDS, set **`SUPABASE_SERVICE_ROLE_KEY`** in the Next server env so the dashboard can reliably load `draft_orders` and `phone_order_receipts` (falls back to anon if unset).

## How a scan flows

```
[Image upload]
   ─► POST /api/scanner/process (multipart/form-data)
        ├─ Buffer → base64
        ├─ Gemini Vision model with response schema → JSON
        ├─ Zod validation (MenuSchema)
        └─ supabase.rpc("merge_menu", { p_restaurant_id, p_menu })
               └─ ONE transaction:
                  upsert categories (restaurant_id, name)
                  upsert items (category_id, name) — also updates price/desc
                  delete + reinsert modifiers per item
   ─► { ok, stats: { categories, items, modifiers } }

[Live dashboard]
   supabase
     .channel(`menu-${restaurantId}`)
     .on("postgres_changes", { table: "items" }, ...)
     .on("postgres_changes", { table: "categories" }, ...)
     .on("postgres_changes", { table: "modifiers" }, ...)
   → flash-on-update animation in sidebar
```

## The "moat" — atomic merge

`merge_menu` runs as a single plpgsql function. Postgres wraps it in one
transaction, so a partial failure (e.g. a malformed modifier) rolls back the
entire upload. No orphaned categories or items.

Conflict strategy:

- `categories (restaurant_id, name)` — update `sort_order`
- `items (category_id, name)` — update description, price, availability,
  raw_menu_data
- `modifiers` — replaced wholesale per item (delete + insert), because
  modifier sets are easier to reason about as snapshots than as deltas

## Gemini model note

Google occasionally retires model aliases. The app now tries this order:

- `GEMINI_MODEL` from `.env` if set
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-flash-latest`
- `gemini-pro-latest`
- `gemini-2.0-flash-lite`

If your account/API version does not support the default aliases, set
`GEMINI_MODEL` explicitly in `.env`.

## Project layout

```
app/
  layout.tsx
  page.tsx                 → redirect /dashboard
  dashboard/
    layout.tsx             header w/ realtime badge
    page.tsx               → redirect /dashboard/restaurants
    restaurants/
      page.tsx             grid of restaurants
      CreateRestaurantButton.tsx
      [id]/
        page.tsx           KDS console
        LiveMenuSidebar.tsx
        MenuScanner.tsx
  api/
    restaurants/route.ts   POST create
    scanner/process/route.ts  POST image → Gemini → RPC
lib/
  supabase/{client,server}.ts
  gemini.ts                Vision prompt + response schema
  types.ts                 Zod schemas + DB types
  cn.ts
supabase/
  migrations/
    001_init_schema.sql
    002_merge_menu_rpc.sql
```

## Sales demo

1. Open `/dashboard/restaurants/[id]` in two browser windows.
2. Drop a menu photo in window A and hit **Process menu**.
3. Watch window B populate categories → items → modifiers in real time,
   each new row flashing as it arrives.

## Production checklist

- [ ] Replace open RLS policies with auth-scoped ones (Supabase Auth +
      `user_id` on `restaurants`).
- [ ] Move scanner endpoint behind rate limiting.
- [ ] Use a `SUPABASE_SERVICE_ROLE_KEY` on the server and tighten anon
      permissions to read-only.
- [ ] Add image size/dimension capping before sending to Gemini.
- [ ] Persist original uploads to Supabase Storage for audit.
