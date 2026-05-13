-- ROAL :: 002_merge_menu_rpc
-- Atomic upsert/merge of a full menu payload (the "moat").
-- One transaction => no orphaned rows on partial failure.

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

grant execute on function public.merge_menu(uuid, jsonb) to anon, authenticated, service_role;
