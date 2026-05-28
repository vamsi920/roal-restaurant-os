# Responsive UI QA And Refinement - 40 Sequential Prompts

Run these prompts in order in Cursor Auto mode. Work only in `/Users/vamsi/Desktop/restaurant-agent`. Sequential mode only; do not use Cursor Multitasking. Keep changes focused on responsive layout, usability, accessibility, real-data discipline, and visual polish across mobile phone, large phone, tablet/iPad, laptop, and desktop. Do not add new product scope. Do not create fake restaurants, orders, calls, analytics, billing, or customer data in authenticated UI. Preserve authentication, tenant isolation, Supabase realtime, menu import, ElevenLabs, billing, and analytics behavior. If you start a dev server or watcher for verification, stop it before finishing each prompt.

## Foundation

### Prompt 01
Audit every user-facing route and component for responsive risk. Cover public pages (`/`, `/pricing`, `/about`, `/blog`, article pages, `/demo`, `/contact`, legal pages, auth pages) and authenticated pages (`/dashboard`, restaurants list, restaurant orders/KDS, menu, live agent, analytics, billing, onboarding, settings, notifications, support, admin). Write `docs/RESPONSIVE_UI_AUDIT.md` with concrete issues and planned fixes. No product code edits yet.

### Prompt 02
Inspect global layout/CSS foundations: `app/globals.css`, `app/dashboard-theme.css`, `app/landing.css`, `app/landing-home.css`, `app/auth-page.css`, public theme tokens and dashboard shell CSS. Add or refine safe global responsive rules only where low-risk: `overflow-x: clip`, `min-width: 0`, safe-area padding, touch target minimums, focus visibility, reduced-motion handling, and readable type wrapping. Avoid broad visual rewrites.

### Prompt 03
Normalize responsive typography across public and dashboard surfaces. Fix text that becomes too large, too small, cramped, clipped, or line-breaks badly on 320px, 390px, 768px, 1024px, 1440px. Use existing font/theme tokens; do not introduce a new font dependency unless already configured.

### Prompt 04
Add a small responsive QA checklist section to `docs/RESPONSIVE_UI_AUDIT.md`: required viewports, pages to inspect, interactions to test, and pass/fail criteria. This document should guide later prompts and final verification.

## Public Site

### Prompt 05
Make the public navigation responsive and clean on phone, iPad, laptop and desktop. Check `LandingHomeNav`, `LandingNav`, public page shells and footer navigation. Ensure no wrapping collision, tap targets are comfortable, active/focus states are visible, and mobile menus do not trap or cover content incorrectly.

### Prompt 06
Polish the landing hero first viewport across devices. Keep the current background video. Ensure the frosted hero surface, headline, pricing pill and CTAs fit on small phones without overflow, and remain premium with strong spacing on iPad and desktop.

### Prompt 07
Review the landing video background on mobile/tablet/desktop. Preserve the video, but fix aspect ratio, opacity, fallback, performance, overlay readability and reduced-motion behavior so the first section never feels blank, dull, or unreadable.

### Prompt 08
Make landing lower sections responsive: product intro, capability strip, how-it-works flow, pay/pricing value, FAQ, CTA band. Reduce confusing text where necessary, prevent card overflow, and make each section easy for a layman to scan on phone.

### Prompt 09
Refine the `How it works` responsive flow. On mobile it should feel like a simple vertical story; on tablet/desktop it can use richer layout. Keep copy short: menu, phone line, ROAL answers, confirmed orders reach the kitchen.

### Prompt 10
Make public pricing page responsive and simple. Prioritize the core message: only pay for completed/successful orders. Check pricing cards, explainer, FAQ, CTA and checkout/contact actions on phone and iPad.

### Prompt 11
Make About page responsive and sharper. Keep the pain point clear: busy restaurants miss calls and ROAL answers/takes orders. Remove overly long blocks if they hurt mobile scanability. Preserve theme consistency.

### Prompt 12
Make Blog index and Blog article pages responsive. Check cards, featured posts, category filters, article header, article body, FAQ, related posts, CTA blocks, long titles, code/inline links and SEO/AEO sections. No fake dates or fake customers.

### Prompt 13
Make Demo and Contact pages responsive. Ensure the demo video placeholder area, contact/demo CTA, forms or mail links, and success/error states work on phone and tablet without overflow or tiny controls.

### Prompt 14
Make legal pages (`privacy`, `terms`, `security`) responsive and readable. Long content should have comfortable line length, anchor navigation should not overlap sticky nav, and mobile typography should not feel like a wall of text.

### Prompt 15
Make the public footer responsive and professional. Keep only essential links, avoid link overload, ensure columns stack cleanly, and keep legal/contact/demo actions usable on phone.

## Authentication And Entry

### Prompt 16
Audit login, signup and reset-password responsive behavior. Check form fields, error messages, forgot-password flow, confirmation state, aside/value panels, keyboard viewport behavior on mobile, safe-area spacing, and focus management.

### Prompt 17
Refine auth page layouts for mobile comfort. On phones, the form must be first, full-width, with no cramped side panel. On tablet/desktop, the value panel can sit beside the form if it improves clarity. Preserve Supabase auth behavior.

