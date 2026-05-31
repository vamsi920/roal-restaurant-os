-- ROAL :: restaurant reservation requests
-- Captures reservation requests from the phone agent without claiming a confirmed table.

create table public.restaurant_reservation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id text,
  conversation_id text,
  customer_name text not null,
  customer_phone text not null,
  party_size integer not null
    constraint restaurant_reservation_requests_party_size_check
    check (party_size >= 1 and party_size <= 100),
  requested_date text not null,
  requested_time text not null,
  notes text,
  status text not null default 'requested'
    constraint restaurant_reservation_requests_status_check
    check (status in ('requested', 'confirmed', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurant_reservation_requests_restaurant_created_idx
  on public.restaurant_reservation_requests (restaurant_id, created_at desc);

create index restaurant_reservation_requests_org_created_idx
  on public.restaurant_reservation_requests (organization_id, created_at desc);

create index restaurant_reservation_requests_session_idx
  on public.restaurant_reservation_requests (restaurant_id, session_id)
  where session_id is not null;

alter table public.restaurant_reservation_requests enable row level security;

create policy "restaurant_reservation_requests_select_member"
  on public.restaurant_reservation_requests for select
  using (public.auth_user_is_org_member(organization_id));

create policy "restaurant_reservation_requests_insert_member"
  on public.restaurant_reservation_requests for insert
  with check (
    public.auth_user_is_org_member(organization_id)
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.organization_id = organization_id
    )
  );

create policy "restaurant_reservation_requests_update_admin"
  on public.restaurant_reservation_requests for update
  using (public.auth_user_is_org_admin(organization_id))
  with check (
    public.auth_user_is_org_admin(organization_id)
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.organization_id = organization_id
    )
  );
