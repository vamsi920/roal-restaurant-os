# Feature Flow QA - 60 Cursor Prompts

Use these in a new Cursor Agent for `/Users/vamsi/Desktop/restaurant-agent`.

Global rules for every prompt:
- This is a QA and bug-fix queue, not a redesign queue.
- Use repo tools, terminal, browser automation, Supabase MCP, and any available Cursor MCPs/skills.
- You may inspect `.env`, `.env.local`, `.env.example`, copy env keys between local env files if required, and update env names only when clearly wrong. Do not print secret values.
- If Supabase SQL, migrations, Edge Function deployment, secrets, or Realtime publication changes are required, do them through Supabase MCP/CLI yourself and document exactly what changed.
- Do not ask the user to run SQL, migrations, env copies, or test commands unless an external account permission truly blocks you.
- Keep existing behavior that works. Make minimal targeted fixes only when a tested flow fails.
- Append each result to `docs/FLOW_QA_REPORT.md` with status: pass, fixed, blocked, or needs human account action.

## 01. Build the live flow inventory
Map every user-facing and system flow in this repo from routes, API routes, libs, scripts, Supabase migrations, and Edge Functions. Create or refresh `docs/FLOW_QA_REPORT.md` with a checklist covering public pages, auth, onboarding, restaurant admin, menu scan/import/edit, KDS orders, ElevenLabs, billing, notifications, analytics, admin, security, deployment, and tests. Do not modify product code in this prompt.

## 02. Audit env loading safely
Inspect `.env`, `.env.local`, `.env.example`, `lib/env.*`, and package scripts. Confirm required env names for Supabase, service role, Gemini, ElevenLabs, agent tools, app URL, and Stripe. Fix only obvious env name mismatches or missing example entries. Do not reveal secret values. Record missing or conflicting envs in `docs/FLOW_QA_REPORT.md`.

## 03. Verify Supabase MCP access and project identity
Use Supabase MCP to identify the active project, project ref, API URL, migration state, and connection health. Compare it with local `NEXT_PUBLIC_SUPABASE_URL` without printing keys. If Cursor sees multiple projects, pick the one matching env and document it. Do not change schema yet.

## 04. Verify migrations 001-024 are applied
Use Supabase MCP/CLI to compare local migrations with remote migration history and key table existence. If migrations are pending, apply them yourself through the proper Supabase workflow, then rerun verification. Record exact migration numbers and any fixes in `docs/FLOW_QA_REPORT.md`.

## 05. Verify Edge Function deployment configuration
Check deployed Supabase Edge Functions `get-menu`, `sync-draft-order`, and `finalize-order`. Confirm `verify_jwt=false`, current code version if available, required secrets, and public invocation requirements. Deploy/redeploy only if local code is newer or config is wrong. Record status.

## 06. Run the local baseline gates
Run install only if needed, then run `npm run lint`, `npm test`, and `npm run build`. If a gate fails, make the smallest fix and rerun the failed gate. Update `docs/FLOW_QA_REPORT.md` with commands and final result.

## 07. Smoke public routes
Start the app locally if needed and browser-test `/`, `/pricing`, `/blog`, `/about`, `/demo`, `/contact`, `/security`, `/privacy`, `/terms`, `/login`, and `/signup`. Check for runtime errors, broken navigation, hydration issues, missing assets, and bad status codes. Fix only bugs.

## 08. Test unauthenticated dashboard protection
Browser-test `/dashboard`, `/dashboard/restaurants`, `/dashboard/onboarding`, `/dashboard/analytics`, `/dashboard/billing`, `/dashboard/admin`, and settings routes while signed out. Confirm redirects and `next` parameters are correct. Fix middleware/auth redirect bugs only.

## 09. Test login and signup rendering
Run the existing auth smoke script and browser-test login/signup forms with fake safe credentials only. Confirm validation, loading, Supabase errors, redirect handling, accessibility alerts, and no leaked secrets. Fix only broken auth UI or route behavior.

## 10. Test auth callback and signout routes
Review and test `/auth/callback` and `/auth/signout` behavior with safe local requests and mocked/real Supabase session where possible. Confirm open-redirect protection and cookie handling. Add or adjust tests if a bug is found.

