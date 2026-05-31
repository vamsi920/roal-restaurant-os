-- ROAL :: 031_enable_staff_handoff_notifications
-- Enable staff handoff notifications for existing orgs and future defaults.

alter table public.notification_settings
  alter column enabled_events set default array[
    'order_completed'::public.notification_event_type,
    'sync_failure'::public.notification_event_type,
    'scan_failure'::public.notification_event_type,
    'order_stuck'::public.notification_event_type,
    'realtime_degraded'::public.notification_event_type,
    'provision_failure'::public.notification_event_type,
    'menu_auto_sync_failure'::public.notification_event_type,
    'go_live'::public.notification_event_type,
    'staff_handoff_requested'::public.notification_event_type
  ];

update public.notification_settings
set
  enabled_events = case
    when 'staff_handoff_requested'::public.notification_event_type = any(enabled_events)
      then enabled_events
    else array_append(
      enabled_events,
      'staff_handoff_requested'::public.notification_event_type
    )
  end,
  updated_at = now()
where not ('staff_handoff_requested'::public.notification_event_type = any(enabled_events));
