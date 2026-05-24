-- ROAL :: 018_elevenlabs_agent_on_profile
-- Per-restaurant ElevenLabs agent link + last sync metadata.

alter table public.restaurant_profiles
  add column if not exists elevenlabs_agent_id text,
  add column if not exists elevenlabs_last_sync_at timestamptz,
  add column if not exists elevenlabs_last_sync_error text,
  add column if not exists elevenlabs_last_sync_summary jsonb;