## 11. Test authenticated context API
Test `GET /api/auth/context` for signed-out and signed-in states. Confirm JSON shape, membership serialization, role flags, and no sensitive fields. Use existing tests or add targeted tests if coverage is missing.

## 12. Test organization bootstrap and membership RLS
Use Supabase MCP to verify profile creation, organization creation, owner membership bootstrap, and migration `024` membership bootstrap RLS. If insert/select/update policies block legitimate onboarding, fix SQL through a migration and apply it yourself.

## 13. Test role separation
Create or identify safe test users/rows via Supabase MCP. Verify owner/admin/member behavior for restaurants, settings, notifications, admin-only views, and destructive/admin actions. Fix role checks that are too open or too strict.

## 14. Test dashboard shell navigation
Browser-test the authenticated dashboard shell, nav active states, responsive layout, support links, and empty states. Fix broken links, wrong active states, or crashes only.

## 15. Test restaurant list and create API
Test `/dashboard/restaurants` and `POST /api/restaurants` with valid and invalid payloads. Confirm org scoping, plan gate behavior, RLS, errors, and successful creation. Add/fix integration tests if needed.

## 16. Test onboarding wizard end-to-end
Run through onboarding: account step, restaurant creation, profile, hours, menu import/setup, and voice-agent connect entry point. Confirm saved state resumes correctly and redirects are sane. Fix only broken steps or bad persistence.

## 17. Test restaurant profile settings
Test profile form save, validation, phone/address fields, ordering config, taxes/fees if present, and server action errors. Verify data lands in Supabase and reloads on page refresh. Fix schema/action bugs only.

## 18. Test restaurant hours settings
Test normal hours, closed days, invalid ranges, timezone handling, and persistence. Verify hours are used by voice/menu/order flows where expected. Fix validation or save/reload bugs only.

## 19. Test menu scanner extract flow
Test `/api/scanner/extract` and scanner UI with a safe sample image/file or fixture. Confirm Gemini env handling, validation, output shape, upload UX, error UX, and no permanent DB writes before commit. Fix scanner failures.

## 20. Test menu scanner process legacy flow
Test `/api/scanner/process` if still used by the UI or scripts. Confirm it either works correctly or is safely deprecated with no broken callers. Remove dead caller assumptions only if tests prove they are wrong.

## 21. Test menu import review and commit
Test scanner review, `POST /api/scanner/commit`, menu import audit rows, category/item/modifier persistence, and usage event recording. Confirm duplicate/invalid items are handled. Fix commit bugs and rerun.

## 22. Test menu import discard/history
Test `POST /api/scanner/discard` and `/api/restaurants/[id]/menu-imports`. Confirm discard status, audit history, tenant scoping, and UI refresh. Fix if stale imports or cross-tenant leaks appear.

## 23. Test menu editor CRUD
Test `/dashboard/restaurants/[id]/menu`: categories, items, prices, descriptions, availability, sorting, and deletes. Verify `/api/restaurants/[id]/menu` returns the saved live menu. Fix CRUD, validation, or cache bugs.

## 24. Test modifier groups deeply
Test modifier group create/edit/delete, required/optional rules, min/max, price deltas, ordering, and item linkage. Confirm order total calculations see modifiers. Fix persistence or validation bugs.

## 25. Test live menu sidebar and refresh
Test `LiveMenuSidebar` on the restaurant dashboard. Confirm it reads latest menu, handles empty menus, unavailable items, Realtime/poll refresh, and mobile layout. Fix only broken live-menu behavior.

## 26. Test order total calculation API
Test `POST /api/restaurants/[id]/orders/compute-totals` with valid items, modifiers, unknown items, unavailable items, quantities, taxes/fees, and empty carts. Confirm errors are useful and totals match menu pricing. Fix bugs.

## 27. Test draft order API lifecycle
Test `/api/restaurants/[id]/orders` and `/api/restaurants/[id]/orders/[orderId]` for list, patch, status changes, invalid transitions, tenant scoping, and status timestamps. Fix order lifecycle bugs and rerun relevant tests.

## 28. Test KDS live orders panel
Browser-test live orders on a restaurant dashboard. Create draft and receipt rows through safe APIs or Supabase MCP. Confirm tabs, cards, detail modal, status buttons, polling fallback, and Realtime subscription behavior. Fix UI or data bugs.

