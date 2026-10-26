-- ROAL :: 035_agent_trials_and_persona
-- Magic onboarding: anonymous "try a call" trials built from a restaurant link,
-- per-restaurant agent persona (voice + name), and unanswered-question suggestions.

create table if not exists public.agent_trials (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  source_input text not null,
  source_kind text not null
    constraint agent_trials_source_kind_check
    check (source_kind in ('website', 'maps', 'name_city', 'manual')),
  status text not null default 'resolving'
    constraint agent_trials_status_check
    check (status in ('resolving', 'ready', 'failed', 'claimed')),
  step_log jsonb not null default '[]'::jsonb,
  restaurant_name text,
  profile jsonb,
  weekly_hours jsonb,
  menu jsonb,
  menu_source text,
  menu_source_url text,
  knowledge jsonb not null default '[]'::jsonb,
  persona jsonb not null default '{}'::jsonb,
  prompt text,
  greeting text,
  place_id text,
  transcript jsonb,
  scorecard jsonb not null default '{}'::jsonb,
  call_count integer not null default 0,
  claimed_restaurant_id uuid references public.restaurants (id) on delete set null,
  claimed_organization_id uuid references public.organizations (id) on delete set null,
  claimed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists agent_trials_created_idx on public.agent_trials (created_at desc);
create index if not exists agent_trials_claimed_idx on public.agent_trials (claimed_restaurant_id);

-- Service-role only: no policies on purpose.
alter table public.agent_trials enable row level security;

-- Persona on the real restaurant profile (applied to the dedicated agent on sync).
alter table public.restaurant_profiles
  add column if not exists agent_display_name text,
  add column if not exists agent_voice_id text,
  add column if not exists agent_voice_label text,
  add column if not exists agent_greeting text,
  add column if not exists trial_scorecard jsonb not null default '{}'::jsonb,
  add column if not exists source_trial_id uuid references public.agent_trials (id) on delete set null;

-- Unanswered-question suggestions mined from call transcripts (approve -> knowledge entry).
create table if not exists public.restaurant_knowledge_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  session_id text,
  caller_question text not null,
  suggested_question text not null,
  suggested_answer text,
  category text not null default 'general'
    constraint restaurant_knowledge_suggestions_category_check
    check (category in ('general','hours','menu','allergens','directions','policies','handoff')),
  status text not null default 'pending'
    constraint restaurant_knowledge_suggestions_status_check
    check (status in ('pending', 'accepted', 'dismissed')),
  times_asked integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurant_knowledge_suggestions_restaurant_idx
  on public.restaurant_knowledge_suggestions (restaurant_id, status, created_at desc);

alter table public.restaurant_knowledge_suggestions enable row level security;

create policy "restaurant_knowledge_suggestions_select"
  on public.restaurant_knowledge_suggestions for select
  using (public.auth_user_can_access_restaurant(restaurant_id));

create policy "restaurant_knowledge_suggestions_update"
  on public.restaurant_knowledge_suggestions for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "restaurant_knowledge_suggestions_insert"
  on public.restaurant_knowledge_suggestions for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "restaurant_knowledge_suggestions_delete"
  on public.restaurant_knowledge_suggestions for delete
  using (public.auth_user_can_access_restaurant(restaurant_id));
