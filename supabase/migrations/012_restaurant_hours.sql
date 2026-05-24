-- ROAL :: 012_restaurant_hours
-- Weekly hours, date exceptions, and temporary closure flags.

alter table public.restaurant_profiles
  add column if not exists temporarily_closed boolean not null default false,
  add column if not exists temporarily_closed_reason text;

create table public.restaurant_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants (id) on delete cascade,
  day_of_week smallint not null
    constraint restaurant_weekly_hours_dow_check
    check (day_of_week >= 0 and day_of_week <= 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_weekly_hours_unique unique (restaurant_id, day_of_week),
  constraint restaurant_weekly_hours_times_check check (
    is_closed
    or (open_time is not null and close_time is not null)
  )
);

create table public.restaurant_hours_exceptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants (id) on delete cascade,
  exception_date date not null,
  label text,
  is_closed boolean not null default true,
  open_time time,
  close_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_hours_exceptions_unique unique (restaurant_id, exception_date),
  constraint restaurant_hours_exceptions_times_check check (
    is_closed
    or (open_time is not null and close_time is not null)
  )
);

create index restaurant_weekly_hours_restaurant_id_idx
  on public.restaurant_weekly_hours (restaurant_id);

create index restaurant_hours_exceptions_restaurant_date_idx
  on public.restaurant_hours_exceptions (restaurant_id, exception_date);

-- Default Mon–Sun 11:00–21:00 for existing profiles
insert into public.restaurant_weekly_hours (restaurant_id, day_of_week, is_closed, open_time, close_time)
select
  p.restaurant_id,
  d.day_of_week,
  false,
  time '11:00',
  time '21:00'
from public.restaurant_profiles p
cross join generate_series(0, 6) as d(day_of_week)
on conflict (restaurant_id, day_of_week) do nothing;

create or replace function public.seed_restaurant_weekly_hours(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d int;
begin
  for d in 0..6 loop
    insert into public.restaurant_weekly_hours (restaurant_id, day_of_week, is_closed, open_time, close_time)
    values (p_restaurant_id, d, false, time '11:00', time '21:00')
    on conflict (restaurant_id, day_of_week) do nothing;
  end loop;
end;
$$;

create or replace function public.handle_new_restaurant_profile_hours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_restaurant_weekly_hours(new.restaurant_id);
  return new;
end;
$$;

drop trigger if exists on_restaurant_profile_created_hours on public.restaurant_profiles;

create trigger on_restaurant_profile_created_hours
  after insert on public.restaurant_profiles
  for each row
  execute function public.handle_new_restaurant_profile_hours();

-- Backfill weekly hours for profiles created before this migration
do $$
declare
  r record;
begin
  for r in select restaurant_id from public.restaurant_profiles loop
    perform public.seed_restaurant_weekly_hours(r.restaurant_id);
  end loop;
end;
$$;

alter table public.restaurant_weekly_hours enable row level security;
alter table public.restaurant_hours_exceptions enable row level security;

create policy "weekly_hours_select"
  on public.restaurant_weekly_hours for select
  using (public.auth_user_can_access_restaurant(restaurant_id));

create policy "weekly_hours_insert"
  on public.restaurant_weekly_hours for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "weekly_hours_update"
  on public.restaurant_weekly_hours for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "weekly_hours_delete"
  on public.restaurant_weekly_hours for delete
  using (public.auth_user_can_access_restaurant(restaurant_id));

create policy "hours_exceptions_select"
  on public.restaurant_hours_exceptions for select
  using (public.auth_user_can_access_restaurant(restaurant_id));

create policy "hours_exceptions_insert"
  on public.restaurant_hours_exceptions for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "hours_exceptions_update"
  on public.restaurant_hours_exceptions for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "hours_exceptions_delete"
  on public.restaurant_hours_exceptions for delete
  using (public.auth_user_can_access_restaurant(restaurant_id));
