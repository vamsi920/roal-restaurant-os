-- ROAL :: 029_restaurant_upsell_rules
-- Operator-managed add-on / combo suggestions used by the voice agent.

create table public.restaurant_upsell_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  trigger_text text not null,
  offer_text text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_upsell_rules_trigger_len
    check (char_length(trigger_text) between 2 and 220),
  constraint restaurant_upsell_rules_offer_len
    check (char_length(offer_text) between 2 and 500)
);

create index restaurant_upsell_rules_restaurant_idx
  on public.restaurant_upsell_rules (restaurant_id, is_active, sort_order, created_at);

alter table public.restaurant_upsell_rules enable row level security;

create policy "restaurant_upsell_rules_select"
  on public.restaurant_upsell_rules for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

create policy "restaurant_upsell_rules_insert"
  on public.restaurant_upsell_rules for insert
  with check (
    public.auth_user_can_access_restaurant(restaurant_id)
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.organization_id = organization_id
    )
  );

create policy "restaurant_upsell_rules_update"
  on public.restaurant_upsell_rules for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (
    public.auth_user_can_access_restaurant(restaurant_id)
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.organization_id = organization_id
    )
  );

create policy "restaurant_upsell_rules_delete"
  on public.restaurant_upsell_rules for delete
  using (public.auth_user_can_access_restaurant(restaurant_id));

comment on table public.restaurant_upsell_rules is
  'Restaurant-specific add-on and combo suggestions for the voice agent. Rules are prompt guidance only; offered items still must exist in live get_menu_items data.';
