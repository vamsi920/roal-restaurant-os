-- ROAL :: 017_order_status_timestamps
-- Kitchen milestone timestamps for phone orders.

alter table public.draft_orders
  add column if not exists accepted_at timestamptz,
  add column if not exists in_progress_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists canceled_at timestamptz;
