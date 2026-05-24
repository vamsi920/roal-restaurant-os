# Auth route QA (launch queue #94)

## Protection layers

| Layer | Behavior |
|-------|----------|
| `middleware.ts` | Matcher: `/dashboard/*`, `/login`, `/signup`, `/auth/callback`, `/api/*` |
| `lib/supabase/middleware.ts` | No session → redirect to `buildGuestLoginRedirect(path)` |
| `app/dashboard/layout.tsx` | No `getAuthContext()` → `redirect("/login?next=/dashboard")` |
| Per-page guards | Billing, settings, admin, etc. set `next` to their path |

## Guest redirect

`buildGuestLoginRedirect("/dashboard/billing")` → `/login?next=%2Fdashboard%2Fbilling`

## Auth pages

| Route | UI |
|-------|-----|
| `/login` | `AuthForm` `sign_in` + `(auth)/layout` public theme |
| `/signup` | `SignupPageEntry` → `AuthForm` `sign_up` |

Signed-in guests hitting `/login` or `/signup` redirect via `safeNextPath(next)`.

## Tests

```bash
npm test -- tests/unit/auth-route-qa.test.ts tests/unit/safe-next.test.ts
```

Manual: open `/dashboard` logged out → `/login?next=...`; `/login` and `/signup` render forms.
