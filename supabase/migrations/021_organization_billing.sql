-- ROAL :: 021_organization_billing
-- Plan and subscription fields on organizations (Stripe-ready, dev-friendly defaults).

create type public.billing_plan_id as enum ('starter', 'growth', 'enterprise');

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused'
);

alter table public.organizations
  add column if not exists billing_plan public.billing_plan_id not null default 'starter',
  add column if not exists subscription_status public.subscription_status not null default 'trialing',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_period_start timestamptz,
  add column if not exists billing_period_end timestamptz;

update public.organizations
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days')
where trial_ends_at is null;

update public.organizations
set billing_period_start = coalesce(
    billing_period_start,
    date_trunc('month', now() at time zone 'utc')
  ),
  billing_period_end = coalesce(
    billing_period_end,
    date_trunc('month', now() at time zone 'utc') + interval '1 month'
  );

create index if not exists organizations_stripe_customer_id_idx
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.organizations.billing_plan is 'Commercial plan tier (maps to Stripe price when connected).';
comment on column public.organizations.subscription_status is 'Subscription lifecycle; dev without Stripe still uses trialing/active in DB.';
