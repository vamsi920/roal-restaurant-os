-- ROAL :: 011_restaurant_profiles
-- Per-location profile and operational settings for voice agent + KDS.

create table public.restaurant_profiles (
  restaurant_id uuid primary key
    references public.restaurants (id) on delete cascade,
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text not null default 'US',
  timezone text not null default 'America/Chicago',
  cuisine text,
  website text,
  allows_pickup boolean not null default true,
  allows_delivery boolean not null default false,
  prep_time_minutes integer not null default 20
    constraint restaurant_profiles_prep_time_check
    check (prep_time_minutes >= 5 and prep_time_minutes <= 240),
  tax_rate_percent numeric(5, 2) not null default 0
    constraint restaurant_profiles_tax_rate_check
    check (tax_rate_percent >= 0 and tax_rate_percent <= 100),
  service_fee_percent numeric(5, 2) not null default 0
    constraint restaurant_profiles_service_fee_check
    check (service_fee_percent >= 0 and service_fee_percent <= 100),
  escalation_name text,
  escalation_phone text,
  escalation_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurant_profiles_organization_id_idx
  on public.restaurant_profiles (organization_id);

-- Backfill rows for existing restaurants
insert into public.restaurant_profiles (restaurant_id, organization_id)
select r.id, r.organization_id
from public.restaurants r
on conflict (restaurant_id) do nothing;

create or replace function public.handle_new_restaurant_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.restaurant_profiles (restaurant_id, organization_id)
  values (new.id, new.organization_id)
  on conflict (restaurant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_restaurant_created_profile on public.restaurants;

create trigger on_restaurant_created_profile
  after insert on public.restaurants
  for each row
  execute function public.handle_new_restaurant_profile();

alter table public.restaurant_profiles enable row level security;

create policy "restaurant_profile_select"
  on public.restaurant_profiles for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

create policy "restaurant_profile_insert"
  on public.restaurant_profiles for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "restaurant_profile_update"
  on public.restaurant_profiles for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));
