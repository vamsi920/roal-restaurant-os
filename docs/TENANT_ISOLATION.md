# Tenant isolation (after Supabase)

Replaces `docs/RLS.md`. Postgres Row Level Security is gone: `getDb()` (`lib/db`) runs every
query with full privileges against Firestore (or the in-memory demo store). **Nothing filters
rows by tenant automatically.** Isolation is now enforced in application code, at the
entrypoint, before any read or write.

## The rule

Every `getDb()` / `.from(...)` call in a server action, route handler, server component or
loader must be one of:

1. **Scoped to a verified restaurant**: the restaurant id was passed through
   `requireRestaurantAccess(id)` (route handlers and actions) or
   `getRestaurantAccessForPage(id)` (server components). The query then filters by
   `restaurant_id` (or by category or item ids loaded for that restaurant).
2. **Scoped to a verified organization**: the org id came from the caller's memberships
   (`getAuthContext().memberships`, `findMembershipForOrg`, `resolveOrganizationId`). The
   query filters by `organization_id`.
3. **Platform staff only**: gated by `hasOrgAdminAccess` / `requireOrgAdminAccess`, or the
   ops bearer token (`lib/auth/internal-access.ts`).
4. **Server-to-server**: verified by signature or secret (ElevenLabs webhooks), by an
   agent-tool token (`app/api/agent-tools/**`), or by a trial cookie token (`app/api/try/**`).

Child rows addressed by their own id (order, import, item, category, modifier, suggestion,
reservation) must also be checked against the verified restaurant. Either add
`.eq("restaurant_id", ...)` to the query, or use `assertCategoryInRestaurant` /
`assertItemInRestaurant` (`lib/menu-editor/scope.ts`) or `getMenuImportForRestaurant`.

Membership rows are only ever read for `user_id = caller` (`loadUserMemberships`).

## Access helpers (`lib/auth/context-server.ts`)

| Helper | Use | Result |
|---|---|---|
| `requireRestaurantAccess(id, { requireAdmin? })` | API routes, server actions | 401 signed out · 404 unknown · 403 other tenant or member when admin is required |
| `getRestaurantAccessForPage(id)` | server components | `null` → `notFound()` |
| `getAuthContext()` | org-level pages | the user's own memberships only |
| `findMembershipForOrg` / `resolveOrganizationId` | org ids from input | rejects orgs the caller isn't in |
| `authorizeInternalOpsRequest(req)` (`lib/auth/internal-access.ts`) | platform routes | ops bearer **or** platform-admin session; fails closed |

## What changed in this pass

### Live views (browser Supabase client removed)

The browser used to query tables directly and subscribe to `postgres_changes`, relying on
RLS. `lib/supabase/client.ts` is deleted. Live views now poll access-checked endpoints
through `lib/live/use-poll.ts`. The hook polls every 3 s while the tab is visible and every
15 s while it is hidden. It refetches on focus and visibility, aborts in-flight requests,
backs off on errors, and exposes `connecting | live | degraded` for the badges.

| Endpoint | Guard | Used by |
|---|---|---|
| `GET /api/restaurants/[id]/live/orders` | `requireRestaurantAccess` | Kitchen (`LiveOrdersPanel`): drafts, receipts, call evidence, active calls |
| `GET /api/restaurants/[id]/live/menu` | `requireRestaurantAccess` | `useLiveMenu` (menu board / `LiveMenuSidebar`) |
| `GET /api/restaurants/[id]/live/call-status` | `requireRestaurantAccess` | `MenuSetupCallIndicator` |
| `GET /api/restaurants/locations` | `requireAuthContext` + membership org ids | All locations (`LocationsList`) |

**All locations** (`app/dashboard/restaurants/page.tsx`) is now a server component that calls
`loadLocationsForContext`, scoped with `.in("organization_id", <caller's orgs>)`. Before,
it ran `from("restaurants").select("*")` in the browser with no org filter and subscribed
to table-wide realtime channels.

### Fixes to code that relied on RLS

