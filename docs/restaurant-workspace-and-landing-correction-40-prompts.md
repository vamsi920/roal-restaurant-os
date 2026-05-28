# Restaurant Workspace And Landing Correction - 40 Sequential Prompts

Run these prompts in order in Cursor Auto mode. Work only in `/Users/vamsi/Desktop/restaurant-agent`. Use sequential mode only; do not start Multitasking. Preserve working authentication, tenant isolation, Supabase realtime order behavior, ElevenLabs integration, menu import, billing, and analytics. Authenticated product screens must show real persisted/runtime data only; never insert sample restaurants, orders, calls, revenue, or status. Do not print secrets. If a server or watcher is started for verification, stop it before completing the prompt.

## Product Workspace

### Prompt 01
Audit the authenticated product UX only: `/dashboard`, restaurants routes, menu setup, live orders/KDS, live agent components, analytics and billing links. Write `docs/RESTAURANT_WORKSPACE_UI_CORRECTION.md` listing current routes, real data sources, duplicate/misplaced UI, and the minimal route/layout changes required. Make no product code edits in this prompt.

### Prompt 02
Make the post-login landing route show the real restaurant/location list as the primary experience. Reuse the existing Supabase-backed list/loading/error/empty state; remove generic overview shortcut cards or redirect `/dashboard` cleanly to `/dashboard/restaurants`. Do not generate placeholder restaurants or metrics.

### Prompt 03
Refine the restaurant list page for an owner: short heading, one add-location action, concise real cards, and one clear action to open a location workspace. Remove competing menu/order buttons from each card if they make selection confusing. Keep realtime list updates and empty/error behavior.

### Prompt 04
Create a reusable restaurant-specific workspace navigation model for a selected location. It must carry the current restaurant id and expose only `Orders`, `Menu`, `Live Agent`, `Analytics`, and `Billing` where routes/data actually exist. Keep global navigation focused on Locations and Account/Settings.

### Prompt 05
Apply the selected-location navigation as a restrained left rail on desktop inside restaurant pages. It must show the restaurant name, active state, and a back-to-locations action. Do not introduce staff management, admin operations, or fake counters.

### Prompt 06
Make the restaurant workspace navigation mobile-ready: compact sticky header plus an app-like horizontally scrollable or bottom navigation control for the same five destinations. Keep tap targets accessible and ensure it does not cover content.

### Prompt 07
Add or finalize a dedicated restaurant-specific Live Agent route, preferably `/dashboard/restaurants/[id]/agent`, using existing access checks and real `VoiceAgentPanel` data-loading logic. Do not duplicate service logic or relax tenant authorization.

### Prompt 08
Remove the full `VoiceAgentPanel` and agent test/control-center content from the Menu page flow once the dedicated Live Agent route exists. The Menu page must focus on photo import, menu build/update and manual menu review, with one simple link to Live Agent.

### Prompt 09
Restructure the Menu page into a calm two-purpose screen: upload/import menu and see/edit the live menu it creates. Retain actual import history where useful, but collapse secondary configuration and remove long instructional setup storytelling.

### Prompt 10
Preserve and surface the real call-to-menu update behavior on the Menu page: if existing runtime data indicates an active call or syncing update, show a compact live status indicator. Never display an active/syncing badge from timers, static copy, or invented data.

### Prompt 11
Audit `VoiceAgentPanel` and related Live Agent UI for developer-facing explanations, environment details, placeholder/status text and oversized panels. Record which controls are truly needed by a restaurant owner and which technical diagnostics should be moved into a collapsed advanced area.

### Prompt 12
Redesign the dedicated Live Agent page first viewport as a compact owner-facing control center: location name, phone agent readiness, linked number/agent status when real, menu-sync status when real, and a single clear primary action. Keep all values from current backend snapshots/actions.

### Prompt 13
Compact `VoiceAgentPanel`: remove verbose paragraphs and large nested panels from the default view. Place webhook/tool URLs, environment checklist, identifiers and troubleshooting under a clearly labeled expandable advanced section, without removing required functionality.

### Prompt 14
Refine Live Agent actions and state feedback: concise labels, disabled/loading/success/error states, and a clear next action. Preserve ElevenLabs connect and resync server actions exactly; do not fake a successful connection or expose secrets.

### Prompt 15
If a test-call harness exists, present it on the Live Agent page only as a compact optional testing area below setup status. Keep real tool behavior; remove developer-only wording and any synthetic results presented as calls.

### Prompt 16
Simplify the KDS/live orders page to its single job: view and update real incoming phone orders for the selected restaurant in realtime. Remove menu setup, agent configuration, restaurant settings, staff/admin operations, and unnecessary marketing text from this page.

### Prompt 17
Refine KDS hierarchy and density: one compact location header, a trustworthy realtime/degraded indicator sourced from subscription state, simple New/In progress/Done filtering, and readable order cards. Avoid large empty panels or repeated instructions.

### Prompt 18
Polish KDS empty, loading, error and disconnected states for an owner in service: short plain-language status and one relevant recovery action. Do not display example orders or fake live activity.

