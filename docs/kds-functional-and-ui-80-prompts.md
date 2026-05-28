# KDS functional and UI cleanup prompts

Use these in Cursor sequentially only. Do not use multitasking. Each prompt must finish before the next starts. If you start a dev server, stop it before finishing. Do not print secrets. Preserve working auth, Supabase, ElevenLabs, menu import, order realtime, and billing behavior.

## Functional prompts

### Prompt 01/80
Audit `app/dashboard/restaurants/[id]/page.tsx`, `LiveOrdersPanel`, `LiveMenuSidebar`, `MenuScanner`, `VoiceAgentPanel`, menu editor route, and dashboard nav. Write a short plan in `docs/KDS_REFOCUS_PLAN.md`: KDS page = orders only; Menu setup page = photo-to-menu, live menu build, agent setup, test call.

### Prompt 02/80
Update dashboard nav labels only: make the restaurant detail route read as `Orders` or `KDS`, make `/menu` read as `Menu & agent`, and remove restaurant-management wording. Keep routes and permissions unchanged. Document changed labels.

### Prompt 03/80
Refactor `app/dashboard/restaurants/[id]/page.tsx` so it no longer renders `MenuScanner`, `LiveMenuSidebar`, `MenuImportHistory`, `VoiceAgentPanel`, `VoiceAgentTestHarness`, profile settings, or hours settings. Keep only breadcrumb/header plus `LiveOrdersPanel`.

### Prompt 04/80
Make the KDS page header simple for a restaurant owner: title `Live phone orders`, subtitle `New pickup orders appear here as callers confirm`, one realtime status pill, and one link button to `Menu & agent`. No technical copy.

### Prompt 05/80
Update `LiveOrdersPanel` copy and structure so the default view is the kitchen queue. Keep tabs only if useful: `New`, `In progress`, `Done`. Remove extra explanatory text and technical Realtime wording from the visible UI.

### Prompt 06/80
Add a compact `CallStatusStrip` inside `LiveOrdersPanel`: show `Call live` when `liveCarts.length > 0`, otherwise `Waiting for calls`. Include count and last updated time. Do not show conversation text.

### Prompt 07/80
Simplify order cards for owners: customer/name, pickup status, items, total, and big action buttons. Hide session IDs behind a small details affordance or inside the modal only.

### Prompt 08/80
Make the order details modal operational, not technical: order summary, customer phone, item modifiers, timestamps, status actions. Remove raw JSON-looking or developer-facing labels if any exist.

### Prompt 09/80
Improve KDS empty states: if no orders, show one calm panel: `No phone orders yet` plus `Keep this screen open during rush`. Include a secondary link to `Menu & agent` setup.

### Prompt 10/80
Make KDS mobile-first: sticky top status, thumb-sized action buttons, no horizontal overflow, cards full-width, tabs scroll if needed. Do not add new libraries.

### Prompt 11/80
Preserve realtime behavior in `LiveOrdersPanel`, but simplify degraded UI copy: `Reconnecting` or `Synced every few seconds`. Keep polling fallback.

### Prompt 12/80
Ensure order status action buttons are impossible to confuse: `Accept`, `Start`, `Ready`, `Complete`, `Cancel`. Add pending and disabled states that do not shift layout.

### Prompt 13/80
Keep completed/canceled orders available but visually secondary. Done history should not dominate the KDS page. Limit visible history height and provide a clear empty state.

### Prompt 14/80
Move menu-import and menu-scanner responsibilities to `/dashboard/restaurants/[id]/menu`. Do not duplicate menu scan UI on KDS. Confirm KDS imports no scanner/menu sidebar components.

### Prompt 15/80
Refactor `/dashboard/restaurants/[id]/menu/page.tsx` to load all data needed for menu setup: menu rows, billing gates, profile, hours if still needed, and voice agent control center. Keep auth checks unchanged.

### Prompt 16/80
Build the menu setup page layout: header `Menu & agent setup`, short subtitle, two primary areas: `Upload menu photo` and `Live menu being built`. Include a link back to `Live orders`.

### Prompt 17/80
Place `MenuScanner` on the menu setup page in a focused section. Copy should say: `Upload a menu photo. Review it. ROAL uses this menu on calls.` Keep text short.

### Prompt 18/80
Place `LiveMenuSidebar` on the menu setup page and rename visible title to `Live menu build`. It should feel like a build monitor, not a sidebar. Keep realtime update flashing.

### Prompt 19/80
On the menu setup page, add a clear live-call indicator near the live menu: `Call in progress` when there are draft/live carts if data is available; otherwise `No active call`. Do not show conversation.

### Prompt 20/80
Add a compact `Menu changed` indication when categories/items/modifiers flash. Use existing flash state where possible. The owner should understand that the phone agent menu updated.

### Prompt 21/80
Move `MenuImportHistory` to the bottom of menu setup as `Recent menu scans`. Keep it collapsed or visually secondary so it does not overwhelm the page.

