# Form consistency (auth + contact)

## Shared primitives

| Piece | Class / component |
|-------|-------------------|
| Field row | `PublicFormField` (`components/landing/public/public-form-field.tsx`) |
| Field stack | `public-form-fields` |
| Panel | `public-form-panel` / `public-auth-panel` |
| Error | `public-form-error` |
| Submit | `public-btn-primary` + `public-form-submit` |

## Input contrast

- Background: `rgb(var(--public-bg-elev))` (opaque white), not low-alpha glass
- Border: `rgb(var(--public-ink) / 0.2)`
- Placeholder: `--public-muted` (not `--public-subtle`)
- Focus: `:focus-visible` + lavender ring (3px)
- Invalid: `[aria-invalid="true"]` red border

## Pages

- `/login`, `/signup` — `AuthForm` on `public-theme` canvas
- `/contact` — `ContactPilotForm` as `public-form-panel` inside `landing-story public-theme`

## Tests

`tests/unit/form-consistency.test.ts`
