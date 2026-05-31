-- Reusable organization menu templates for multi-location restaurant groups.

create table if not exists public.organization_menu_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_restaurant_id uuid references public.restaurants(id) on delete set null,
  name text not null,
  menu_payload jsonb not null,
  category_count integer not null default 0,
  item_count integer not null default 0,
  modifier_count integer not null default 0,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_menu_templates_name_check check (length(trim(name)) between 2 and 80),
  constraint organization_menu_templates_org_name_unique unique (organization_id, name),
  constraint organization_menu_templates_payload_check check (jsonb_typeof(menu_payload) = 'object')
);

create index if not exists organization_menu_templates_org_created_idx
  on public.organization_menu_templates (organization_id, created_at desc);

create unique index if not exists organization_menu_templates_one_default_per_org_idx
  on public.organization_menu_templates (organization_id)
  where is_default;

alter table public.restaurants
  add column if not exists inherited_menu_template_id uuid references public.organization_menu_templates(id) on delete set null,
  add column if not exists inherited_menu_template_applied_at timestamptz,
  add column if not exists inherited_menu_template_override_count integer not null default 0,
  add column if not exists inherited_menu_template_last_local_edit_at timestamptz;

create index if not exists restaurants_inherited_menu_template_idx
  on public.restaurants (inherited_menu_template_id)
  where inherited_menu_template_id is not null;

alter table public.organization_menu_templates enable row level security;

drop policy if exists "members read organization menu templates" on public.organization_menu_templates;
create policy "members read organization menu templates"
  on public.organization_menu_templates for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_menu_templates.organization_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "admins manage organization menu templates" on public.organization_menu_templates;
create policy "admins manage organization menu templates"
  on public.organization_menu_templates for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_menu_templates.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_menu_templates.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