### Prompt 19
Make restaurant-specific Analytics reachable from the selected-location rail and scope its query to that restaurant with existing auth. Show only stored call/order outcomes and an honest no-data state; remove seed/demo metrics from signed-in surfaces.

### Prompt 20
Make restaurant-specific Billing reachable from the selected-location rail if billing data can be scoped correctly. Keep organization billing truth where appropriate and clearly label scope; remove fabricated savings/revenue/order counts in authenticated screens.

### Prompt 21
Clean the global dashboard shell around the new flow: after login the user selects a restaurant, then operates inside its workspace. Remove redundant generic navigation that conflicts with selected-location navigation, preserving platform-only controls only for authorized platform roles.

### Prompt 22
Run targeted checks for the workspace changes: authenticated navigation routes, tenant access checks, KDS realtime rendering, Menu page real call indicator behavior, and Live Agent real-data states. Fix regressions found without introducing demo records or changing secrets. Stop any server/watch process before finishing.

## Landing Page

### Prompt 23
Audit the current public home components, CSS tokens and background-video component against the reference direction: luminous video backdrop, centered premium glass/white hero surface, sparse navigation, short left-aligned message, generous whitespace, and minimal lower content. Document exactly what will be retained and simplified; do not code yet.

### Prompt 24
Recompose the landing hero layout in the existing theme: keep the working background video, but frame the first viewport as a clean luminous canvas with a refined centered/floating hero surface inspired by the supplied reference. Do not replace the video or add generic decorative clutter.

### Prompt 25
Rewrite only the hero copy for a restaurant owner with no technical vocabulary. Use a sharp headline communicating: ROAL answers phone calls and takes pickup orders in the customer's language. Keep one short supporting sentence and avoid vague `never miss calls` copy by itself.

### Prompt 26
Simplify hero actions: one primary demo/start action and one secondary action only, plus a concise high-visibility pricing signal: `Only pay for completed orders - $0.90 each` if that is the configured marketing price. Keep CTA routes functional.

### Prompt 27
Craft the premium hero panel visual system: restrained frosted surface, precise spacing, soft borders/shadows, strong readable contrast and a balanced video reveal. It should feel sparse and expensive, not card-heavy or template-like.

### Prompt 28
Tune the hero for mobile as an app-quality first screen: no overflow, visible headline/CTA/pricing, clean video framing, legible nav and stable rounded composition on narrow devices. Keep the next section slightly discoverable below the fold.

### Prompt 29
Review the sections below the hero and remove redundant, text-heavy or confusing marketing blocks. Keep only a short product explanation, simple how-it-works story, pricing/value proof, FAQ and final CTA where they help a layman understand and act.

### Prompt 30
Build or refine the simplest possible `How it works` flow using three short beats: provide your menu, connect/forward your phone line, ROAL answers and sends confirmed orders to the kitchen. Use restrained scroll reveal motion and plain language.

### Prompt 31
Refine the landing pricing/value section around the single memorable idea: only pay for successful completed orders. Keep the $0.90 claim consistent with configured public copy, remove complicated comparison tables, and make the CTA obvious.

### Prompt 32
Simplify any proof/metrics content. Never invent customers, orders, revenue or savings. If there is no verified production proof, use product-capability statements or clearly labelled illustrative process facts rather than fake numerical trust signals.

### Prompt 33
Rewrite the FAQ to a concise set of real buyer questions: what calls ROAL answers, how menu setup works, whether customers talk naturally, what counts as a completed order, and how to start. Keep answers short and searchable, not promotional filler.

### Prompt 34
Replace the current footer with a minimal professional footer matching the landing theme: brand, essential links only, contact/demo entry and required legal links when routes exist. Remove link overload and visual heaviness.

### Prompt 35
Polish public typography consistently: select/use the existing premium font configuration correctly, tighten hierarchy and comfortable line lengths, and eliminate cheap-looking oversized text or overlong paragraphs. Preserve accessibility and avoid a theme rewrite.

### Prompt 36
Polish motion and interactions only where valuable: subtle reveal/scroll behavior for the short story, refined button feedback and reduced-motion support. Avoid distracting effects, excessive animation or performance regressions.

## Verification And Integration

### Prompt 37
Review all edited pages for real-data discipline: post-login restaurants, restaurant workspace, KDS, Menu and Live Agent must not show dummy rows, invented counts, sample calls or fake live states. Fix any violation while preserving public explanatory copy.

### Prompt 38
Visually verify the landing page and the authenticated restaurant flow at desktop width using available browser tooling. Check hero video rendering, premium panel layout, navigation, KDS density and Live Agent compact layout. Fix visible defects; stop any dev server after verification.

### Prompt 39
Visually verify the same key screens at mobile widths: landing first viewport, restaurant selection, workspace navigation, KDS order interactions, Menu update view and Live Agent controls. Fix overflow, overlap, tap-target and typography issues; stop any dev server after verification.

### Prompt 40
Run focused lint/type/build/tests appropriate to changed files, fix introduced failures, and update `docs/RESTAURANT_WORKSPACE_UI_CORRECTION.md` with completed changes, verification performed and any honest external blockers. Do not commit or push unless the user explicitly requests it.
