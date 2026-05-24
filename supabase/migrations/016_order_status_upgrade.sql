-- ROAL :: 016_order_status_upgrade
-- Expand phone order lifecycle; keep legacy values during rollout.

alter table public.draft_orders
  drop constraint if exists draft_orders_status_check;

alter table public.draft_orders
  add constraint draft_orders_status_check
  check (
    status in (
      'draft',
      'confirmed',
      'new',
      'accepted',
      'in_progress',
      'ready',
      'completed',
      'canceled'
    )
  );

-- Placed voice orders: confirmed -> new (awaiting kitchen acceptance).
update public.draft_orders
set
  status = 'new',
  updated_at = now()
where status = 'confirmed';

create index if not exists draft_orders_restaurant_status_updated_idx
  on public.draft_orders (restaurant_id, status, updated_at desc);
