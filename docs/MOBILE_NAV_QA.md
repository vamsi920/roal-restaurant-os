# Mobile nav QA (prompt 87)

## Routes

| Route | Nav component |
|-------|----------------|
| `/` | `LandingHomeNav` → `PublicMarketingNav` |
| `/blog`, `/pricing`, `/about`, `/demo`, `/contact` | `LandingNav` → `PublicMarketingNav` |
| `/login`, `/signup` | `PublicAuthHeader` (mobile drawer) |

## Behavior

- **≤767px:** hamburger opens glass drawer; desktop links/actions hidden
- **Scroll lock:** `position: fixed` body + `html.public-nav-menu-open`
- **Focus:** first link focused on open; Tab cycles inside drawer; Escape closes + returns focus to menu button
- **Overflow:** drawer uses `left/right` gutters (not `100vw`), `max-height` with safe areas, `overscroll-behavior: contain`
- **Narrow chrome:** logo word visually hidden below 380px (mark remains)

## Source

- `lib/landing/use-public-nav-menu.ts`
- `components/landing/public/public-marketing-nav.tsx`
- `components/auth/public-auth-header.tsx`
- `app/public-theme.css` (`.public-nav-*`)

## Test

`tests/unit/mobile-nav.test.ts`
