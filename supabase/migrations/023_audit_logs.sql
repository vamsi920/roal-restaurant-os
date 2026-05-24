-- ROAL :: 023_audit_logs
-- Structured audit trail for operator and API actions.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  organization_id uuid references public.organizations (id) on delete set null,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  outcome text not null default 'success'
    constraint audit_logs_outcome_check
    check (outcome in ('success', 'failure', 'denied')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);

create index audit_logs_request_id_idx
  on public.audit_logs (request_id)
  where request_id is not null;

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_org_member"
  on public.audit_logs for select
  using (
    organization_id is null
    or public.auth_user_is_org_member(organization_id)
  );

create policy "audit_logs_insert_authenticated"
  on public.audit_logs for insert
  with check (auth.uid() is not null);
