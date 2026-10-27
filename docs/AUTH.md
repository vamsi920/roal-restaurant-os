# Auth and session flow

Firebase Authentication in the browser, **httpOnly session cookies** on the server (the same pattern as Addy). In demo mode (no Firebase keys) a single local demo owner is used instead.

## How sign-in works

1. The browser signs in with the Firebase JS SDK (`lib/firebase/client.ts`): **Google** (popup) or **email/password** (sign-in or create account).
2. The client sends the fresh ID token to `POST /api/auth/session` (`app/api/auth/session/route.ts`).
3. The server verifies it with the Admin SDK (`verifyIdToken(token, true)`, must be from a sign-in in the last 5 minutes) and mints a Firebase **session cookie** (`createSessionCookie`) stored as `__session` (httpOnly, `sameSite=lax`, `secure` in production). "Remember me" = 14 days; off = 1 day, browser-session cookie.
4. The client drops its own Firebase session; from here the server owns auth.
5. Every server component / route handler / server action calls `getSessionUser()` (`lib/auth/session.ts`), which runs `verifySessionCookie` on `__session`.
6. Sign out: `POST /auth/signout` (or `DELETE /api/auth/session`) clears the cookies and revokes refresh tokens.

Password reset: `/reset-password` sends a Firebase reset email (`sendPasswordResetEmail`); the user sets the new password on Firebase's hosted page and comes back to `/login`. `/auth/callback` is only a legacy redirect for old links.

## Demo mode

Demo mode is on when Firebase is not configured — i.e. `NEXT_PUBLIC_FIREBASE_API_KEY` or `FIREBASE_SERVICE_ACCOUNT` (or `GOOGLE_APPLICATION_CREDENTIALS`) is missing — and the build is not production. `ROAL_DEMO_MODE=1` forces it on (also in production builds). See `lib/auth/demo-mode.ts`.

- The sign-in page shows one **Continue as demo owner** button, which calls `signInDemo()` → `POST /api/auth/session { demo: true }` → cookie `roal_demo_session`.
- The user is always `DEMO_USER` (`demo-owner`, "Maria Rossi", `lib/auth/session-user.ts`) with a seeded organization + restaurant.
- Data goes to the in-memory store in `lib/db` (persisted to `.data/demo-db.json` in dev; `ROAL_DEMO_DB_FILE=off` disables).
- Production without Firebase and without `ROAL_DEMO_MODE=1` refuses sign-in (503) instead of silently using demo data.

## Firebase project settings

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md). In short: **Authentication → Sign-in method** enable **Email/Password** and **Google**; **Authentication → Settings → Authorized domains** must include `localhost` and your production domain (needed for the Google popup). No redirect URLs are configured — there is no server-side OAuth callback.

## Routes

| Path | Access |
|------|--------|
| `/`, `/pricing`, `/demo`, `/security`, `/contact` | Public marketing |
| `/login`, `/signup` | Guests only (signed-in users redirect to `next` or `/dashboard`) |
| `/reset-password` | Request a password reset email |
| `/dashboard/*` | Requires session (middleware cookie check + server verification) |
| `/auth/callback` | Legacy: forwards old links to a safe same-origin `next` |
| `/auth/signout` | `POST` — clears session, redirects to `/login` |
| `POST/DELETE /api/auth/session` | Exchange ID token for session cookie / sign out |

Protected APIs (session cookie required; non-members get 401/403):

- `POST /api/restaurants`
- `DELETE /api/restaurants/[id]/menu`
- `POST /api/scanner/extract`, `POST /api/scanner/commit`, `POST /api/scanner/discard`
- `POST /api/scanner/process` (deprecated legacy upload)
- `PATCH /api/restaurants/[id]/orders/[orderId]`
- `POST /api/notifications/events`, `POST /api/notifications/check-stuck`

`middleware.ts` (`lib/auth/middleware-session.ts`) only checks that a session cookie is **present** (Edge runtime cannot run the Admin SDK); the real verification happens in Node code via `getSessionUser()`.

## Membership and roles

All data access goes through the server with full Firestore privileges, so authorization is enforced in code: `lib/auth/context-server.ts` loads the user's `memberships` and every route/action scopes queries by the restaurant's `organization_id`.

| Role | Capabilities |
|------|----------------|
| `owner` | Full org control, delete org, manage members |
| `admin` | Update org, manage members, delete restaurants |
| `member` | Operate menus, orders, voice tools (no member management) |

**Platform admin** (`PLATFORM_ADMIN_EMAIL`, default `vammu920@gmail.com`): internal **Admin / Ops** console and nav item. Not the same as org `admin` role — other users never see `/dashboard/admin` even if their membership role is `admin`.

| Helper | Use |
|--------|-----|
| `getSessionUser()` / `requireSessionUser()` | Verified user from the session cookie |
| `getAuthContext()` / `requireAuthContext()` | User + all memberships (creates the profile on first visit) |
| `requireRestaurantAccess(id)` | API / server actions |
| `getRestaurantAccessForPage(id)` | Server pages → `notFound()` |
| `resolveOrganizationId(ctx, orgId?)` | Create restaurant in member org |
| `hasOrgAdminAccess(ctx)` | Platform staff only — Admin nav + `/dashboard/admin` |
| `useAuthContext()` / `GET /api/auth/context` | Client components |

## Code map

| File | Role |
|------|------|
| `middleware.ts` | Request id + cookie-presence routing |
| `lib/auth/middleware-session.ts` | Guest redirects / 401 for protected APIs |
| `lib/auth/session.ts` | `getSessionUser` / `requireSessionUser` (verifies `__session`) |
| `lib/auth/session-user.ts` | Cookie names, `DEMO_USER`, `SessionUser` type |
| `lib/auth/demo-mode.ts` | `isAuthDemoMode()`, `isFirebaseAuthConfigured()` |
| `lib/firebase/client.ts` | Browser SDK: Google, email/password, reset, demo sign-in |
| `lib/firebase/admin.ts` | Admin SDK singleton (`adminAuth`, `adminDb`) |
| `app/api/auth/session/route.ts` | ID token → session cookie |
| `lib/auth/context-server.ts` | Membership + restaurant authorization |
| `lib/auth/context-client.ts` | `useAuthContext`, client membership load |
| `lib/auth/roles.ts` | `isOrgAdmin`, `canOperateRestaurant`, etc. |
| `components/auth/auth-form.tsx` | Sign-in / sign-up UI |
