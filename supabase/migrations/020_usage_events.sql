-- ROAL :: 020_usage_events
-- Append-only usage metering for billing and ops (no secrets in metadata).

create type public.usage_event_type as enum (
  'menu_scan',
  'import_attempt',
  'tool_call',
  'voice_order',
  'order_completed',
  'active_location'
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  event_type public.usage_event_type not null,
  occurred_at timestamptz not null default now(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  constraint usage_events_session_id_len check (
    session_id is null or char_length(session_id) <= 128
  )
);

create index usage_events_org_occurred_idx
  on public.usage_events (organization_id, occurred_at desc);

create index usage_events_restaurant_occurred_idx
  on public.usage_events (restaurant_id, occurred_at desc)
  where restaurant_id is not null;

create index usage_events_type_occurred_idx
  on public.usage_events (event_type, occurred_at desc);

create unique index usage_events_idempotency_key_idx
  on public.usage_events (idempotency_key)
  where idempotency_key is not null;

alter table public.usage_events enable row level security;

create policy "usage_events_select"
  on public.usage_events for select
  using (
    organization_id in (
      select m.organization_id
      from public.memberships m
      where m.user_id = auth.uid()
    )
  );

create policy "usage_events_insert"
  on public.usage_events for insert
  with check (
    organization_id in (
      select m.organization_id
      from public.memberships m
      where m.user_id = auth.uid()
    )
  );

comment on table public.usage_events is
  'Metering events for menu scans, agent tools, voice orders, and active locations. metadata must not contain secrets or PII.';