## 29. Direct-test `get-menu` Edge Function
Using Supabase MCP/CLI/curl with safe headers from env, invoke deployed `get-menu` for a real restaurant with menu data. Confirm it works with baked `x-roal-restaurant-id`, optional body/query restaurant id, anon `apikey`, and signed/legacy auth. This is priority for the phone-call menu issue. Fix and redeploy if it fails.

## 30. Direct-test `sync-draft-order` Edge Function
Invoke deployed `sync-draft-order` with a safe test session and cart. Confirm row upsert, idempotency header behavior, status mapping, customer fields, restaurant scoping, and KDS visibility. Fix and redeploy if needed.

## 31. Direct-test `finalize-order` Edge Function
Invoke deployed `finalize-order` after a synced draft and with direct items. Confirm receipt row, draft status, usage event, idempotency, required name/phone validation, and KDS completed/canceled view. Fix and redeploy if needed.

## 32. Test agent tool auth and token scope
Test `lib/agent-tools/*` and Edge shared auth paths for signed `roal1` tokens, legacy secret fallback, wrong restaurant id, expired/bad token, missing `apikey`, and missing `x-roal-restaurant-id`. Fix only auth logic defects.

## 33. Test ElevenLabs API reachability
Using env safely, call the repo ElevenLabs client or route to confirm API key validity and default agent id. Do not print the API key. If env is misplaced between `.env` and `.env.local`, fix local env loading/copying. Record pass/block.

## 34. Test ElevenLabs agent fetch route
Test `GET /api/integrations/elevenlabs/agent` with and without `agent_id`. Confirm helpful errors when env is missing, successful agent summary when valid, and no secret leakage. Fix route errors.

## 35. Test ElevenLabs tool sync route
Test `POST /api/integrations/elevenlabs/sync-roal-tools` for a real restaurant. Confirm it creates/updates exactly `get_menu_items`, `sync_draft_order`, and `finalize_order`, attaches IDs to the agent, and bakes restaurant headers. Fix sync bugs.

## 36. Inspect actual ElevenLabs tool configuration
Use ElevenLabs API through repo scripts/routes to read the agent after sync. Confirm tool URLs point to the same Supabase project, include correct `apikey`, auth header, `x-roal-restaurant-id`, schemas, and no stale dynamic restaurant variables for phone calls. Fix and resync if wrong.

## 37. Test conversation-init webhook
Test `/api/integrations/elevenlabs/conversation-init` with agent id/call payload variations and optional secret. Confirm it finds the restaurant by `restaurant_profiles.elevenlabs_agent_id` and returns dynamic variables. Fix if phone personalization cannot initialize restaurant context.

## 38. Root-cause the live call menu failure
Focus only on the reported phone-call menu issue. Compare the active ElevenLabs agent tool config, deployed `get-menu` behavior, restaurant menu rows, env project refs, auth headers, and webhook logs. Fix the first proven failing link, resync/redeploy, then retest `get_menu_items` exactly as ElevenLabs calls it.

## 39. Test voice agent dashboard connect action
Browser-test the restaurant `VoiceAgentPanel` connect/sync button. Confirm loading states, env error display, Supabase profile updates, agent id persistence, and success messages. Fix action/UI bugs only.

## 40. Test voice agent local harness
Run the voice agent test harness scenarios for menu lookup, unavailable item, modifier choice, draft sync, finalize, handoff, and missing name/phone. Fix harness or production logic if it reveals real flow bugs.

## 41. Test agent prompt and knowledge/menu snapshot
Review generated ElevenLabs prompt, first message, placeholders, phone personalization, and optional knowledge base/menu snapshot. Confirm the agent is instructed to call menu first, sync every cart change, and never invent customer info. Fix prompt generation defects.

## 42. Test phone personalization and Twilio assumptions
Verify documentation and code for Twilio/ElevenLabs phone calls: personalization webhook URL, `NEXT_PUBLIC_APP_URL`, secret, first message without unresolved `{{restaurant_name}}`, and baked tools. Fix code/docs if setup is incomplete or misleading.

