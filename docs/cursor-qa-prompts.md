# Cursor QA Prompt Queue

Use these in the existing `restaurant-agent` Cursor agent thread. Keep fixes tiny. If a test fails, fix only that feature and rerun the smallest relevant check. Use the authenticated Supabase MCP in Cursor for remote database checks and SQL/migration verification.

## 1. Baseline Local QA

Run `npm run lint`, `npm test -- --run`, and `npm run build`. If any fail, fix the smallest root cause only. Summarize exact commands and results.

## 2. Supabase MCP Migration Audit

Use the authenticated Supabase MCP. Compare remote project schema/migration history with local `supabase/migrations/001` through `023`. Identify unapplied migrations, duplicate/empty migrations, and risky SQL. Do not push yet; report exact pending migration IDs.

## 3. Supabase MCP Migration Push

Use the authenticated Supabase MCP to apply pending local migrations `008` through `023` to the linked Supabase project only if the audit is clean. After applying, verify tables, enums, policies, and realtime/publication changes exist. Report any manual dashboard action needed.

## 4. Supabase Edge Function Deploy Check

Use Supabase MCP/CLI context to verify `get-menu`, `sync-draft-order`, and `finalize-order` Edge Functions match local code. If migrations are applied, deploy these functions with no JWT verification. Verify Edge secrets needed: `AGENT_TOOL_SIGNING_SECRET` and optional `AGENT_TOOL_SECRET`.

## 5. Landing Page QA

Review `/`, `/pricing`, `/demo`, `/security`, `/contact`. Check responsive layout, copy quality, links, CTAs, metadata, accessibility basics, and no text overflow. Fix only landing/marketing issues.

## 6. Auth Flow QA

Test `/login`, `/signup`, `/auth/callback`, `/auth/signout`, and protected `/dashboard/*` redirects. Verify Supabase Auth helpers, middleware, cookies, and anonymous access rules. Fix minimal auth bugs.

## 7. Tenant And RLS QA

Use Supabase MCP to inspect orgs, memberships, restaurant `organization_id`, and RLS policies. Verify anon cannot write tenant data and authenticated org members can access only their org. Fix SQL/app mismatch if found.

## 8. Dashboard Shell QA

Review dashboard navigation, placeholder pages, mobile layout, active links, and protected route behavior. Verify `/dashboard`, `/dashboard/restaurants`, settings, support, billing, analytics, admin routes render without crashes.

## 9. Onboarding QA

Test `/dashboard/onboarding`: step state, server actions, org/location creation, resume behavior, validation, loading/error states. Verify DB tables match UI expectations. Fix only onboarding defects.

## 10. Restaurant Create/List QA

Test restaurant creation and listing with org scope. Verify `CreateRestaurantButton`, `/api/restaurants`, realtime/list refresh, empty/error states, and redirects. Fix minimal issues.

## 11. Restaurant Profile Settings QA

Test profile settings UI/actions for address, phone, timezone, cuisine, pickup/delivery, prep time, fees/tax, escalation contact. Verify DB persistence and validation. Fix minimal issues.

## 12. Restaurant Hours QA

Test weekly hours, exceptions, holiday closures, and temporary closed state. Verify voice-agent prompt/settings can read hours. Use Supabase MCP to confirm tables and policies. Fix minimal issues.

## 13. Menu Scanner Extract QA

Test scanner extract flow without committing. Verify file validation, size/type errors, Gemini errors, `menu_imports` audit row, preview/review payload, and usage event recording. Fix minimal issues.

## 14. Menu Import Review/Commit QA

Test review edits and commit into menu tables. Verify atomic merge, categories/items/modifiers, upload/audit status, and discard flow. Use Supabase MCP for table validation. Fix minimal issues.

## 15. Menu Editor QA

Test `/dashboard/restaurants/[id]/menu`: category/item CRUD, sort order, availability, duplicate detection, price validation, save/cancel, and mobile layout. Fix minimal issues.

## 16. Modifier Editing QA

