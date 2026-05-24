# Public accessibility QA (launch queue #96)

Audit scope: `/`, marketing pages, `/login`, `/signup`, `/blog`, `/demo`, `/contact`.

## Headings & landmarks

| Surface | Pattern |
|---------|---------|
| Homepage | One `h1` in hero; sections `h2` + `aria-labelledby` |
| Marketing | `PublicPageHero` → `h1`; `LaunchAeoAnswer` → `h2` |
| Auth | `AuthForm` → `h1`; signup aside → `h2` |
| Shell | `<header>`, `<main id="main">` or `#auth-main`, `<footer>` |

Skip links: `#main` (marketing/home), `#auth-main` (auth).

## Keyboard & focus

- Global `:focus-visible` — lavender 2px outline (`public-theme.css`)
- Skip links visible on `:focus` / `:focus-visible`
- Mobile nav: `aria-expanded`, dialog + focus trap, Escape (`use-public-nav-menu.ts`)
- Blog filters: `button` + `aria-pressed`
- Home FAQ: native `<details>` / `<summary>` with `:focus-visible` on summary

## Forms & labels

- `PublicFormField`: `htmlFor`, `aria-required`, `aria-invalid`, `aria-describedby`
- Auth: `role="alert"` errors; confirm panel `aria-live="polite"`
- Contact: `aria-labelledby` on form; `role="alert"` + `role="status"`

## ARIA & semantics

- Demo video placeholder: `role="img"` + `aria-label`
- Metrics strip: `sr-only` heading when visual title hidden
- Pricing/security FAQ cards: `<article>` + `h3` (valid grouping)
- Pricing FAQ divided list: `<dl>` with direct `<dt>` / `<dd>` children

## Reduced motion

- CSS `prefers-reduced-motion: reduce`: disables reveal animations, hover transforms, home hero video
- `HomeHowFlow`: no IntersectionObserver when reduced motion; static grid shows per-step visuals (desktop sticky stage hidden)
- `HowFlowStage` `aria-live` only when scroll-synced desktop stage is active (`announceChanges`)
- `LandingVideoBackground`: gradient-only when reduced motion or save-data

## Contrast

Public palette uses `--public-ink` on `--public-bg`; muted text `--public-muted`. Forms use opaque inputs (prompt 86). Manual check: hero glass panels and ghost buttons at 320px width.

## Tests

```bash
npm test -- tests/unit/public-accessibility-qa.test.ts
```

See also `docs/AUTH_ACCESSIBILITY.md` for auth-only checklist.

## Manual pass

1. Tab from top of `/`, `/pricing`, `/login` — skip link → nav → content → footer.
2. Open mobile menu — trap focus, Escape closes, focus returns to menu button.
3. Toggle blog category chips — state announced via `aria-pressed` + live region on index.
4. Enable **Reduce motion** in OS — home video off, FAQ/how-flow static.
5. Submit empty contact/auth forms — errors in `role="alert"`.
