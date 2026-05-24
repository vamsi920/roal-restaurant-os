# Auth login theme audit (prompt 61)

**Scope:** `/login`, shared `(auth)/layout`, `AuthForm` (also used by `/signup`).  
**Out of scope:** Supabase calls, redirects, `safeNextPath`, callback routes — no auth logic changes.

---

## Current stack

| Layer | File | Role |
|-------|------|------|
| Layout | `app/(auth)/layout.tsx` | `public-theme` + `public-theme-canvas`, lavender wash `::before`, minimal header |
| Page | `app/(auth)/login/page.tsx` | `AuthForm mode="sign_in"` + skeleton |
| Form | `components/auth/auth-form.tsx` | Email/password UI + existing sign-in/sign-up handlers |
| CSS | `app/public-theme.css` (imported in layout only) | Token bridge + `.public-theme .glass-card` / `.btn-primary` overrides |
| Global | `app/globals.css` | Base `btn-primary` (teal) and `glass-card` — **overridden** under `.public-theme` |

`/login` does **not** import `landing.css` (correct — avoids poster/yellow shell).

---

## What already matches public theme

- **Canvas:** `public-theme-canvas` gradient wash aligns with homepage/marketing shells.
- **Semantic tokens:** `.public-theme` remaps `--bg-base`, `--accent`, `--text-*` to lavender/ink palette.
- **Card shell:** `glass-card` gets public glass border, blur, shadow via `.public-theme .glass-card`.
- **Primary button:** `btn-primary` remapped to **black pill** + soft shadow (not globals teal).
- **Focus:** Global `:focus-visible` under `.public-theme` uses lavender outline (`rgb(120 100 220)`).
- **Typography:** Display heading uses `font-display`; body/muted text read correctly on wash.

---

## Gaps vs launch glass/lavender (fix in prompt 62)

### 1. Form inputs (highest visual drift)

`AuthForm` uses inline `inputClass`:

- `bg-base` flat fill — not glass inset like `/contact` (`public-contact-field__input`).
- `focus:ring-accent/20` — weaker than contact lavender ring + offset.
- Label pattern: `text-xs uppercase tracking-wide text-subtle` — dashboard chip style, not marketing `landing-body` / sentence case.

**Risk:** Readable but feels like dashboard form dropped on marketing canvas.

### 2. No auth-specific BEM hooks

Contact/demo use `public-contact-*` / `public-demo-*`. Auth relies only on generic utilities — harder to tune without touching shared components.

**Recommendation (62):** Add `public-auth-form`, `public-auth-field__input`, `public-auth-header` in `public-theme.css`; apply in `auth-form.tsx` + layout (class names only).

### 3. Header chrome

```tsx
<header className="border-b border-line/10 bg-base/90 px-4 py-4 backdrop-blur-md">
```

- No glass nav pill / `marketing-nav`-style chrome.
- Logo tile: `bg-card` + square border — OK but not aligned with `public-footer` / home nav.

**Recommendation (62):** `public-auth-header` with glass bar, optional link to `/` + “Pricing” / “Demo” as text links (IA only, no logic).

### 4. Secondary links

Mode switch links use `text-accent hover:underline` — acceptable (lavender token). Prefer `public-blog-link` for parity with contact/demo.

### 5. Error / success states

- Error: `border-danger/25 bg-danger/5` — fine for a11y; could use public danger token if defined.
- Confirm-email panel: same card/button as form — no distinct “success” wash (optional polish).

### 6. Skeleton

`glass-card h-80 animate-pulse` — on-brand; could add `public-auth-form--skeleton` for rounded inner shimmer (optional).

### 7. Metadata

- Login: `title: "Sign in — ROAL"` only — no description, canonical, OG/Twitter (unlike `/contact`, `/demo`).
- Not blocking theme but noted for launch SEO pass (separate from 62 if desired).

### 8. Shared with `/signup`

Same `AuthForm` + layout — **prompt 62** styled both. Signup redirect/`next` audit: [`AUTH_SIGNUP_THEME_AUDIT.md`](./AUTH_SIGNUP_THEME_AUDIT.md) (prompt 63).

---

## Auth logic boundary (unchanged in 62)

Do **not** modify:

- `supabase.auth.signInWithPassword` / `signUp`
- `emailRedirectTo` / `auth/callback?next=`
- `router.push(next)` / `router.refresh()`
- `safeNextPath`, URL `error` param handling
- `confirmSent` branch content (copy tweaks OK; flow unchanged)

---

## Visual comparison checklist (manual QA)

| Check | `/login` today | Target (62) |
|-------|----------------|-------------|
| Page background | Lavender wash | Keep |
| Form panel | Glass card | Keep; optional stronger border |
| Submit button | Black pill | Keep |
| Inputs | Flat gray base | Glass/lavender focus |
| Labels | Uppercase small | Sentence case, muted body |
| Header | Flat bar | Glass chrome |
| Link to signup | Lavender | `public-blog-link` |
| Teal CTA leak | None under `.public-theme` | Verify after changes |
| Mobile 320px | Single column `max-w-md` | No overflow |
| `prefers-reduced-motion` | Pulse skeleton | Respect (optional reduce) |

---

## File map (prompt 62)

| File | Action |
|------|--------|
| `app/public-theme.css` | Add `.public-auth-*` block (inputs, header, form title) |
| `app/(auth)/layout.tsx` | Header classes → `public-auth-header` |
| `components/auth/auth-form.tsx` | Class names + `public-btn-primary`; **no** handler changes |
| `app/(auth)/login/page.tsx` | Optional wrapper `public-auth-page` (cosmetic) |

---

## Verdict

**Functional theme:** Partial — canvas + card + primary button match; **inputs and header** are the main mismatch.  
**Auth logic:** Isolated in `auth-form.tsx` handlers; safe to restyle via classNames/CSS only.

**Prompt 62:** Done — `public-auth-*` in `public-theme.css`, `AuthForm` + `(auth)/layout` updated (auth logic unchanged).