### Prompt 22/80
Add a clear CTA from menu setup to manual editor: `Edit menu manually`. Keep manual editing on the existing `/menu` route only if it is already the same route; otherwise use an inline section below scan.

### Prompt 23/80
If `MenuEditor` currently owns the entire `/menu` route, wrap it below the scanner/live build sections as `Manual menu editor`. Keep all existing edit functions.

### Prompt 24/80
Move `VoiceAgentPanel` to menu setup under `Phone agent`. Copy: `Connect the agent after your menu looks right.` Keep existing sync/connect functions.

### Prompt 25/80
Move `VoiceAgentTestHarness` out of the KDS page. Put it in menu setup as a collapsed `Test call` section or remove visible rendering if it is developer-only. Preserve the code path if tests depend on it.

### Prompt 26/80
Remove `RestaurantProfileSettings` and `RestaurantHoursSettings` from the KDS page. If needed, place them under a collapsed `Restaurant basics` section on menu setup or settings. Keep it secondary.

### Prompt 27/80
Simplify `/dashboard/admin` visibility and wording. It should be platform support only, not a restaurant owner staff-management page. Ensure normal restaurant owners do not see confusing admin/staff management links.

### Prompt 28/80
Update dashboard home and restaurant list CTAs to direct owners to `Live orders` and `Menu & agent setup`. Avoid “admin ops” and “staff management” language.

### Prompt 29/80
Add route-level metadata/page titles if missing: KDS = `Live orders`, Menu = `Menu & agent setup`. Browser/tab titles should match owner-facing words.

### Prompt 30/80
Audit imports after moving components. Remove unused imports from KDS, menu page, nav, and admin files. Do not delete working components.

### Prompt 31/80
Update or add focused tests for KDS page rendering: no scanner text on KDS, live orders panel present, menu setup link present, guest redirect preserved.

### Prompt 32/80
Update or add tests for menu setup rendering: scanner present, live menu build present, agent setup/test call present or collapsed, live orders link present.

### Prompt 33/80
Update tests around dashboard nav labels so they expect `Live orders` and `Menu & agent`, not old management/admin terms.

### Prompt 34/80
Check mobile markup for KDS/menu pages. Add semantic headings and landmarks so mobile screen readers and browser automation can find the main content quickly.

### Prompt 35/80
Run targeted tests for restaurant page, menu page, nav, and order actions. Fix only issues caused by this refactor. Do not broaden scope.

### Prompt 36/80
Run TypeScript or build check if available and fast. Fix import/type errors from the page split. Stop any server or watcher before finishing.

### Prompt 37/80
Clean `kds-workspace.css`: remove styles only used by the old mixed page. Keep order card/live menu styles that are still used. Avoid global CSS regressions.

### Prompt 38/80
Update docs: `docs/KDS_REFOCUS_PLAN.md` should include final routes, owner mental model, what moved, tests run, and remaining risks.

### Prompt 39/80
Do a final functional smoke by reading rendered route structure or running lightweight route checks. Confirm KDS is orders-only and menu setup contains scanner/live-menu/agent setup.

### Prompt 40/80
Functional pass summary only. Update `docs/FINAL_LAUNCH_READINESS.md` with the KDS/menu split status, tests run, and any unresolved blockers. Do not commit yet.

## UI prompts

### Prompt 41/80
Audit current fonts and typography across public pages and dashboard. Replace cheap-looking typography with the existing premium font stack if available, or add a restrained Geist/Plus Jakarta style. Do not use Inter as the main visible brand font.

### Prompt 42/80
Define a tighter type scale in CSS: clear display, section heading, body, label, and numeric styles. Use tabular numbers for order counts/prices. Keep text wrapping clean on mobile.

### Prompt 43/80
Polish KDS visual hierarchy: one focused orders canvas, larger order cards, clearer status colors, less border noise, more app-like spacing. Make it feel like a restaurant tablet screen.

### Prompt 44/80
Polish menu setup visual hierarchy: scanner, live menu build, agent setup should look like a simple guided setup flow, not a settings dump.

### Prompt 45/80
Make every dashboard page feel app-like on mobile: sticky safe header, full-width cards, 44px minimum tap targets, no cramped tables, no horizontal overflow.

### Prompt 46/80
Rewrite public landing copy to be shorter and punchier. Keep core message: `Never miss a call during rush. ROAL answers, takes the order, and sends it to your kitchen.`

### Prompt 47/80
Simplify pricing copy everywhere. Keep the idea: `$0.90 per successful order` and `If it does not become an order, you do not pay.` Remove long explanations unless in FAQ.

### Prompt 48/80
Rewrite confusing “counts as one order / not count as one order” copy into a simple two-line explanation with examples. Make it owner-friendly and short.

### Prompt 49/80
Improve About page hero and first section. Pain point: `We built ROAL so your restaurant does not miss orders when the rush hits.` Remove generic company-story filler.

