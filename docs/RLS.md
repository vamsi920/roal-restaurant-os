# Row Level Security (production)

Migration: `supabase/migrations/009_production_rls_policies.sql`  
Tenant tables: `008_organizations_tenant.sql`

## Security model

```
                    ┌─────────────────┐
                    │  auth.users     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    profiles     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │ memberships (role)          │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │ organizations   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
  ┌──────▼──────┐    ┌───────▼───────┐   ┌──────▼──────┐
  │ restaurants │    │ draft_orders  │   │  receipts   │
  └──────┬──────┘    └───────────────┘   └─────────────┘
         │
  categories → items → modifiers
```

| Actor | Access |
|-------|--------|
| **Anonymous** (`anon` key) | Denied by default. Optional **read-only** demo on Legacy POC org when flag enabled (see below). |
| **Authenticated user** | Rows for organizations where `memberships.user_id = auth.uid()`. |
| **Service role** | Bypasses RLS. Used by Edge Functions (`get-menu`, `sync-draft-order`, `finalize-order`) and trusted Next.js routes when `SUPABASE_SERVICE_ROLE_KEY` is set. |

Authorization is **not** taken from JWT `user_metadata` (user-editable). It comes from `public.memberships` joined to `restaurants.organization_id`.

### Roles

| Role | Org | Restaurants | Members |
|------|-----|-------------|---------|
| `owner` | Update/delete org | CRUD | Invite/update/remove |
| `admin` | Update org | CRUD | Invite/update/remove |
| `member` | Read | CRUD menu/orders | Read teammates |

### Helper functions

Defined in migration `009` (most are `SECURITY DEFINER` so policies can read `memberships` without recursion):

| Function | Purpose |
|----------|---------|
| `auth_user_is_org_member(org_id)` | Member of org |
| `auth_user_is_org_admin(org_id)` | `owner` or `admin` |
| `auth_user_can_access_restaurant(restaurant_id)` | Member of restaurant’s org (or service role) |
| `auth_user_can_access_category` / `_item` | Menu chain checks |
| `rls_poc_demo_reads_enabled()` | Reads `internal_config.rls_poc_demo_reads` |
| `rls_legacy_org_demo_select(org_id)` | Demo read on Legacy POC org only |

### RPCs (still `SECURITY DEFINER`)

| RPC | Guard |
|-----|--------|
| `merge_menu(restaurant_id, menu)` | Service role **or** restaurant access |
| `clear_restaurant_menu(restaurant_id)` | Service role **or** restaurant access |

### Receipt writes

`phone_order_receipts` has **no** `INSERT` policy for `anon` / `authenticated`. Finalize Edge Function uses **service role** only.

---

## Policy map (readable names)

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `organizations` | `org_select_member` (+ demo) | `org_insert_authenticated` | `org_update_admin` | `org_delete_owner` |
| `profiles` | self + teammates | self | self | — |
| `memberships` | same org | bootstrap owner / admin (`organization_has_members`, migration `024`) | admin | admin |
| `restaurants` | member (+ demo) | member | member | admin |
| `categories` | member (+ demo) | member | member | member |
| `items` / `modifiers` | member (+ demo) | member | member | member |
| `draft_orders` | member (+ demo) | member | member | — |
| `phone_order_receipts` | member (+ demo) | — (Edge only) | — | — |

Dev-open policies from `001`–`008` are **dropped** in `009`.  
Membership bootstrap policies: `024_fix_membership_bootstrap_rls.sql`.

---

## Local dev / demo paths

After `009`, unauthenticated clients using only the **anon** key cannot read or write tenant data. Use a signed-in session (Path B) or service role on the server (Path A).

### Path A — Recommended: service role on the server

Set in `.env`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Used today for:

- Menu clear (`DELETE /api/restaurants/[id]/menu`) when service role is present
- KDS receipt/draft fallback on restaurant page when configured

Scanner extract/commit and dashboard pages use the user session when configured; service role remains a server-only fallback.

**Never** expose the service role key in the browser (`NEXT_PUBLIC_`).

### Path B — Sign in + membership (production-shaped)

1. Enable Supabase Auth (Email provider).
2. Sign up → trigger/`ensureUserProfile` creates `profiles` (backfill in `024` for pre-tenant users).
3. Create org + membership (SQL or onboarding UI):

```sql
insert into public.organizations (name, slug)
values ('Dev Kitchen', 'dev-kitchen')
returning id;

insert into public.memberships (organization_id, user_id, role)
values ('<org-id>', '<your-auth-user-uuid>', 'owner');
```

4. Point the Next.js server/browser Supabase client at the user’s **session JWT** (not bare anon).

5. Create restaurants with `organization_id = '<org-id>'` (stop using the legacy default when ready).

### Path C — Read-only marketing demo (Legacy POC)

For a **public landing page** that shows live menu/order snapshots **without** login:

```sql
-- Run in Supabase SQL editor (uses service role / dashboard)
update public.internal_config
set value = 'true', updated_at = now()
where key = 'rls_poc_demo_reads';
```

Effects:

- **SELECT only** on Legacy POC org (`00000000-0000-4000-8000-000000000001`) and its restaurants/menu/drafts/receipts
- **No** anon writes
- Turn off: `value = 'false'`

If live reads fail, the app falls back to static `LANDING_DEMO` data (`lib/landing-demo-data.ts`).

### Path D — Edge / voice agent

Unchanged: Edge Functions use **service role** + `AGENT_TOOL_SECRET`. RLS does not apply to those writes.

---

## Apply

From repo root (linked project):

```bash
supabase db push
```

Applies pending files in `supabase/migrations/` in order (`001` through `024`). See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full inventory.

## Verify (after Auth + membership)

```sql
-- As authenticated user (SQL editor “Run as user” or JWT):
select * from public.restaurants;  -- only your orgs

-- As anon without demo flag:
select * from public.restaurants;  -- empty / denied
```

## Related

- Tenant model: `docs/TENANT_SCHEMA.md`
- Legacy org id: `00000000-0000-4000-8000-000000000001` (`LEGACY_POC_ORGANIZATION_ID` in `lib/types.ts`)
