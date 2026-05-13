-- Guest identity on finalized voice orders
alter table public.draft_orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text;
