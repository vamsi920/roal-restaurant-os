# ROAL Enterprise Build Prompt Queue

Context for every task: this repo is `/Users/vamsi/Desktop/restaurant-agent`. It is a Next.js 14 App Router + TypeScript + Tailwind + Supabase + Gemini + ElevenLabs POC for a restaurant phone-ordering agent and live KDS. Keep changes production-oriented, incremental, and consistent with the existing code. Do not delete working POC behavior unless replacing it with a tested equivalent. Prefer small, shippable changes. Run relevant lint/build/tests for your task and document follow-up gaps.

## 1. Enterprise Readiness Audit

Inspect the repo and create `docs/ENTERPRISE_READINESS.md`. Document what exists, what is missing, the highest-risk production gaps, and a phased roadmap to sell this to restaurants. Include auth/tenancy, onboarding, billing, menu ops, voice agent reliability, order ops, security, observability, tests, deployment, and landing-page readiness.

## 2. Premium Landing Page Route

Change `/` from redirect-only into a polished public landing page for restaurant owners. Use strong copy around "Launch your restaurant phone agent in 20 minutes" and "Turn missed calls into confirmed pickup orders." Keep `/dashboard/restaurants` working. Make the page responsive, accessible, and visually premium, not generic AI SaaS.

## 3. Landing Page Conversion Sections

Enhance the landing page with concrete conversion sections: problem, 20-minute setup flow, menu scan, AI phone ordering, live KDS, human handoff, security, and pricing teaser. Add clear CTAs to start setup and view demo dashboard. Keep copy concise and restaurant-operator focused.

## 4. Landing Page Visual Polish

Do a design pass on the landing page and global styling. Add high-quality layout rhythm, typography, responsive spacing, real product screenshots/mock panels using app data, and mobile polish. Avoid decorative gradient blobs and generic stock SaaS patterns. Ensure text never overflows on mobile.

## 5. Public Marketing Pages

Add basic public pages/routes for `/pricing`, `/demo`, `/security`, and `/contact`. They can be lightweight but should feel sellable and consistent with the landing page. Include restaurant-specific copy, not placeholders.

## 6. App Shell Information Architecture

Create a production app shell structure for authenticated areas: dashboard, restaurants, onboarding, settings, billing, analytics, support, and admin/ops placeholders. Update navigation so the product feels like a real restaurant operating system while preserving existing dashboard pages.

## 7. Environment Validation

Add a typed environment validation module for required and optional env vars. Use it in server code where practical. Missing keys should produce clear actionable errors instead of broken screens. Update `.env.example` with all current and planned production vars.

## 8. Supabase Tenant Schema

Add migrations for organizations, profiles, memberships, roles, and restaurant ownership. Add `organization_id` to restaurants and any needed foreign keys/indexes. Keep migration compatibility in mind and document any manual backfill needed for existing POC data.

## 9. Production RLS Policies

Replace dev-open RLS assumptions with org-scoped production policies for restaurants, categories, items, modifiers, draft orders, and receipts. Preserve a documented local dev/demo path only if needed. Make policies readable and explain the security model in docs.

## 10. Auth UI And Session Flow

Add Supabase Auth UI flow for sign in, sign up, sign out, and protected dashboard access. Use server-side checks where possible. Unauthenticated users should see marketing pages and be redirected to login for app routes.

## 11. Membership And Role Helpers

Add server/client helpers to resolve the current user, organization, role, and restaurant access. Centralize authorization checks and update existing API routes/server pages to use them. Include admin/member role distinctions.

## 12. Onboarding Data Model

Add onboarding progress storage for organization and restaurant setup. Track steps like account, restaurant profile, menu import, voice agent, test call, and go-live. Include migration/types and helper functions.

## 13. Onboarding Wizard UI

Build a guided onboarding wizard page. It should let a restaurant owner create org/location, add profile details, upload menu, connect voice agent, test, and launch. Each step should be resumable with loading/error states.

## 14. Restaurant Profile Settings

Add profile/settings tables and UI for address, timezone, phone number, cuisine, website, pickup/delivery modes, prep-time estimate, taxes/fees, and escalation contact. Show settings in the restaurant workspace.

## 15. Restaurant Hours And Closures

Add operating hours, holiday closures, special hours, and "temporarily closed" controls. Make the data available to the voice agent prompt/tool sync so the agent can refuse orders when closed.

## 16. Menu Editor Foundation

Create a full menu management page separate from the live sidebar. Support viewing categories/items/modifiers with edit actions and save/cancel states. Preserve existing scanner and live menu components.

## 17. Category And Item Editing

Implement category and item CRUD in the menu editor: names, descriptions, prices, availability, sort order, duplicate detection, and validation. Update Supabase schema/API as needed and keep operations org/restaurant scoped.

## 18. Modifier Group Editing

