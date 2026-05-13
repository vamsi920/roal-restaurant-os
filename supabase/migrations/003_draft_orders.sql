-- ROAL :: 003_draft_orders
-- Live draft orders for voice agent / dashboard (ElevenLabs sync_draft_order).

create table public.draft_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id text not null,
  status text not null check (status in ('draft', 'confirmed')),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, session_id)
);

create index draft_orders_restaurant_id_idx on public.draft_orders(restaurant_id);
create index draft_orders_session_id_idx on public.draft_orders(session_id);

alter table public.draft_orders enable row level security;

create policy "public read draft_orders" on public.draft_orders for select using (true);
create policy "public insert draft_orders" on public.draft_orders for insert with check (true);
create policy "public update draft_orders" on public.draft_orders for update using (true);

alter publication supabase_realtime add table public.draft_orders;