| # | Severity | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | High | `lib/auth/claim-legacy-org.ts` (called on every `getAuthContext`) | Any signed-in user with no memberships was inserted as **owner** of the Legacy POC org. The "only while the org has zero members" rule lived in an RLS policy. | Claims only if the org exists and has zero members. Re-checks after insert and backs out if another user claimed it at the same moment. |
| 2 | High | `app/api/integrations/elevenlabs/agent` GET/PATCH | No auth: anyone could read or patch **any** ElevenLabs agent (prompt, tools, first message) with the server key. | `authorizeInternalOpsRequest`: ops bearer or platform-admin session. |
| 3 | High | `app/api/integrations/elevenlabs/sync-roal-tools` | Open when `ELEVENLABS_SYNC_TOKEN` was unset. Anyone could bind any `restaurant_id` to any agent. | Fails closed: bearer token or platform-admin session required. |
| 4 | High | `connectVoiceAgentAction` (`voice-agent-actions.ts`) | A member could enter another tenant's agent id. The sync then rewrote that agent and linked it to the member's location. | Rejects an agent id already stored on another restaurant's profile. |
| 5 | High | `saveRestaurantProfileAction` (onboarding) | Checked membership of `organizationId` but not that `restaurantId` was in it, so another org's profile could be overwritten. | `requireRestaurantInOrganization` before writing. |
| 6 | Medium | `completeMenuImportStepAction` (onboarding) | Same pattern: it updated another org's onboarding row and read its stats. | Same check. |
| 7 | Medium | `lib/elevenlabs/post-call-webhook.ts` | The target restaurant came from payload `restaurant_id` (dynamic variables) ahead of the agent binding, so a crafted call could land transcripts in another tenant. | A dedicated agent's bound restaurant wins. The payload id is used only for the shared template agent. |
| 8 | Medium | `conversation-init` (`isElevenLabsConversationInitAuthorized`) | With the secret unset it allowed every request. It leaks restaurant id and name by phone number and can overwrite a call row. | Fails closed in production when the secret is unset; dev stays open for local testing. |
| 9 | Medium | `lib/get-landing-preview.ts` (unused) | Read the newest restaurant's menu and orders across all tenants for a public page. | Deleted. |
| 10 | Low | `deleteModifierAction` | Read a modifier by id before any access check, so the error message revealed whether an id existed. | Access check first, then ownership via `assertItemInRestaurant`. Both "missing" and "not yours" return the same error. |
| 11 | Low | `app/api/scanner/commit` error path | The catch block patched `menu_imports` by an unverified `import_id`. | Writes only once the import was verified for the restaurant. |
| 12 | Low | `setWizardStepStatusAction` | Wrote any step key into `restaurant_onboarding.steps`. | Validates against `RESTAURANT_ONBOARDING_STEPS`. |
| 13 | Defence in depth | `acceptKnowledgeSuggestionAction` | Final update filtered by id only (already verified above). | Adds `.eq("restaurant_id", ...)`. |

### Audited and found already scoped

These were checked and needed no change:

- **Pages:** `app/dashboard/**` (layout, home, overview, analytics, billing, settings, notifications, onboarding, admin) and every `restaurants/[id]/**` page and loader.
- **Server actions:** hours, profile, persona, status, calls/reservations, knowledge suggestions, voice-agent test harness, menu (category, item and template actions use `assert*InRestaurant` and org-scoped template queries), billing, notification settings.
- **API routes:**
  - `api/restaurants` (POST, `[id]/menu`, `[id]/menu-imports`, `[id]/orders/*`, `lookup/*`)
  - `api/scanner/*`
  - `api/notifications/*`
  - `api/billing/gates`
  - `api/auth/*`
  - `api/try/*` (trial cookie token, every query by `auth.trial.id`)
  - `api/health`
  - `post-call-webhook` (HMAC signature is mandatory)

### Not changed: reported to other owners

| Where | Issue | Owner |
|---|---|---|
| `lib/db/query.ts` | `matchOne` returns `true` for unknown operators, and `eq(col, undefined)` matches rows missing the column. Both fail open if a caller ever passes them. Suggest throwing on unknown operators and on `undefined` filter values. | `lib/db/**` |
| `lib/auth/platform-admin.ts` / `lib/auth/session.ts` | Platform admin is decided by email only, with a hard-coded fallback address. `email_verified` is not checked on the Firebase token. | auth |
| `app/dashboard/settings/notifications` + `lib/notifications/providers/webhook.ts` | An org admin can set any webhook URL (internal IPs included): blind SSRF. | notifications |
| `setDefaultMenuTemplateAction`, `applyTemplateToInheritedLocationsAction` | Any org **member** can change org-wide templates. This is within one tenant, not cross-tenant. Consider `{ requireAdmin: true }`. | menu |
| `app/api/agent-tools/**`, `lib/agent-tools/**`, `lib/voice-agent/test-harness/**`, `control-center*` | Not audited here (other owners). | — |
| Demo mode | `roal_demo_session=demo-owner` signs anyone in when demo mode is on. Never set `ROAL_DEMO_MODE=1` on a deployed host. | ops |

## Tests

- `tests/integration/tenant-isolation-access.test.ts` runs two tenants on the in-memory store
  (`resetMemoryStore`). It covers access helpers (401/403/404, `requireAdmin`), memberships,
  the Legacy POC claim, the live endpoints (403 cross-tenant, 401 signed out), locations
  scoping, the onboarding cross-org writes, cross-tenant modifier delete, agent hijack, the
  post-call agent binding and conversation-init failing closed.
- `tests/integration/api-elevenlabs-agent.test.ts`, `api-sync-roal-tools.test.ts` cover the
  401 for non-staff and the unset-token case.
- `tests/unit/live-poll-schedule.test.ts` covers polling cadence, backoff and badge states.

## Checklist for new code

- Take the restaurant id from the URL, then call `requireRestaurantAccess` (or
  `getRestaurantAccessForPage`) before calling `getDb()`.
- Filter every query by `restaurant_id` / `organization_id`, including updates and deletes by id.
- Never trust an `organization_id` or `restaurant_id` from a body, query string or cookie
  without a membership check.
- Never add a "secret unset = open" branch to a webhook.
- Client components never import `@/lib/db`. Fetch through an access-checked route or server
  action (polling: `usePoll` + `fetchLiveJson`).
