-- ROAL :: 014_modifier_group_ordering
-- Order modifier groups and options within groups (flat modifiers rows).

alter table public.modifiers
  add column if not exists sort_order integer not null default 0,
  add column if not exists group_sort_order integer not null default 0;

create index if not exists modifiers_item_group_sort_idx
  on public.modifiers (item_id, group_sort_order, sort_order);

with ranked_groups as (
  select distinct
    item_id,
    group_name,
    dense_rank() over (
      partition by item_id
      order by group_name asc
    ) as gsort
  from public.modifiers
)
update public.modifiers m
set group_sort_order = rg.gsort
from ranked_groups rg
where m.item_id = rg.item_id
  and m.group_name = rg.group_name;

with ranked_options as (
  select
    id,
    row_number() over (
      partition by item_id, group_name
      order by modifier_name asc, id asc
    ) as osort
  from public.modifiers
)
update public.modifiers m
set sort_order = ro.osort
from ranked_options ro
where m.id = ro.id;