Implement modifier group editing with required/optional groups, min/max selection, option prices, and validation. Ensure data maps cleanly to current `modifiers` rows or introduce a better schema with migration if needed.

## 19. Menu Import Review Screen

Change scanner flow so Gemini extraction lands in a review screen before database merge. Show extracted categories/items/modifiers, allow corrections, highlight low-confidence/uncertain fields where possible, then commit.

## 20. Menu Upload Storage And Audit

Persist original menu uploads and extraction metadata to Supabase Storage/database for audit. Store who uploaded, when, file metadata, model used, extraction status, and merge result. Add UI to view recent imports.

## 21. Order Status Schema

Upgrade phone order statuses beyond draft/confirmed: new, accepted, in_progress, ready, completed, canceled. Add migration/types and compatibility handling for existing rows.

## 22. KDS Order Controls

Add KDS controls to accept, start, mark ready, complete, and cancel orders. Include timestamps, operator feedback, optimistic UI, realtime updates, and safe error recovery.

## 23. Order Detail And Receipt View

Add an order detail panel/modal with customer info, phone, items, modifiers, notes, status history, totals estimate, and printable receipt. Keep it usable on tablet/mobile kitchen screens.

## 24. Order Totals And Taxes

Add deterministic order total calculation from menu item prices, modifiers, quantities, tax/service settings, and discounts placeholder. Use server-side helpers and display totals in KDS and receipts.

## 25. Voice Agent Control Center

Replace the basic ElevenLabs panel with a production control center: connected agent, sync status, last sync time, tool URLs, profile variables, setup checklist, and actionable env/secret errors.

## 26. Voice Agent Prompt Profile

Improve the ElevenLabs restaurant agent profile prompt using restaurant profile, hours, menu rules, ordering policy, customer info collection, fallback/handoff, and concise restaurant-safe behavior. Keep it synced from code.

## 27. Voice Agent Test Harness

Add a local test harness UI for voice-agent scenarios. Let operators run text-based simulated order flows against menu validation and see expected tool calls/responses without placing real calls.

## 28. Secure Tool Token Design

Harden ElevenLabs Edge tool authentication. Add signed short-lived token or proxy design, request validation, replay/idempotency protection, restaurant ownership checks, and secret rotation docs. Implement the chosen minimal production path.

## 29. Tool Request Validation

Add strict Zod validation for `get-menu`, `sync-draft-order`, and `finalize-order` requests/responses. Return structured agent-friendly errors. Never accept missing restaurant/session/order data silently.

## 30. Deterministic Order Validation

Add server-side validation so the agent cannot finalize unavailable items, invalid modifiers, impossible quantities, stale menu IDs, or missing customer name/phone. Return recovery suggestions for the agent.

## 31. Usage Metering

Add usage event tables/helpers for menu scans, tool calls, voice orders, completed orders, active locations, and import attempts. Record org/restaurant/user/session where available without leaking secrets.

## 32. Billing Abstraction

Add a billing abstraction ready for Stripe but working in dev without Stripe keys. Include plans, trial status, subscription status, feature limits, usage limits, and UI placeholders in `/billing`.

## 33. Plan Gates And Limit Warnings

Use the billing/usage abstraction to show soft warnings and enforce hard limits for scans, active restaurants, and voice orders. Keep dev mode usable. Make upgrade prompts professional, not annoying.

## 34. Analytics Dashboard

Add analytics pages for calls/orders over time, conversion from draft to completed, popular items, average prep time, canceled orders, menu scan success, and revenue estimate. Use current data where possible and event data where needed.

## 35. Notifications Architecture

Add notification settings and a provider abstraction for email/SMS/webhooks. Implement a dev console provider first. Events: new completed order, sync failure, scan failure, order stuck, realtime degraded.

## 36. Observability And Health

Add structured logging helpers, request IDs, audit logs, and `/api/health`. Health should check env config, Supabase connectivity, Gemini key presence, ElevenLabs key presence, and Edge tool URLs where safe.

## 37. Admin Ops Page

Add an internal admin/ops page for support staff: organizations, restaurants, recent errors, usage, sync status, and health. Gate access by role. Do not expose secrets.

## 38. Test Infrastructure

Add a practical test setup for this Next/Supabase codebase. Include unit tests for schemas/helpers/order validation and integration-style tests for API route validation. Add scripts to `package.json` and document usage.

## 39. Deployment Hardening

Prepare production deployment docs/scripts: Supabase migrations, Edge Function deploy, env var checklist, build command, hosting notes, realtime configuration, secret rotation, and smoke-test checklist.

## 40. Final Product QA And Polish

Run a full QA/polish pass across landing, marketing pages, onboarding, dashboard, settings, menu editor, scanner, KDS, voice control center, billing, analytics, and mobile. Fix accessibility, responsive layout, empty/loading/error states, broken links, lint/build/test failures, and update `docs/ENTERPRISE_READINESS.md` with remaining gaps.
