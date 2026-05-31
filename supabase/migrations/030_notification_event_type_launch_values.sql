-- ROAL :: 030_notification_event_type_launch_values
-- Keep notification enum in sync with launch operational events.

alter type public.notification_event_type
  add value if not exists 'provision_failure';

alter type public.notification_event_type
  add value if not exists 'menu_auto_sync_failure';

alter type public.notification_event_type
  add value if not exists 'go_live';

alter type public.notification_event_type
  add value if not exists 'staff_handoff_requested';
