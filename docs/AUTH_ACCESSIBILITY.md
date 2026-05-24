# Auth accessibility (prompt 66)

## Scope

`/login`, `/signup`, shared `AuthForm`, `(auth)/layout`.

## Implemented

| Area | Behavior |
|------|----------|
| Labels | `htmlFor` + stable `useId()` on email/password |
| Required | Visible `(required)` + `aria-required` |
| Errors | `role="alert"`, `aria-invalid`, `aria-describedby` on fields |
| Focus | Lavender `:focus-visible` on inputs, buttons, skip link, blog links |
| Email confirm | `role="status"`, `aria-live="polite"`, focus moves to heading; hint about inbox link |
| Magic link | **Not offered** — password + email confirm link only; copy states confirm-link flow |
| Mobile | 16px inputs (≤639px), 44px min touch height, signup form **above** aside on narrow viewports |
| Skip | “Skip to sign in form” → `#auth-main` |
| Loading | `aria-busy`, inputs disabled while submitting |

## Manual QA

1. Tab through login: skip link → brand → nav → email → password → submit → footer link.
2. Submit empty: browser validation + no spurious focus trap.
3. Trigger API error: announced via alert region.
4. Sign up → confirm panel: screen reader hears status; heading receives focus.
5. 320px width: no horizontal scroll; form first on signup.

Auth logic unchanged.
