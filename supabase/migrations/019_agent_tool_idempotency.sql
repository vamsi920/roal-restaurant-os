-- Idempotency cache for voice-agent tool POSTs (replay protection).
create table if not exists public.agent_tool_idempotency (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  idempotency_key text not null,
  tool_name text not null,
  response_body jsonb not null,
  http_status smallint not null default 200,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, idempotency_key)
);

create index if not exists agent_tool_idempotency_created_at_idx
  on public.agent_tool_idempotency (created_at);

alter table public.agent_tool_idempotency enable row level security;

-- Service role / Edge only; no tenant policies (same pattern as draft_orders tooling).
comment on table public.agent_tool_idempotency is
  'Caches agent tool responses by idempotency key to suppress duplicate writes on webhook retries.';
