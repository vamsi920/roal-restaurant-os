-- ROAL :: 033_notification_phone_followup_events
-- Phone command-center follow-up alerts for owners.

alter type public.notification_event_type
  add value if not exists 'voicemail_callback';

alter type public.notification_event_type
  add value if not exists 'reservation_request';

alter type public.notification_event_type
  add value if not exists 'catering_inquiry';

alter type public.notification_event_type
  add value if not exists 'complaint_caller';

alter type public.notification_event_type
  add value if not exists 'call_review_needed';

alter type public.notification_event_type
  add value if not exists 'stuck_active_call';

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
    'staff_handoff_requested'::public.notification_event_type,
    'voicemail_callback'::public.notification_event_type,
    'reservation_request'::public.notification_event_type,
    'catering_inquiry'::public.notification_event_type,
    'complaint_caller'::public.notification_event_type,
    'call_review_needed'::public.notification_event_type,
    'stuck_active_call'::public.notification_event_type
  ];

update public.notification_settings
set
  enabled_events = (
    select array_agg(distinct e)
    from unnest(
      enabled_events || array[
        'voicemail_callback'::public.notification_event_type,
        'reservation_request'::public.notification_event_type,
        'catering_inquiry'::public.notification_event_type,
        'complaint_caller'::public.notification_event_type,
        'call_review_needed'::public.notification_event_type,
        'stuck_active_call'::public.notification_event_type
      ]
    ) as e
  ),
  updated_at = now()
where not (
  'voicemail_callback'::public.notification_event_type = any(enabled_events)
  and 'reservation_request'::public.notification_event_type = any(enabled_events)
  and 'catering_inquiry'::public.notification_event_type = any(enabled_events)
  and 'complaint_caller'::public.notification_event_type = any(enabled_events)
  and 'call_review_needed'::public.notification_event_type = any(enabled_events)
  and 'stuck_active_call'::public.notification_event_type = any(enabled_events)
);