Test modifier groups/options: required/optional, min/max, option pricing, validation, persistence, and compatibility with existing `modifiers` data. Fix minimal issues.

## 17. Live Menu Realtime QA

Test `LiveMenuSidebar` after menu edits/imports. Verify realtime updates, flash states, clear menu behavior, polling/fallback if any, and no cross-restaurant leakage. Fix minimal issues.

## 18. KDS Order Lifecycle QA

Test draft/new/accepted/in_progress/ready/completed/canceled transitions. Verify optimistic UI, timestamps, status history, realtime update, and `/api/restaurants/[id]/orders/[orderId]`. Fix minimal issues.

## 19. Order Detail And Receipt QA

Test order modal/detail, customer info, item notes, modifiers, totals, printable receipt, mobile/tablet layout, and completed receipts. Fix minimal issues.

## 20. Order Totals QA

Run unit tests and manual checks for item price, modifier price, quantity, tax/service settings, rounding, missing price, and invalid cart. Fix only order total/validation defects.

## 21. Voice Agent Control Center QA

Test voice control center env warnings, agent connect, sync status, last sync, tool URLs, profile variables, and re-sync actions. Do not expose secrets. Fix minimal issues.

## 22. Voice Prompt/Profile QA

Review generated ElevenLabs prompt/profile for restaurant name, hours, menu rules, order policy, fallback/handoff, and customer info collection. Verify no hallucination-prone instructions. Fix prompt only if needed.

## 23. Voice Test Harness QA

Test text-based voice scenarios: valid order, unavailable item, invalid modifier, closed restaurant, missing customer info, finalize success/failure. Fix harness or validation defects.

## 24. Agent Tool Auth QA

Use Supabase MCP/Edge local reasoning to verify signed `roal1.*` token creation/verification, legacy bearer fallback, restaurant scope, expiry, replay/idempotency, and error messages. Fix minimal auth bugs.

## 25. Edge Tool Schema QA

Review/test `get-menu`, `sync-draft-order`, `finalize-order` schemas and responses. Verify missing restaurant/session/items return structured agent-friendly errors. Fix minimal issues.

## 26. Usage Metering QA

Verify usage events record scans, tool calls, orders, active locations, and failed attempts with org/restaurant/session context. Ensure no secrets in metadata. Fix minimal issues.

## 27. Billing Gates QA

Test `/dashboard/billing`, plan limits, dev provider, gate API, soft warnings, hard limits, and upgrade messaging. Verify app stays usable without Stripe keys. Fix minimal issues.

## 28. Analytics QA

Test `/dashboard/analytics`: range picker, KPIs, order trend, popular items, conversion, revenue estimates, empty states. Verify calculations from existing data. Fix minimal issues.

## 29. Notifications QA

Test notification settings and delivery log. Trigger dev-console events for completed order, sync failure, scan failure, stuck order, realtime degraded. Verify provider abstraction and no secret leakage. Fix minimal issues.

## 30. Observability/Health QA

Test `/api/health`, request IDs, structured logs, audit logs, route context, and safe env reporting. Verify health does not leak secrets. Fix minimal issues.

## 31. Admin Ops QA

Test `/dashboard/admin`: role gate, org/restaurant summaries, recent errors, usage, sync status, health. Verify non-admin access is blocked. Fix minimal issues.

## 32. Docs/Runbook QA

Review README and docs: AUTH, RLS, TENANT_SCHEMA, ONBOARDING, ELEVENLABS, AGENT_TOOL_SECURITY, DEPLOYMENT, TESTING, ENTERPRISE_READINESS. Remove stale duplicate migration references and update commands/results.

## 33. E2E Smoke Prompt

Create a concise manual smoke checklist covering signup/login, create restaurant, profile/hours, scan/review/commit menu, edit menu, place simulated voice order, move KDS status, analytics/billing/notifications/health.

## 34. Final Regression QA

After all fixes, run `npm run lint`, `npm test -- --run`, `npm run build`. Use Supabase MCP to confirm migrations/functions remote state if available. Update `docs/ENTERPRISE_READINESS.md` with final known gaps.