### Prompt 50/80
Rewrite About page sections to be direct: missed calls, live menu, kitchen ticket, fair billing, staff stays focused. Keep fewer sections and less text.

### Prompt 51/80
Redesign footer. Avoid a bulky link farm. Use one strong line, email/demo CTA, only essential links: Pricing, Demo, Blog, Login, Privacy, Terms. Make it elegant on mobile.

### Prompt 52/80
Apply the improved footer consistently across landing, pricing, about, blog, demo, contact, privacy, terms, and security pages.

### Prompt 53/80
Polish public nav mobile menu. It should feel like an app: large tap targets, simple links, clear Login/Sign up, no clutter, no overlapping text.

### Prompt 54/80
Audit public page mobile screenshots mentally/code-wise: hero, pricing, about, blog index, blog article, demo, contact. Fix obvious spacing, overflow, and tiny text.

### Prompt 55/80
Polish public buttons: consistent height, premium hover/active motion, nested icon only where useful, no cheap shadows, no cramped text.

### Prompt 56/80
Polish cards and surfaces: reduce generic border-card look, use subtle background layers and stronger spacing. Keep palette aligned with the current purple/black ROAL theme.

### Prompt 57/80
Improve landing hero copy density: one headline, one short subhead, two CTAs max, one pricing pill. Remove extra claims or long descriptions.

### Prompt 58/80
Improve “How it works” on landing: simple scroll/story flow with short labels: scan menu, ROAL answers, guest orders, ticket hits kitchen. Keep it mobile-friendly.

### Prompt 59/80
Improve landing proof/metrics section: keep trust-building but avoid fake promises. Use `pilot metrics we track` language and shorter labels.

### Prompt 60/80
Improve FAQ styling and copy: shorter questions, concise answers, SEO/AEO still valid. Avoid giant accordion walls on mobile.

### Prompt 61/80
Polish pricing page top section: highlight `Only pay for successful orders` and `$0.90/order` immediately. Remove unnecessary plan complexity.

### Prompt 62/80
Polish pricing page mobile. It should be one clear card plus FAQ, not a dense SaaS pricing table. Primary CTA should be obvious.

### Prompt 63/80
Polish blog index. Keep fewer visible words per card, stronger titles, better mobile spacing, and clear relevance to restaurant missed calls/phone orders.

### Prompt 64/80
Polish blog article template mobile typography: readable body width, better headings, sticky-free reading, clear CTA near bottom. No cheap default article styling.

### Prompt 65/80
Polish demo page: keep video placeholder space, then simple story: ring, ROAL answers, ticket appears. Make it visually strong but not text-heavy.

### Prompt 66/80
Polish contact/book-demo page: make email/demo intent clear, reduce form clutter, mobile-first spacing, strong `Book a demo` CTA.

### Prompt 67/80
Polish login/signup pages to match brand quality. They should feel like the same product, not generic auth templates. Keep auth behavior unchanged.

### Prompt 68/80
Polish dashboard shell typography and nav. It should feel operational and calm. Remove cheap fonts, cramped labels, and unnecessary nav items.

### Prompt 69/80
Polish dashboard restaurant list page for mobile and desktop. CTAs should be `Live orders` and `Menu & agent`. Avoid admin/management wording.

### Prompt 70/80
Polish onboarding page copy and layout to align with the new split: add restaurant, upload menu, connect agent, open live orders. Keep steps short.

### Prompt 71/80
Polish support/settings/billing pages enough to match theme. Do not add features. Just align font, spacing, buttons, mobile layout.

### Prompt 72/80
Reduce text across public pages by trimming repeated paragraphs. Keep only pain, solution, pricing, demo, FAQ, and legal essentials.

### Prompt 73/80
Check color consistency. Keep current ROAL purple/black theme, avoid random yellow/orange/blue sections, and make neutral surfaces feel premium.

### Prompt 74/80
Improve focus states and keyboard accessibility for public and dashboard buttons/links. Keep visible focus rings that match the theme.

### Prompt 75/80
Add/verify loading and empty states for KDS and menu setup. They should look designed, not default spinners or blank panels.

### Prompt 76/80
Run lint. Fix UI/refactor warnings or errors introduced by these prompts. Do not chase unrelated old warnings unless trivial.

### Prompt 77/80
Run focused unit tests for changed public/dashboard pages. Fix regressions introduced by UI changes.

### Prompt 78/80
Run build if feasible. Fix build/type errors. Stop any server or watcher before finishing.

### Prompt 79/80
Update `docs/KDS_REFOCUS_PLAN.md` and `docs/FINAL_LAUNCH_READINESS.md` with UI pass summary, mobile status, tests run, and remaining issues.

### Prompt 80/80
Final review only: summarize changed files, confirm KDS is orders-only, menu setup owns photo/menu/agent, public pages have improved font/copy/footer/mobile. Do not commit or push unless explicitly asked.
