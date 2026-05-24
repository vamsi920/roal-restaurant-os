# Tenant schema (organizations)

Migration: `supabase/migrations/008_organizations_tenant.sql`

## Model

```
organizations
  └── memberships (user_id → profiles, role: owner | admin | member)
  └── restaurants (organization_id, required)
        └── categories → items → modifiers
        └── draft_orders, phone_order_receipts (via restaurant_id)
```

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant boundary (restaurant group / account) |
| `profiles` | App profile row per `auth.users` id |
| `memberships` | User ↔ org with `membership_role` |
| `restaurants.organization_id` | Which org owns the location |

### Roles

| Role | Intended use |
|------|----------------|
| `owner` | Billing, delete org, invite owners |
| `admin` | Manage restaurants, members, settings |
| `member` | Operate KDS / menu / voice for assigned locations |

Production RLS uses `memberships` + `organization_id` — see **`docs/RLS.md`** (`009_production_rls_policies.sql`).

## POC compatibility

### Automatic backfill (in migration)

1. Inserts organization **`Legacy POC`** (`id = 00000000-0000-4000-8000-000000000001`, slug `legacy-poc`).
2. Sets `restaurants.organization_id` for **all existing rows** to that id.
3. Sets `NOT NULL` + **default** on `organization_id` so current API (`INSERT` with only `name`) still works.

No manual SQL required for a standard upgrade from migrations `001`–`007`.

### After you enable Supabase Auth

1. Sign up users → `handle_new_user` creates `profiles` rows.
2. For each real customer org, `INSERT INTO organizations (name, slug) VALUES (...)` .
3. `INSERT INTO memberships (organization_id, user_id, role) VALUES (..., ..., 'owner')`.
4. Create restaurants with that `organization_id` (stop relying on the legacy default when ready).

### Manual backfill (only if needed)

Use when you already ran the app **without** this migration and need to split legacy data:

```sql
-- 1) Create a real organization
insert into public.organizations (name, slug)
values ('Joe''s Restaurant Group', 'joes-group')
returning id;

-- 2) Move specific restaurants (replace UUIDs)
update public.restaurants
set organization_id = '<new-org-id>'
where id in ('<restaurant-uuid-1>', '<restaurant-uuid-2>');

-- 3) Optional: remove legacy org when empty
delete from public.organizations
where id = '00000000-0000-4000-8000-000000000001'
  and not exists (
    select 1 from public.restaurants r
    where r.organization_id = '00000000-0000-4000-8000-000000000001'
  );
```

### Re-assigning a user to an org

```sql
insert into public.memberships (organization_id, user_id, role)
values ('<org-id>', '<auth-user-uuid>', 'admin')
on conflict (organization_id, user_id) do update set role = excluded.role;
```

## Indexes

| Index | Columns |
|-------|---------|
| `restaurants_organization_id_idx` | `restaurants(organization_id)` |
| `restaurants_org_created_idx` | `restaurants(organization_id, created_at desc)` |
| `memberships_organization_id_idx` | `memberships(organization_id)` |
| `memberships_user_id_idx` | `memberships(user_id)` |
| `organizations_slug_key` | unique `organizations(slug)` where not null |

## Apply

Included in the standard migration chain — run once with the rest:

```bash
supabase db push
```

## Application status

- [x] Org-scoped RLS (`009`, `024` — see `docs/RLS.md`)
- [x] `POST /api/restaurants` scoped via session / `resolveOrganizationId`
- [x] Onboarding wizard creates org + owner membership
- [x] TypeScript types: `Restaurant.organization_id`, `Organization`, `Membership`

Legacy default org id (POC): `00000000-0000-4000-8000-000000000001` (`LEGACY_POC_ORGANIZATION_ID` in `lib/types.ts`)
