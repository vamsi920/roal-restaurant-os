-- ROAL :: 022_notifications
-- Org notification settings, delivery log, and provider-ready channels.

create type public.notification_event_type as enum (
  'order_completed',
  'sync_failure',
  'scan_failure',
  'order_stuck',
  'realtime_degraded'
);

create type public.notification_provider_mode as enum (
  'dev_console',
  'production'
);

create table public.notification_settings (
  organization_id uuid primary key
    references public.organizations (id) on delete cascade,
  provider_mode public.notification_provider_mode not null default 'dev_console',
  enabled_events public.notification_event_type[] not null default array[
    'order_completed'::public.notification_event_type,
    'sync_failure'::public.notification_event_type,
    'scan_failure'::public.notification_event_type,
    'order_stuck'::public.notification_event_type,
    'realtime_degraded'::public.notification_event_type
  ],
  channels jsonb not null default '{"dev_console":true,"email":false,"sms":false,"webhook":false}'::jsonb,
  email_recipients text[] not null default '{}',
  sms_recipients text[] not null default '{}',
  webhook_url text,
  order_stuck_minutes integer not null default 30
    constraint notification_settings_stuck_minutes_check
    check (order_stuck_minutes >= 5 and order_stuck_minutes <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  event_type public.notification_event_type not null,
  channel text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'sent'
    constraint notification_deliveries_status_check
    check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint notification_deliveries_idempotency_key_unique unique (idempotency_key)
);

create index notification_deliveries_org_created_idx
  on public.notification_deliveries (organization_id, created_at desc);

create index notification_deliveries_restaurant_created_idx
  on public.notification_deliveries (restaurant_id, created_at desc)
  where restaurant_id is not null;

insert into public.notification_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

alter table public.notification_settings enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "notification_settings_select_member"
  on public.notification_settings for select
  using (public.auth_user_is_org_member(organization_id));

create policy "notification_settings_insert_member"
  on public.notification_settings for insert
  with check (public.auth_user_is_org_member(organization_id));

create policy "notification_settings_update_admin"
  on public.notification_settings for update
  using (public.auth_user_is_org_admin(organization_id))
  with check (public.auth_user_is_org_admin(organization_id));

create policy "notification_deliveries_select_member"
  on public.notification_deliveries for select
  using (public.auth_user_is_org_member(organization_id));

create policy "notification_deliveries_insert_member"
  on public.notification_deliveries for insert
  with check (public.auth_user_is_org_member(organization_id));
