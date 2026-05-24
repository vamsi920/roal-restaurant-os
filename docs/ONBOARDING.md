# Onboarding data model

Migration: `supabase/migrations/010_onboarding.sql`  
Helpers: `lib/onboarding/`

## Tables

| Table | Scope | Steps |
|-------|--------|--------|
| `organization_onboarding` | One row per org | `account` |
| `restaurant_onboarding` | One row per restaurant | `restaurant_profile`, `menu_import`, `voice_agent`, `test_call`, `go_live` |

Each row stores:

- `steps` — JSON map of step key → `{ status, completed_at?, metadata? }`
- `current_step` — next incomplete step (null when all terminal)
- `completed_at` — set when every step is `completed` or `skipped`

### Step statuses

`pending` | `in_progress` | `completed` | `skipped`

## Provisioning

- **Triggers** create onboarding rows on new `organizations` / `restaurants`.
- **Backfill** in migration seeds existing orgs/restaurants.
- **`ensureOrganizationOnboarding` / `ensureRestaurantOnboarding`** idempotent helpers if a row is missing.

## Helpers

| Function | Use |
|----------|-----|
| `getOrganizationOnboarding` / `getRestaurantOnboarding` | Load + normalize steps |
| `updateOrganizationOnboardingStep` / `updateRestaurantOnboardingStep` | Set status, recompute `current_step` |
| `computeOnboardingProgress` / `organizationOnboardingProgress` | `{ completed, total, percent, nextStep }` |
| `completeOrganizationAccountStep` | Mark org `account` done |
| `lib/onboarding/server.ts` | Session-scoped wrappers using `createServerSupabase()` |

## Apply

Part of `supabase db push` (migration `010_onboarding.sql`).

## Wizard UI

Route: `/dashboard/onboarding` (optional `?restaurant=<uuid>`)

- `lib/onboarding/wizard-state.server.ts` — load resumable state, resolve active step
- `app/dashboard/onboarding/actions.ts` — server actions (create org, restaurant, advance steps)
- `components/onboarding/onboarding-wizard.tsx` — guided UI with loading/error states
