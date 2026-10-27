# ROAL design system v3 — "command center"

Reference: the category leader's product (studied Oct 2026; internal only, never named in public copy).
We borrow structure and polish, not branding: our own wordmark, palette, and copy.

## Look
* **Canvas**: paper `--bg-base` (#F7F6F3). Marketing adds `.grid-paper` (28px faint grid).
* **Surfaces**: white cards, 1px `--border`, 14px radius, near-flat shadow (`.panel`, `.stat-card`).
* **Type**: Bricolage Grotesque for display (`font-display`, 700–800, tight tracking),
  Inter for UI (13–14px), JetBrains Mono for numbers in tickets.
* **Color**: ink #111 for primary buttons and text; ember `--accent` (#EA580C) for money
  ("You've made **$8,627** this month"), highlights, and charts; soft tinted icon tiles
  (`.icon-tile--amber/orange/blue/green/rose`) in the top-right of stat cards; badges
  (`.badge--live/ok/warn/bad/info/new`).
* **Marketing**: floating white pill nav, black CTA; two-tone headlines (muted grey lead words +
  ink key words); hero = big headline + one "Try in your restaurant" input
  (TrialBuilder) + product mock (phone or desktop dashboard drawn in HTML);
  colored icon cards; one full-black section; FAQ accordion; "hear it call you" closer.
* **App**: 232px white sidebar (logo, nav with icons, "New" badges), bottom: promo card,
  "Taking orders" status switch, account card. Main: greeting header
  ("Good afternoon, {first name}" + local day/time), location switcher pill top-right.

## Module map (sidebar, scoped to the selected location)
| Module | Route | Content |
|---|---|---|
| Overview | `/dashboard/restaurants/[id]/overview` | Greeting, "You've made $X this month", stat cards (calls answered, orders taken, time handled on the phone, upsell revenue), calls chart (14 days), recent activity (live calls, orders, follow-ups), go-live checklist until live |
| Calls & Orders | `/dashboard/restaurants/[id]/calls` | All calls with outcome badges, transcript drawer, follow-up inbox, orders tab |
| Kitchen | `/dashboard/restaurants/[id]` | Live ticket board for the kitchen tablet (KDS) |
| Menu | `/dashboard/restaurants/[id]/menu` | Menu editor, scanner, publish to host |
| Phone host | `/dashboard/restaurants/[id]/agent` | Test call, voice & name, unanswered-questions inbox, connection |
| Reports | `/dashboard/restaurants/[id]/analytics` | Calls, conversion, revenue, peak hours, popular items, upsells |
| Billing | `/dashboard/restaurants/[id]/billing` | Completed orders × $0.90, invoices |
| Settings | `/dashboard/restaurants/[id]/menu#restaurant-settings` → settings | Business info, hours, FAQs, upsells, handoff, notifications |
| Support | `/dashboard/support` | Help + contact |

Org-level (via location switcher): All locations, Add location (`/dashboard/onboarding?new=1`),
Organization overview, Team/Settings, Platform admin (staff only).

## Primitives
`components/ui/index.tsx`: `PageHeader`, `StatCard`, `Panel`, `Badge`, `IconTile`, `EmptyState`,
`Segmented`, `Switch`, `formatMoney`, `formatRelative`, `greetingFor`. Icons: `lucide-react`.

## Auth
One card, Addy pattern: "Continue with Google" → divider → email + password → remember me →
plain-English errors; sign-in/create toggle on the same card; forgot password link.
