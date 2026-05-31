-- ROAL :: 028_restaurant_knowledge_entries
-- Operator-managed FAQ / knowledge snippets used by the voice agent.

create table public.restaurant_knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category text not null default 'general'
    constraint restaurant_knowledge_entries_category_check
    check (
      category in (
        'general',
        'hours',
        'menu',
        'allergens',
        'directions',
        'policies',
        'handoff'
      )
    ),
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_knowledge_entries_question_len
    check (char_length(question) between 2 and 220),
  constraint restaurant_knowledge_entries_answer_len
    check (char_length(answer) between 2 and 1200)
);

create index restaurant_knowledge_entries_restaurant_idx
  on public.restaurant_knowledge_entries (restaurant_id, is_active, sort_order, created_at);

alter table public.restaurant_knowledge_entries enable row level security;

create policy "restaurant_knowledge_entries_select"
  on public.restaurant_knowledge_entries for select
  using (
    public.auth_user_can_access_restaurant(restaurant_id)
    or public.rls_legacy_restaurant_demo_select(restaurant_id)
  );

create policy "restaurant_knowledge_entries_insert"
  on public.restaurant_knowledge_entries for insert
  with check (
    public.auth_user_can_access_restaurant(restaurant_id)
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.organization_id = organization_id
    )
  );

create policy "restaurant_knowledge_entries_update"
  on public.restaurant_knowledge_entries for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (
    public.auth_user_can_access_restaurant(restaurant_id)
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.organization_id = organization_id
    )
  );

create policy "restaurant_knowledge_entries_delete"
  on public.restaurant_knowledge_entries for delete
  using (public.auth_user_can_access_restaurant(restaurant_id));

comment on table public.restaurant_knowledge_entries is
  'Restaurant-specific FAQ and policy knowledge for the voice agent. Stored separately from menu facts so operators can update answers without changing menu items.';
