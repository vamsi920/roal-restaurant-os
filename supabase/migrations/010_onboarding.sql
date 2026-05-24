-- ROAL :: 010_onboarding
-- Onboarding progress for organizations (account) and restaurants (setup → go-live).

create type public.onboarding_step_status as enum (
  'pending',
  'in_progress',
  'completed',
  'skipped'
);

-- ---------------------------------------------------------------------------
-- Organization onboarding (account / tenant setup)
-- ---------------------------------------------------------------------------

create table public.organization_onboarding (
  organization_id uuid primary key
    references public.organizations (id) on delete cascade,
  steps jsonb not null default '{}'::jsonb,
  current_step text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint organization_onboarding_steps_object check (jsonb_typeof(steps) = 'object')
);

create index organization_onboarding_updated_idx
  on public.organization_onboarding (updated_at desc);

-- ---------------------------------------------------------------------------
-- Restaurant onboarding (location setup)
-- ---------------------------------------------------------------------------

create table public.restaurant_onboarding (
  restaurant_id uuid primary key
    references public.restaurants (id) on delete cascade,
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  steps jsonb not null default '{}'::jsonb,
  current_step text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint restaurant_onboarding_steps_object check (jsonb_typeof(steps) = 'object')
);

create index restaurant_onboarding_organization_id_idx
  on public.restaurant_onboarding (organization_id);

create index restaurant_onboarding_updated_idx
  on public.restaurant_onboarding (updated_at desc);

-- ---------------------------------------------------------------------------
-- Backfill existing tenants
-- ---------------------------------------------------------------------------

insert into public.organization_onboarding (organization_id, steps, current_step)
select
  o.id,
  jsonb_build_object(
    'account',
    jsonb_build_object('status', 'completed', 'completed_at', o.created_at)
  ),
  'account'
from public.organizations o
on conflict (organization_id) do nothing;

insert into public.restaurant_onboarding (restaurant_id, organization_id, steps, current_step)
select
  r.id,
  r.organization_id,
  jsonb_build_object(
    'restaurant_profile', jsonb_build_object('status', 'pending'),
    'menu_import', jsonb_build_object('status', 'pending'),
    'voice_agent', jsonb_build_object('status', 'pending'),
    'test_call', jsonb_build_object('status', 'pending'),
    'go_live', jsonb_build_object('status', 'pending')
  ),
  'restaurant_profile'
from public.restaurants r
on conflict (restaurant_id) do nothing;

-- ---------------------------------------------------------------------------
-- Auto-provision on new org / restaurant
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_organization_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_onboarding (organization_id, steps, current_step)
  values (
    new.id,
    jsonb_build_object(
      'account',
      jsonb_build_object('status', 'in_progress')
    ),
    'account'
  )
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger on_organization_created_onboarding
  after insert on public.organizations
  for each row
  execute function public.handle_new_organization_onboarding();

create or replace function public.handle_new_restaurant_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.restaurant_onboarding (restaurant_id, organization_id, steps, current_step)
  values (
    new.id,
    new.organization_id,
    jsonb_build_object(
      'restaurant_profile', jsonb_build_object('status', 'pending'),
      'menu_import', jsonb_build_object('status', 'pending'),
      'voice_agent', jsonb_build_object('status', 'pending'),
      'test_call', jsonb_build_object('status', 'pending'),
      'go_live', jsonb_build_object('status', 'pending')
    ),
    'restaurant_profile'
  )
  on conflict (restaurant_id) do nothing;
  return new;
end;
$$;

create trigger on_restaurant_created_onboarding
  after insert on public.restaurants
  for each row
  execute function public.handle_new_restaurant_onboarding();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organization_onboarding enable row level security;
alter table public.restaurant_onboarding enable row level security;

create policy "org_onboarding_select"
  on public.organization_onboarding for select
  using (
    public.auth_user_is_org_member(organization_id)
    or public.rls_legacy_org_demo_select(organization_id)
  );

create policy "org_onboarding_insert"
  on public.organization_onboarding for insert
  with check (public.auth_user_is_org_member(organization_id));

create policy "org_onboarding_update"
  on public.organization_onboarding for update
  using (public.auth_user_is_org_member(organization_id))
  with check (public.auth_user_is_org_member(organization_id));

create policy "restaurant_onboarding_select"
  on public.restaurant_onboarding for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

create policy "restaurant_onboarding_insert"
  on public.restaurant_onboarding for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "restaurant_onboarding_update"
  on public.restaurant_onboarding for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));
