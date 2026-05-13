-- ROAL :: 006_clear_menu_rpc
-- Single SECURITY DEFINER delete so CASCADE to items/modifiers works regardless
-- of RLS on child tables (anon direct DELETE on categories alone is not enough).

create or replace function public.clear_restaurant_menu(p_restaurant_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int := 0;
begin
  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'restaurant not found';
  end if;

  delete from public.categories
  where restaurant_id = p_restaurant_id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.clear_restaurant_menu(uuid) to anon, authenticated, service_role;
