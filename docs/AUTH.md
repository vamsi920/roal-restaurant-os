# Auth and session flow

Supabase Auth with cookie sessions (`@supabase/ssr`).

## Routes

| Path | Access |
|------|--------|
| `/`, `/pricing`, `/demo`, `/security`, `/contact` | Public marketing |
| `/login`, `/signup` | Guests only (signed-in users redirect to `next` or `/dashboard`) |
| `/dashboard/*` | Requires session (middleware + server layout) |
| `/auth/callback` | OAuth / email-confirm code exchange |
| `/auth/signout` | `POST` — clears session, redirects to `/login` |

Protected APIs (session cookie required; non-members get 401/403):

- `POST /api/restaurants`
- `DELETE /api/restaurants/[id]/menu`
- `POST /api/scanner/extract`, `POST /api/scanner/commit`, `POST /api/scanner/discard`
- `POST /api/scanner/process` (deprecated legacy upload)
- `PATCH /api/restaurants/[id]/orders/[orderId]`
- `POST /api/notifications/events`, `POST /api/notifications/check-stuck`

## Supabase project settings

In **Authentication → URL configuration**:

- **Site URL:** `http://localhost:3000` (dev) or production domain
- **Redirect URLs:** add  
  `http://localhost:3000/auth/callback`  
  `https://<your-domain>/auth/callback`

For email signup, confirm links use `emailRedirectTo` → `/auth/callback?next=...`.

## Local dev

1. Enable Email provider in Supabase Auth.
2. Create a user via `/signup` (disable email confirm in Auth settings for faster dev, or use the confirmation link).
3. Add org membership so RLS allows data (see `docs/RLS.md` path B).

```sql
insert into public.memberships (organization_id, user_id, role)
values ('<org-id>', '<auth-user-uuid>', 'owner');
```

## Membership and roles

See **`lib/auth/`** — helpers for org membership, role checks, and restaurant access.

| Role | Capabilities |
|------|----------------|
| `owner` | Full org control, delete org, manage members |
| `admin` | Update org, manage members, delete restaurants |
| `member` | Operate menus, orders, voice tools (no member management) |

| Helper | Use |
|--------|-----|
| `getAuthContext()` / `requireAuthContext()` | User + all memberships |
| `requireRestaurantAccess(id)` | API / server actions |
| `getRestaurantAccessForPage(id)` | Server pages → `notFound()` |
| `resolveOrganizationId(ctx, orgId?)` | Create restaurant in member org |
| `hasOrgAdminAccess(ctx)` | Admin nav + `/dashboard/admin` |
| `useAuthContext()` / `GET /api/auth/context` | Client components |

## Code map

| File | Role |
|------|------|
| `middleware.ts` | Refresh session; redirect guests from `/dashboard` |
| `lib/supabase/middleware.ts` | Session update + route guards |
| `lib/supabase/server.ts` | `createServerSupabase()` — cookie-aware server client |
| `lib/supabase/client.ts` | Browser client (dashboard realtime) |
| `lib/auth/session.ts` | `getSessionUser` / `requireSessionUser` |
| `lib/auth/context-server.ts` | Membership + restaurant authorization |
| `lib/auth/context-client.ts` | `useAuthContext`, client membership load |
| `lib/auth/roles.ts` | `isOrgAdmin`, `canOperateRestaurant`, etc. |
| `app/dashboard/layout.tsx` | Server `getUser()` + redirect |
| `components/auth/auth-form.tsx` | Email/password sign-in and sign-up |
