# Tenant schema (Firestore collections)

ROAL stores everything in **Cloud Firestore** (or the in-memory demo store) through `getDb()` in `lib/db`. Each former Postgres table is now a **top-level collection with the same name** (`restaurants`, `categories`, `draft_orders`, …). There are no migrations: collections and documents are created on first write. The source of truth for collection metadata is `lib/db/schema.ts`.

## Model

```
organizations
  └── memberships (user_id → profiles, role: owner | admin | member)
  └── restaurants (organization_id, required)
        └── categories → items → modifiers
        └── restaurant_profiles, restaurant_onboarding, restaurant_weekly_hours, restaurant_hours_exceptions
        └── draft_orders, phone_order_receipts, agent_call_events, menu_imports
        └── restaurant_knowledge_entries / _suggestions, restaurant_upsell_rules, restaurant_reservation_requests
  └── organization_onboarding, organization_menu_templates, notification_settings
  └── notification_deliveries, usage_events, audit_logs
internal_config, agent_trials, agent_tool_idempotency
```

Collections are flat (no subcollections). Relationships are plain id fields (`organization_id`, `restaurant_id`, `category_id`, `item_id`), exactly as the old foreign keys.

| Collection | Purpose |
|------------|---------|
| `organizations` | Tenant boundary (restaurant group / account) |
| `profiles` | App profile per Firebase Auth uid (doc id = uid) |
| `memberships` | User ↔ org with `role` |
| `restaurants` | Locations; `organization_id` says which org owns it |

## Document ids (`lib/db/schema.ts`)

- **Default:** the doc id is the row's `id` field. If `id` is missing on insert, a UUID is generated (`autoId`).
- **Composite primary keys** (`pk`): the doc id is the pk column values joined with `__` (any `/` replaced by `_`), so upserts are idempotent:

| Collection | pk → doc id |
|------------|-------------|
| `profiles` | `id` (Firebase uid; never auto-generated) |
| `internal_config` | `key` |
| `organization_onboarding` | `organization_id` |
| `restaurant_onboarding` | `restaurant_id` |
| `restaurant_profiles` | `restaurant_id` |
| `notification_settings` | `organization_id` |
| `agent_tool_idempotency` | `restaurant_id__idempotency_key` |

- **Unique keys** (`unique`) are checked by the data layer on insert/update (a clash returns error code `23505`, like Postgres), e.g. `organizations.slug`, `memberships (organization_id, user_id)`, `categories (restaurant_id, name)`, `items (category_id, name)`, `draft_orders (restaurant_id, session_id)`, `phone_order_receipts (restaurant_id, session_id)`, `usage_events.idempotency_key`.
- **Defaults** (`defaults`) fill columns on insert (timestamps, statuses, notification event lists, trial expiry).
- **Cascades** (`CASCADES`) replace `ON DELETE CASCADE`: deleting an organization deletes its memberships, restaurants, onboarding, templates, notifications and usage; deleting a restaurant deletes its menu, orders, profile, hours, imports, call events, knowledge and reservations; categories → items → modifiers.
- Former RPCs (menu merge/clear, etc.) are implemented in `lib/db/rpc.ts`.

### Queries and indexes

The Firestore backend pushes down only equality (`==`) and one `in` filter; ranges, ordering, `ilike`, limits and joins (`select("*, organization:organizations(*)")`) are applied in memory on the server. Equality-only queries need no composite indexes, so `firestore.indexes.json` is empty. Keep it that way unless a new query pushes down an inequality or order.

## Tenant isolation

Firestore security rules deny **all** client access (`firestore.rules`). Only the server talks to Firestore, through the Admin SDK, with full privileges. Therefore every query must be scoped in code:

- Resolve access first with `requireRestaurantAccess(id)` / `getRestaurantAccessForPage(id)` / `resolveOrganizationId(ctx, orgId?)` (`lib/auth/context-server.ts`).
- Then filter by `restaurant_id` / `organization_id` (`.eq("restaurant_id", id)`), never by ids taken from the request without that check.
- Agent tools (`/api/agent-tools/*`) scope by the restaurant id signed into the `roal1.*` token.

### Roles

| Role | Intended use |
|------|----------------|
| `owner` | Billing, delete org, invite owners |
| `admin` | Manage restaurants, members, settings |
| `member` | Operate KDS / menu / voice for assigned locations |

## First sign-in

`getAuthContext()` creates the `profiles` doc for a new Firebase user (`ensureUserProfile`). The onboarding wizard creates the organization + owner membership. To add someone to an existing org by hand, create a `memberships` doc in the Firebase console:

```json
{ "organization_id": "<org-id>", "user_id": "<firebase-uid>", "role": "admin", "created_at": "2026-01-01T00:00:00.000Z" }
```

## Legacy POC org

Legacy default org id (POC): `00000000-0000-4000-8000-000000000001` (`LEGACY_POC_ORGANIZATION_ID` in `lib/types.ts`). `tryClaimLegacyPocMembership` can attach the first user to it in older demo data.
