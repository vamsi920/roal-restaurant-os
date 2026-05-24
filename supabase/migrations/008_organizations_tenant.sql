-- ROAL :: 008_organizations_tenant
-- Multi-tenant foundation: organizations, profiles, memberships, restaurant ownership.
-- Existing POC restaurants are assigned to a legacy organization (see docs/TENANT_SCHEMA.md).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.membership_role as enum ('owner', 'admin', 'member');

-- ---------------------------------------------------------------------------
-- Core tenant tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (
    slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create unique index organizations_slug_key on public.organizations (slug)
  where slug is not null;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null default 'member',
  created_at timestamptz not null default now(),
  constraint memberships_organization_user_key unique (organization_id, user_id)
);

create index memberships_organization_id_idx on public.memberships (organization_id);
create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_user_org_role_idx on public.memberships (user_id, organization_id, role);

-- ---------------------------------------------------------------------------
-- Restaurant ownership (organization scope)
-- ---------------------------------------------------------------------------

-- Stable id for backfill + default inserts until auth/onboarding pass explicit org ids.
insert into public.organizations (id, name, slug)
values (
  '00000000-0000-4000-8000-000000000001',
  'Legacy POC',
  'legacy-poc'
)
on conflict (id) do nothing;

alter table public.restaurants
  add column if not exists organization_id uuid;

update public.restaurants
set organization_id = '00000000-0000-4000-8000-000000000001'
where organization_id is null;

alter table public.restaurants
  alter column organization_id set not null;

alter table public.restaurants
  add constraint restaurants_organization_id_fkey
  foreign key (organization_id) references public.organizations (id) on delete cascade;

alter table public.restaurants
  alter column organization_id set default '00000000-0000-4000-8000-000000000001';

create index if not exists restaurants_organization_id_idx
  on public.restaurants (organization_id);

create index if not exists restaurants_org_created_idx
  on public.restaurants (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS (dev-open; replace with org-scoped policies in a later migration)
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

create policy "public read organizations"
  on public.organizations for select using (true);

create policy "public insert organizations"
  on public.organizations for insert with check (true);

create policy "public update organizations"
  on public.organizations for update using (true);

create policy "public read profiles"
  on public.profiles for select using (true);

create policy "public insert profiles"
  on public.profiles for insert with check (true);

create policy "public update profiles"
  on public.profiles for update using (true);

create policy "public read memberships"
  on public.memberships for select using (true);

create policy "public insert memberships"
  on public.memberships for insert with check (true);

create policy "public update memberships"
  on public.memberships for update using (true);

create policy "public delete memberships"
  on public.memberships for delete using (true);

-- ---------------------------------------------------------------------------
-- Auth hook: auto-create profile row (optional; safe if trigger already exists)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
