-- ROAL :: reservation request lifecycle — contacted status + member updates

alter table public.restaurant_reservation_requests
  drop constraint restaurant_reservation_requests_status_check;

alter table public.restaurant_reservation_requests
  add constraint restaurant_reservation_requests_status_check
  check (status in ('requested', 'contacted', 'confirmed', 'declined', 'canceled'));

drop policy if exists "restaurant_reservation_requests_update_admin"
  on public.restaurant_reservation_requests;

create policy "restaurant_reservation_requests_update_member"
  on public.restaurant_reservation_requests for update
  using (public.auth_user_is_org_member(organization_id))
  with check (
    public.auth_user_is_org_member(organization_id)
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.organization_id = organization_id
    )
  );
