-- ROAL :: 015_menu_import_audits
-- Persist menu scan uploads and extraction/merge audit trail.

create table public.menu_imports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants (id) on delete cascade,
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  uploaded_by uuid references auth.users (id) on delete set null,
  storage_bucket text not null default 'menu-uploads',
  storage_path text not null,
  original_filename text,
  file_size_bytes bigint,
  mime_type text,
  model_used text,
  extraction_status text not null default 'pending'
    constraint menu_imports_status_check check (
      extraction_status in (
        'pending',
        'uploaded',
        'extracted',
        'extraction_failed',
        'committed',
        'commit_failed',
        'discarded'
      )
    ),
  extraction_error text,
  extracted_menu jsonb,
  review_hints jsonb,
  extraction_summary jsonb,
  merge_result jsonb,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_imports_restaurant_created_idx
  on public.menu_imports (restaurant_id, created_at desc);

create index menu_imports_org_created_idx
  on public.menu_imports (organization_id, created_at desc);

alter table public.menu_imports enable row level security;

create policy "menu_import_select"
  on public.menu_imports for select
  using (public.auth_user_can_access_restaurant(restaurant_id));

create policy "menu_import_insert"
  on public.menu_imports for insert
  with check (public.auth_user_can_access_restaurant(restaurant_id));

create policy "menu_import_update"
  on public.menu_imports for update
  using (public.auth_user_can_access_restaurant(restaurant_id))
  with check (public.auth_user_can_access_restaurant(restaurant_id));

-- Private bucket for original menu images (path: {restaurant_id}/{import_id}/filename)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-uploads',
  'menu-uploads',
  false,
  8388608,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "menu_uploads_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'menu-uploads'
    and public.auth_user_can_access_restaurant(
      (storage.foldername (name))[1]::uuid
    )
  );

create policy "menu_uploads_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'menu-uploads'
    and public.auth_user_can_access_restaurant(
      (storage.foldername (name))[1]::uuid
    )
  );

create policy "menu_uploads_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'menu-uploads'
    and public.auth_user_can_access_restaurant(
      (storage.foldername (name))[1]::uuid
    )
  );

create policy "menu_uploads_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'menu-uploads'
    and public.auth_user_can_access_restaurant(
      (storage.foldername (name))[1]::uuid
    )
  );
