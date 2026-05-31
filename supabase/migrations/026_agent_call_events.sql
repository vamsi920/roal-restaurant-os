-- ROAL :: 026_agent_call_events
-- Canonical call rows for ElevenLabs/Twilio webhooks; derived sessions backfill until ingested.

create table public.agent_call_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  agent_id text,
  conversation_id text not null,
  session_id text not null,
  caller_phone text,
  status text not null default 'active'
    constraint agent_call_events_status_check
    check (status in ('active', 'ended')),
  outcome text not null default 'unknown'
    constraint agent_call_events_outcome_check
    check (
      outcome in (
        'in_progress',
        'order_completed',
        'abandoned',
        'canceled',
        'no_order',
        'unknown'
      )
    ),
  started_at timestamptz not null,
  ended_at timestamptz,
  transcript_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_call_events_session_id_len check (char_length(session_id) <= 128),
  constraint agent_call_events_conversation_id_len check (
    char_length(conversation_id) <= 128
  ),
  unique (restaurant_id, session_id)
);

create index agent_call_events_restaurant_started_idx
  on public.agent_call_events (restaurant_id, started_at desc);

create index agent_call_events_agent_started_idx
  on public.agent_call_events (agent_id, started_at desc)
  where agent_id is not null;

alter table public.agent_call_events enable row level security;

create policy "agent_call_events_select"
  on public.agent_call_events for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

-- Inserts/updates: Edge webhooks (service role) or future operator tools.
create policy "agent_call_events_insert"
  on public.agent_call_events for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "agent_call_events_update"
  on public.agent_call_events for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));

comment on table public.agent_call_events is
  'Per-call record for voice agent sessions. Prefer lib/agent-calls derive from draft_orders, receipts, and usage_events; use this table when webhook transcript metadata or explicit outcomes are available.';

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'agent_call_events'
  ) then
    alter publication supabase_realtime add table public.agent_call_events;
  end if;
end $$;