## 43. Test billing gate behavior
Test `GET /api/billing/gates`, `lib/billing/*`, plan limits, missing Stripe env behavior, and restaurant creation gating. Confirm billing blocks are clear but do not break normal dev/test onboarding. Fix gate bugs.

## 44. Test usage event recording
Verify usage events for menu scans, voice orders, completed orders, and billing/analytics. Use unit tests plus Supabase MCP rows from Edge Function tests. Fix missing or wrong usage records.

## 45. Test billing dashboard
Browser-test `/dashboard/billing` with empty, configured, and missing Stripe states. Confirm success-order pricing copy does not imply working Stripe automation unless implemented. Fix crashes and misleading states.

## 46. Test notification settings
Test `/dashboard/settings/notifications`, notification setting saves, admin/member edit permissions, redaction, delivery log, provider config, and error states. Fix broken notification settings.

## 47. Test notification event API and stuck orders
Test `POST /api/notifications/events` and `/api/notifications/check-stuck` with valid/invalid orgs, restaurants, event types, and auth states. Confirm delivery rows and no cross-tenant data. Fix bugs.

## 48. Test analytics dashboard
Browser-test `/dashboard/analytics` and `lib/analytics/*` with seeded usage/orders/receipts. Confirm date ranges, conversion, revenue, prep time, scan counts, and empty states. Fix aggregation or display bugs.

## 49. Test admin ops dashboard
Test `/dashboard/admin` with owner/admin/member/no membership. Confirm role gate, health summary, sanitized errors, audit info, and no secret leakage. Fix access or sanitization bugs.

## 50. Test support and settings pages
Browser-test `/dashboard/settings` and `/dashboard/support` from authenticated states. Confirm links, empty states, org membership handling, and no dead routes. Fix broken navigation or crashes.

## 51. Run tenant isolation negative tests
Use Supabase MCP and API requests to prove one org cannot read/update another org restaurant, menu, orders, notifications, analytics, or billing rows. If RLS or route checks leak data, fix with migration/route changes and verify.

## 52. Run API auth negative tests
For every API route under `/api`, test signed-out, wrong method, invalid JSON, invalid restaurant id, and wrong org where applicable. Add missing method/status handling or tests for bugs found.

## 53. Verify Realtime setup
Use Supabase MCP to confirm `draft_orders` and `phone_order_receipts` are in the Realtime publication. Browser-test websocket success and polling fallback. Fix publication or client fallback issues.

## 54. Verify observability and health
Test `/api/health`, request id headers, logger redaction, route errors, and public sanitized health output. Confirm Edge/Supabase/ElevenLabs statuses are useful and safe. Fix observability bugs.

## 55. Verify production deploy scripts
Dry-run or safely inspect `scripts/deploy-production.sh`, `scripts/deploy-edge-functions.sh`, `scripts/smoke-test-production.sh`, and deployment docs. Confirm they match current app requirements and do not expose secrets. Fix stale commands.

## 56. Add missing focused tests
After prompts 1-55, identify top uncovered risky flows. Add the smallest Vitest or script-based tests for those flows, prioritizing auth, RLS helpers, Edge request schemas, ElevenLabs sync config, menu issue regression, and order lifecycle.

## 57. Create a Playwright E2E smoke path
Add or update a lightweight Playwright/manual script that covers login/signup render, protected redirect, authenticated dashboard, restaurant page, menu scanner mock path, KDS order display, and voice harness UI. Keep it runnable locally without real paid API calls unless env exists.

## 58. Run full regression after fixes
Run `npm run lint`, `npm test`, `npm run build`, and any new smoke/E2E scripts. Fix failures caused by this QA pass. Update `docs/FLOW_QA_REPORT.md` with final command results.

## 59. Produce launch blocker list
Review `docs/FLOW_QA_REPORT.md` and create a short `docs/LAUNCH_BLOCKERS.md` with only real blockers, owner, severity, reproduction, and fix status. Do not list vague wishlist items. Fix any blocker that is small and safe.

## 60. Final end-to-end certification pass
Do one final pass over auth, onboarding, menu, KDS, ElevenLabs phone tools, billing gates, notifications, analytics, admin, and deployment readiness. Ensure `docs/FLOW_QA_REPORT.md` is complete, `docs/LAUNCH_BLOCKERS.md` is current, and all code changes are minimal, tested, and summarized.
