-- ROAL :: 025_restaurant_profile_voice_agent_lifecycle
-- Per-restaurant ElevenLabs provision + menu auto-sync lifecycle (manual sync columns unchanged).

alter table public.restaurant_profiles
  add column if not exists elevenlabs_provision_status text
    constraint restaurant_profiles_elevenlabs_provision_status_check
    check (
      elevenlabs_provision_status is null
      or elevenlabs_provision_status in (
        'pending',
        'provisioning',
        'ready',
        'failed'
      )
    ),
  add column if not exists elevenlabs_provision_error text,
  add column if not exists elevenlabs_provisioned_at timestamptz,
  add column if not exists elevenlabs_menu_auto_sync_status text
    constraint restaurant_profiles_elevenlabs_menu_auto_sync_status_check
    check (
      elevenlabs_menu_auto_sync_status is null
      or elevenlabs_menu_auto_sync_status in (
        'pending',
        'syncing',
        'succeeded',
        'failed'
      )
    ),
  add column if not exists elevenlabs_menu_auto_sync_error text;

comment on column public.restaurant_profiles.elevenlabs_provision_status is
  'Voice agent provision lifecycle: pending → provisioning → ready | failed.';
comment on column public.restaurant_profiles.elevenlabs_provisioned_at is
  'When provision last reached ready (null if never).';
comment on column public.restaurant_profiles.elevenlabs_menu_auto_sync_status is
  'Last automatic menu→agent sync attempt (distinct from operator elevenlabs_last_sync_*).';
