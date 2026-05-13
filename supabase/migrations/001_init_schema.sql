-- ROAL :: 001_init_schema
-- Restaurants, categories, items, modifiers + Realtime publication.

create extension if not exists "pgcrypto";

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2),
  is_available boolean not null default true,
  raw_menu_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

create table public.modifiers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  group_name text not null,
  modifier_name text not null,
  extra_price numeric(10,2) not null default 0,
  min_selection integer not null default 0,
  max_selection integer not null default 1,
  created_at timestamptz not null default now()
);

create index categories_restaurant_id_idx on public.categories(restaurant_id);
create index items_category_id_idx on public.items(category_id);
create index modifiers_item_id_idx on public.modifiers(item_id);

alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.modifiers enable row level security;

-- Dev mode: open access. Replace with auth-scoped policies in production.
create policy "public read restaurants" on public.restaurants for select using (true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read items" on public.items for select using (true);
create policy "public read modifiers" on public.modifiers for select using (true);

create policy "public insert restaurants" on public.restaurants for insert with check (true);
create policy "public insert categories" on public.categories for insert with check (true);
create policy "public insert items" on public.items for insert with check (true);
create policy "public insert modifiers" on public.modifiers for insert with check (true);

create policy "public update categories" on public.categories for update using (true);
create policy "public update items" on public.items for update using (true);

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.modifiers;
alter publication supabase_realtime add table public.restaurants;
