-- ROAL :: 009_production_rls_policies
-- Org-scoped RLS for tenant + menu + orders. Replaces dev-open policies from 001–008.
-- Security model: docs/RLS.md

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER — read memberships without policy recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

create or replace function public.auth_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.auth_user_is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_user_id() is not null
    and exists (
      select 1
      from public.memberships m
      where m.organization_id = p_organization_id
        and m.user_id = public.auth_user_id()
    );
$$;

create or replace function public.auth_user_org_role(p_organization_id uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.memberships m
  where m.organization_id = p_organization_id
    and m.user_id = public.auth_user_id()
  limit 1;
$$;

create or replace function public.auth_user_is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_user_org_role(p_organization_id) in ('owner', 'admin');
$$;

create or replace function public.auth_user_can_access_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_service_role()
    or exists (
      select 1
      from public.restaurants r
      where r.id = p_restaurant_id
        and public.auth_user_is_org_member(r.organization_id)
    );
$$;

create or replace function public.auth_user_can_access_category(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.categories c
    where c.id = p_category_id
      and public.auth_user_can_access_restaurant(c.restaurant_id)
  );
$$;

create or replace function public.auth_user_can_access_item(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.items i
    join public.categories c on c.id = i.category_id
    where i.id = p_item_id
      and public.auth_user_can_access_restaurant(c.restaurant_id)
  );
$$;

-- Read-only POC demo: legacy org visible to anon when flag is on (see docs/RLS.md).
create table if not exists public.internal_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.internal_config enable row level security;

insert into public.internal_config (key, value)
values ('rls_poc_demo_reads', 'false')
on conflict (key) do nothing;

create or replace function public.rls_poc_demo_reads_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ic.value = 'true'
      from public.internal_config ic
      where ic.key = 'rls_poc_demo_reads'
    ),
    false
  );
$$;

create or replace function public.rls_legacy_org_demo_select(p_organization_id uuid)
returns boolean
language sql
stable
as $$
  select public.rls_poc_demo_reads_enabled()
    and p_organization_id = '00000000-0000-4000-8000-000000000001'::uuid;
$$;

