-- ROAL :: 024_fix_membership_bootstrap_rls
-- Bootstrap owner check must bypass RLS on memberships (see docs/RLS.md).

create or replace function public.organization_has_members(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = p_organization_id
  );
$$;

grant execute on function public.organization_has_members(uuid) to authenticated, service_role;

drop policy if exists "membership_insert_admin_or_bootstrap_owner" on public.memberships;

create policy "membership_insert_admin_or_bootstrap_owner"
  on public.memberships for insert
  with check (
    (
      user_id = public.auth_user_id()
      and role = 'owner'
      and not public.organization_has_members(organization_id)
    )
    or public.auth_user_is_org_admin(organization_id)
  );

-- Users created before migration 008 may lack profile rows (trigger only runs on insert).
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