### Prompt 18
Improve auth form states responsively: loading, validation error, URL error, forgot password sent, signup confirmation, disabled states and focus rings. Keep messages short and prevent layout shift.

## Dashboard Shell And Restaurant Selection

### Prompt 19
Audit the dashboard shell on phone/tablet/desktop: sidebar, mobile drawer, sticky header, safe-area padding, scroll behavior, focus trap/inert behavior, account block, sign out, and global navigation. Fix responsive issues without changing auth logic.

### Prompt 20
Polish the restaurants list page for all devices. Cards should be easy to tap on phone, grid should scale well on iPad/desktop, loading skeletons/empty/error states should fit cleanly, and long restaurant names must not break layout.

### Prompt 21
Check selected-restaurant workspace rail/navigation on orders/menu/agent/analytics/billing. Desktop left rail should be compact; mobile navigation should feel app-like, not cramped. Active states, back-to-locations, and long restaurant names must work.

### Prompt 22
Fix safe-area and sticky layout conflicts in authenticated restaurant pages. Mobile headers, bottom rails, modals, drawers and content should not overlap with iOS Safari bars, Android chrome, or each other.

## Restaurant Orders / KDS

### Prompt 23
Audit KDS/live orders responsive behavior on all viewports. Cover realtime indicator, status tabs, order list, order cards, action buttons, empty/loading/error/degraded states, and detail modal. Record issues in the audit doc, then fix only the responsive/layout problems.

### Prompt 24
Make order cards comfortable on phone. Customer line, pickup status, item list, totals, notes, and action buttons should be readable, tappable, and not visually noisy. Preserve real order data and status actions.

### Prompt 25
Make KDS tablet/iPad layout excellent. Use available width for better order scanning without turning the page into a cluttered dashboard. Avoid horizontal scroll except where unavoidable and justified.

### Prompt 26
Make KDS order detail modal or drawer responsive. On phone it should behave like a clean bottom sheet or full-screen panel; on desktop it can stay modal. Ensure close, focus, and status actions work.

## Menu Management

### Prompt 27
Audit Menu page responsiveness: photo upload/import, scanner review, live menu sidebar, manual editor, import history, call/sync indicator, optional sections. Fix crowded layouts and ensure menu building is understandable on phone.

### Prompt 28
Make the menu scanner/upload flow phone-friendly. Upload button, image preview, extraction status, review controls, errors and commit/discard actions should fit and be easy to operate with one thumb.

### Prompt 29
Make live menu preview/editor responsive. Categories, items, modifiers, prices, edit controls and save states should not require awkward horizontal scrolling on phone; on iPad use a clean two-pane layout when possible.

### Prompt 30
Make menu import history and review states responsive. Long filenames, errors, timestamps and action buttons must wrap cleanly. Preserve real import data only.

## Live Agent

### Prompt 31
Audit Live Agent page responsiveness: status header, summary stats, `VoiceAgentPanel`, connect/resync controls, advanced diagnostics, webhook/tool URL sections and test harness. Identify oversized or cramped elements and fix layout only.

### Prompt 32
Make Live Agent first viewport compact and usable on phone. The owner should immediately see agent readiness, menu sync state, and the primary action without a giant panel or developer-heavy copy.

### Prompt 33
Make agent connect/resync controls responsive. Agent ID input, buttons, disabled states, errors, success messages and refresh action should stack cleanly on phone and align cleanly on tablet/desktop.

### Prompt 34
Make advanced Live Agent diagnostics responsive. Tool URLs, environment checklist, copy buttons and long IDs should wrap or scroll inside their own area without breaking the page. Keep these diagnostics collapsed by default if they overwhelm mobile.

### Prompt 35
Make the voice test harness responsive and optional. On mobile it should not dominate the page; scenarios, logs/results and action buttons must be readable and not create fake call data.

## Analytics, Billing, Settings, Support

### Prompt 36
Make Analytics responsive. Stat cards, range picker, chart, popular items, menu scan health and by-location table should work on phone, iPad and desktop. Convert tables to card rows on small screens if needed. Preserve real analytics only.

### Prompt 37
Make Billing responsive. Plan panel, usage meters, checkout/contact actions, pilot notices, entitlement lists and invoices/usage rows should be comfortable on phone and iPad. Preserve billing logic and real usage only.

### Prompt 38
Make onboarding, settings, notifications, support and admin pages responsive. Focus on forms, delivery logs/tables, support cards, admin ops tables and empty/error states. Do not add staff-management scope or fake operational data.

## Verification

### Prompt 39
Run rendered responsive QA for public surfaces with available browser tooling. Test at least 320x700, 390x844, 768x1024, 1024x768 and 1440x900. Check landing, pricing, about, blog index/article, demo/contact/legal, login and signup. Fix visible overflow, overlap, unreadable text, broken nav, or bad touch targets. Stop dev server afterward.

### Prompt 40
Run rendered responsive QA for authenticated surfaces with available browser tooling and existing test/auth setup. Test restaurants list, selected restaurant orders/KDS, menu, live agent, analytics, billing, onboarding/settings/support. Verify no fake authenticated data appears, no horizontal page scroll, controls are tappable, and mobile feels app-like. Update `docs/RESPONSIVE_UI_AUDIT.md` with final pass/fail notes and blockers. Stop dev server afterward.