create or replace function public.rls_legacy_restaurant_demo_select(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rls_legacy_org_demo_select(r.organization_id)
  from public.restaurants r
  where r.id = p_restaurant_id;
$$;

revoke all on table public.internal_config from anon, authenticated;
grant select on table public.internal_config to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Harden SECURITY DEFINER RPCs (scanner merge + menu clear)
-- ---------------------------------------------------------------------------

create or replace function public.merge_menu(p_restaurant_id uuid, p_menu jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category jsonb;
  v_item jsonb;
  v_modifier jsonb;
  v_category_id uuid;
  v_item_id uuid;
  v_categories_count int := 0;
  v_items_count int := 0;
  v_modifiers_count int := 0;
  v_sort_order int := 0;
begin
  if not public.is_service_role()
     and not public.auth_user_can_access_restaurant(p_restaurant_id) then
    raise exception 'forbidden';
  end if;

  if p_menu is null or jsonb_typeof(p_menu->'categories') <> 'array' then
    raise exception 'invalid menu payload: missing categories array';
  end if;

  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'restaurant % not found', p_restaurant_id;
  end if;

  for v_category in select * from jsonb_array_elements(p_menu->'categories')
  loop
    v_categories_count := v_categories_count + 1;
    v_sort_order := coalesce((v_category->>'sort_order')::int, v_categories_count);

    insert into public.categories (restaurant_id, name, sort_order, updated_at)
    values (p_restaurant_id, trim(v_category->>'name'), v_sort_order, now())
    on conflict (restaurant_id, name)
    do update set sort_order = excluded.sort_order, updated_at = now()
    returning id into v_category_id;

    if jsonb_typeof(v_category->'items') = 'array' then
      for v_item in select * from jsonb_array_elements(v_category->'items')
      loop
        v_items_count := v_items_count + 1;

        insert into public.items (
          category_id, name, description, price, is_available, raw_menu_data, updated_at
        ) values (
          v_category_id,
          trim(v_item->>'name'),
          nullif(v_item->>'description', ''),
          nullif(v_item->>'price', '')::numeric,
          coalesce((v_item->>'base_availability')::boolean, true),
          v_item,
          now()
        )
        on conflict (category_id, name)
        do update set
          description = excluded.description,
          price = excluded.price,
          is_available = excluded.is_available,
          raw_menu_data = excluded.raw_menu_data,
          updated_at = now()
        returning id into v_item_id;

        delete from public.modifiers where item_id = v_item_id;

        if jsonb_typeof(v_item->'modifiers') = 'array' then
          for v_modifier in select * from jsonb_array_elements(v_item->'modifiers')
          loop
            v_modifiers_count := v_modifiers_count + 1;
            insert into public.modifiers (
              item_id, group_name, modifier_name, extra_price, min_selection, max_selection
            ) values (
              v_item_id,
              coalesce(nullif(v_modifier->>'group_name', ''), 'Options'),
              trim(v_modifier->>'modifier_name'),
              coalesce(nullif(v_modifier->>'extra_price','')::numeric, 0),
              coalesce((v_modifier->>'min_selection')::int, 0),
              coalesce((v_modifier->>'max_selection')::int, 1)
            );
          end loop;
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'categories', v_categories_count,
    'items', v_items_count,
    'modifiers', v_modifiers_count
  );
end;
$$;

create or replace function public.clear_restaurant_menu(p_restaurant_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int := 0;
begin
  if not public.is_service_role()
     and not public.auth_user_can_access_restaurant(p_restaurant_id) then
    raise exception 'forbidden';
  end if;

  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'restaurant not found';
  end if;

  delete from public.categories
  where restaurant_id = p_restaurant_id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.is_service_role() to anon, authenticated, service_role;
grant execute on function public.auth_user_id() to anon, authenticated, service_role;
grant execute on function public.auth_user_is_org_member(uuid) to anon, authenticated, service_role;
grant execute on function public.auth_user_org_role(uuid) to anon, authenticated, service_role;
grant execute on function public.auth_user_is_org_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.auth_user_can_access_restaurant(uuid) to anon, authenticated, service_role;
grant execute on function public.auth_user_can_access_category(uuid) to anon, authenticated, service_role;
grant execute on function public.auth_user_can_access_item(uuid) to anon, authenticated, service_role;
grant execute on function public.rls_poc_demo_reads_enabled() to anon, authenticated, service_role;
grant execute on function public.rls_legacy_org_demo_select(uuid) to anon, authenticated, service_role;
grant execute on function public.rls_legacy_restaurant_demo_select(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Drop dev-open policies
-- ---------------------------------------------------------------------------

drop policy if exists "public read restaurants" on public.restaurants;
drop policy if exists "public insert restaurants" on public.restaurants;
drop policy if exists "public read categories" on public.categories;
drop policy if exists "public insert categories" on public.categories;
drop policy if exists "public update categories" on public.categories;
drop policy if exists "public delete categories" on public.categories;
drop policy if exists "public read items" on public.items;
drop policy if exists "public insert items" on public.items;
drop policy if exists "public update items" on public.items;
drop policy if exists "public read modifiers" on public.modifiers;
drop policy if exists "public insert modifiers" on public.modifiers;
drop policy if exists "public read draft_orders" on public.draft_orders;
drop policy if exists "public insert draft_orders" on public.draft_orders;
drop policy if exists "public update draft_orders" on public.draft_orders;
drop policy if exists "public read phone_order_receipts" on public.phone_order_receipts;
drop policy if exists "public read organizations" on public.organizations;
drop policy if exists "public insert organizations" on public.organizations;
drop policy if exists "public update organizations" on public.organizations;
drop policy if exists "public read profiles" on public.profiles;
drop policy if exists "public insert profiles" on public.profiles;
drop policy if exists "public update profiles" on public.profiles;
drop policy if exists "public read memberships" on public.memberships;
drop policy if exists "public insert memberships" on public.memberships;
drop policy if exists "public update memberships" on public.memberships;
drop policy if exists "public delete memberships" on public.memberships;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

create policy "org_select_member"
  on public.organizations for select
  using (
    public.auth_user_is_org_member(id)
    or public.rls_legacy_org_demo_select(id)
  );

create policy "org_insert_authenticated"
  on public.organizations for insert
  with check (public.auth_user_id() is not null);

create policy "org_update_admin"
  on public.organizations for update
  using (public.auth_user_is_org_admin(id))
  with check (public.auth_user_is_org_admin(id));

create policy "org_delete_owner"
  on public.organizations for delete
  using (public.auth_user_org_role(id) = 'owner');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create policy "profile_select_self_or_teammate"
  on public.profiles for select
  using (
    id = public.auth_user_id()
    or exists (
      select 1
      from public.memberships mine
      join public.memberships theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = public.auth_user_id()
        and theirs.user_id = profiles.id
    )
  );

create policy "profile_insert_self"
  on public.profiles for insert
  with check (id = public.auth_user_id());

create policy "profile_update_self"
  on public.profiles for update
  using (id = public.auth_user_id())
  with check (id = public.auth_user_id());

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------

create policy "membership_select_same_org"
  on public.memberships for select
  using (public.auth_user_is_org_member(organization_id));

create policy "membership_insert_admin_or_bootstrap_owner"
  on public.memberships for insert
  with check (
    (
      user_id = public.auth_user_id()
      and role = 'owner'
      and not exists (
        select 1
        from public.memberships m
        where m.organization_id = memberships.organization_id
      )
    )
    or public.auth_user_is_org_admin(organization_id)
  );

create policy "membership_update_admin"
  on public.memberships for update
  using (public.auth_user_is_org_admin(organization_id))
  with check (public.auth_user_is_org_admin(organization_id));

create policy "membership_delete_admin"
  on public.memberships for delete
  using (public.auth_user_is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------------

create policy "restaurant_select_member_or_demo"
  on public.restaurants for select
  using (
    public.auth_user_is_org_member(organization_id)
    or public.rls_legacy_org_demo_select(organization_id)
  );

create policy "restaurant_insert_member"
  on public.restaurants for insert
  with check (public.auth_user_is_org_member(organization_id));

create policy "restaurant_update_member"
  on public.restaurants for update
  using (public.auth_user_is_org_member(organization_id))
  with check (public.auth_user_is_org_member(organization_id));

create policy "restaurant_delete_admin"
  on public.restaurants for delete
  using (public.auth_user_is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Menu (categories → items → modifiers)
-- ---------------------------------------------------------------------------

create policy "category_select"
  on public.categories for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

create policy "category_insert"
  on public.categories for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "category_update"
  on public.categories for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "category_delete"
  on public.categories for delete
  using (public.auth_user_can_access_restaurant(restaurant_id));

create policy "item_select"
  on public.items for select
  using (
    public.auth_user_can_access_category(category_id)
    or exists (
      select 1
      from public.categories c
      where c.id = items.category_id
        and public.rls_legacy_restaurant_demo_select(c.restaurant_id)
    )
  );

create policy "item_insert"
  on public.items for insert
  with check (public.auth_user_can_access_category(category_id));

create policy "item_update"
  on public.items for update
  using (public.auth_user_can_access_category(category_id))
  with check (public.auth_user_can_access_category(category_id));

create policy "item_delete"
  on public.items for delete
  using (public.auth_user_can_access_category(category_id));

create policy "modifier_select"
  on public.modifiers for select
  using (
    public.auth_user_can_access_item(item_id)
    or exists (
      select 1
      from public.items i
      join public.categories c on c.id = i.category_id
      where i.id = modifiers.item_id
        and public.rls_legacy_restaurant_demo_select(c.restaurant_id)
    )
  );

create policy "modifier_insert"
  on public.modifiers for insert
  with check (public.auth_user_can_access_item(item_id));

create policy "modifier_update"
  on public.modifiers for update
  using (public.auth_user_can_access_item(item_id))
  with check (public.auth_user_can_access_item(item_id));

create policy "modifier_delete"
  on public.modifiers for delete
  using (public.auth_user_can_access_item(item_id));

-- ---------------------------------------------------------------------------
-- Draft orders + receipts
-- ---------------------------------------------------------------------------

create policy "draft_order_select"
  on public.draft_orders for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

create policy "draft_order_insert"
  on public.draft_orders for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "draft_order_update"
  on public.draft_orders for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "receipt_select"
  on public.phone_order_receipts for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

-- Receipt inserts: Edge finalize-order only (service role bypasses RLS).
