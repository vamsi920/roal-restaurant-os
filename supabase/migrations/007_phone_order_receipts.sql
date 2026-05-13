-- Immutable completed phone orders (one row per finalize). Survives draft row churn.
create table public.phone_order_receipts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id text not null,
  items jsonb not null default '[]'::jsonb,
  customer_name text,
  customer_phone text,
  created_at timestamptz not null default now(),
  unique (restaurant_id, session_id)
);

create index phone_order_receipts_restaurant_created_idx
  on public.phone_order_receipts (restaurant_id, created_at desc);

alter table public.phone_order_receipts enable row level security;

create policy "public read phone_order_receipts"
  on public.phone_order_receipts for select using (true);

-- Inserts only from Edge (service role); no anon insert policy
alter publication supabase_realtime add table public.phone_order_receipts;
