-- ROAL :: 027_restaurant_handoff_rules
-- Voice agent handoff / escalation routing on restaurant profile.

alter table public.restaurant_profiles
  add column if not exists handoff_catering_route text,
  add column if not exists handoff_complaint_route text,
  add column if not exists handoff_unavailable_item_behavior text
    constraint restaurant_profiles_handoff_unavailable_behavior_check
    check (
      handoff_unavailable_item_behavior is null
      or handoff_unavailable_item_behavior in (
        'offer_alternative',
        'escalate_to_staff',
        'decline_skip'
      )
    ),
  add column if not exists handoff_unavailable_item_notes text,
  add column if not exists closed_hours_message text;

comment on column public.restaurant_profiles.handoff_catering_route is
  'How the voice agent handles catering / large-party requests.';
comment on column public.restaurant_profiles.handoff_complaint_route is
  'How the voice agent handles complaints and service issues.';
comment on column public.restaurant_profiles.handoff_unavailable_item_behavior is
  'Preset when a guest orders an unavailable or sold-out item.';
comment on column public.restaurant_profiles.handoff_unavailable_item_notes is
  'Optional extra script for unavailable-item handling.';
comment on column public.restaurant_profiles.closed_hours_message is
  'What to say when the guest calls outside regular open hours.';
