-- Delivery fulfillment context for voice orders.
-- Existing RLS policies remain in force on both tables.

alter table public.draft_orders
  add column if not exists fulfillment_type text,
  add column if not exists delivery_address text,
  add column if not exists delivery_instructions text;

alter table public.draft_orders
  drop constraint if exists draft_orders_fulfillment_type_check;

alter table public.draft_orders
  add constraint draft_orders_fulfillment_type_check
    check (
      fulfillment_type is null
      or fulfillment_type in ('pickup', 'delivery')
    );

alter table public.phone_order_receipts
  add column if not exists fulfillment_type text,
  add column if not exists delivery_address text,
  add column if not exists delivery_instructions text;

alter table public.phone_order_receipts
  drop constraint if exists phone_order_receipts_fulfillment_type_check;

alter table public.phone_order_receipts
  add constraint phone_order_receipts_fulfillment_type_check
    check (
      fulfillment_type is null
      or fulfillment_type in ('pickup', 'delivery')
    );
